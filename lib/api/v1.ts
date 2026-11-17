// Rotas da API pública v1 (só GET). Cada função recebe os parâmetros da URL e a função de consulta, valida tudo,
// consulta os módulos (que só leem views de publico) e devolve a resposta com os metadados obrigatórios:
// natureza da informação, fontes, licenças e aviso sobre a localização. Os arquivos app/api/v1/**/route.ts
// apenas repassam a requisição para cá, com a consulta de produção (lib/banco/leitura.ts).
import type { Consultar } from "../banco/tipos.ts";
import { resumoPublico } from "../modulos/indicadores/resumo.ts";
import { distribuicaoPorCelula, distribuicaoPorMunicipio, malhaMunicipal } from "../modulos/mapa/distribuicao.ts";
import { listarOcorrencias } from "../modulos/ocorrencias/consulta.ts";
import type { FiltroOcorrencias } from "../modulos/ocorrencias/filtro.ts";
import { citarDownloadsPublicados, citarOcorrencias, citarReferencias, listarFontes } from "../modulos/proveniencia/fontes.ts";
import { buscarEspecies, TERMO_MINIMO } from "../modulos/taxonomia/busca.ts";
import { perfilEspecie } from "../modulos/taxonomia/especie.ts";
import {
  codificarCursor, codigoMunicipio, decodificarCursor, ErroNaoEncontrado, ErroParametro, grupo, identificador, inteiro, lerParametros, limite,
} from "./parametros.ts";
import { AVISO_FONTES, AVISO_LOCALIZACAO, metadados, responder, respostaOk } from "./resposta.ts";

const PARAMETROS_FILTRO = ["especie", "grupo", "municipio", "ano_de", "ano_ate", "conjunto"] as const;

function lerFiltro(p: Map<string, string>): FiltroOcorrencias {
  const f: FiltroOcorrencias = {
    especie: identificador(p.get("especie"), "especie"),
    grupo: grupo(p.get("grupo")),
    municipio: codigoMunicipio(p.get("municipio")),
    anoDe: inteiro(p.get("ano_de"), "ano_de", 1000, 2100),
    anoAte: inteiro(p.get("ano_ate"), "ano_ate", 1000, 2100),
    conjunto: identificador(p.get("conjunto"), "conjunto"),
  };
  if (f.anoDe !== undefined && f.anoAte !== undefined && f.anoDe > f.anoAte) throw new ErroParametro("ano_de", "ano_de não pode ser maior que ano_ate");
  return f;
}

const ehCursorEspecie = (v: unknown): v is [string, number] =>
  Array.isArray(v) && v.length === 2 && typeof v[0] === "string" && Number.isSafeInteger(v[1]) && v[1] > 0;
const ehCursorId = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) > 0;

// GET /api/v1/especies?q=&grupo=&limite=&apos=
export const rotaEspecies = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    const p = lerParametros(busca, ["q", "grupo", "limite", "apos"]);
    const termo = p.get("q");
    if (!termo || termo.replace(/\s/g, "").length < TERMO_MINIMO) throw new ErroParametro("q", `q deve ter pelo menos ${TERMO_MINIMO} letras`);
    const tamanho = limite(p.get("limite"), 20, 50);
    const r = await buscarEspecies(consultar, { termo, grupo: grupo(p.get("grupo")), limite: tamanho, apos: decodificarCursor(p.get("apos"), ehCursorEspecie) });
    const fontes = await citarReferencias(consultar, [...new Set(r.especies.map((e) => e.referencia))]);
    return respostaOk({
      dados: { termo: r.termo_normalizado, especies: r.especies },
      paginacao: { limite: tamanho, proximo: r.proximo ? codificarCursor(r.proximo) : null },
      metadados: metadados({
        natureza: ["normalizado", "derivado"],
        descricao: "Busca por prefixo nos nomes científicos, sinônimos e nomes populares da referência taxonômica. Contagem de ocorrências: só as públicas.",
        fontes, licencas: fontes.flatMap((f) => (f.licenca ? [f.licenca] : [])), aviso: AVISO_FONTES,
      }),
    });
  });

// GET /api/v1/especies/{id}
export const rotaEspecie = (id: string, busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    lerParametros(busca, []);
    if (!/^\d{1,10}$/.test(id)) throw new ErroParametro("id", "id deve ser um número inteiro positivo");
    const r = await perfilEspecie(consultar, identificador(id, "id") as number);
    if (!r) throw new ErroNaoEncontrado("espécie não encontrada");
    const fontes = await citarReferencias(consultar, [r.referencia.codigo]);
    return respostaOk({
      dados: r,
      metadados: metadados({
        natureza: ["original", "normalizado", "derivado"],
        descricao: "Nomes, distribuição e perfil como recebidos da referência taxonômica; classificação tratada; contagens derivadas das ocorrências públicas.",
        fontes, licencas: fontes.flatMap((f) => (f.licenca ? [f.licenca] : [])),
        aviso: r.especie.sensivel ? `Espécie sensível: as ocorrências públicas aparecem só por município. ${AVISO_LOCALIZACAO}` : AVISO_LOCALIZACAO,
      }),
    });
  });

// GET /api/v1/ocorrencias?especie=&grupo=&municipio=&ano_de=&ano_ate=&conjunto=&limite=&apos=
export const rotaOcorrencias = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    const p = lerParametros(busca, [...PARAMETROS_FILTRO, "limite", "apos"]);
    const tamanho = limite(p.get("limite"), 50, 100);
    const r = await listarOcorrencias(consultar, { ...lerFiltro(p), limite: tamanho, apos: decodificarCursor(p.get("apos"), ehCursorId) });
    const fontes = await citarOcorrencias(consultar, [...new Set(r.ocorrencias.map((o) => o.lote_id))], [...new Set(r.ocorrencias.map((o) => o.conjunto.id))]);
    return respostaOk({
      dados: { ocorrencias: r.ocorrencias },
      paginacao: { limite: tamanho, proximo: r.proximo ? codificarCursor(r.proximo) : null },
      metadados: metadados({
        natureza: ["normalizado", "derivado"],
        descricao: "Registros de conjuntos de dados aprovados, tratados (nome conciliado, município) e com localização generalizada (derivada).",
        fontes, licencas: r.ocorrencias.map((o) => o.licenca), aviso: AVISO_LOCALIZACAO,
      }),
    });
  });

async function metadadosAgregados(consultar: Consultar, descricao: string, licencas: string[]) {
  return metadados({ natureza: ["derivado"], descricao, fontes: await citarDownloadsPublicados(consultar), licencas, aviso: `${AVISO_LOCALIZACAO} ${AVISO_FONTES}` });
}

// GET /api/v1/distribuicao/celulas?especie=&grupo=&municipio=&ano_de=&ano_ate=&conjunto=
export const rotaCelulas = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    const r = await distribuicaoPorCelula(consultar, lerFiltro(lerParametros(busca, PARAMETROS_FILTRO)));
    return respostaOk({
      dados: { ...r.geojson, registros_so_por_municipio: r.registros_so_por_municipio },
      metadados: await metadadosAgregados(consultar, "Contagem de registros públicos por célula de 0,1°. Registros sensíveis não entram nas células.", r.licencas),
    });
  });

// GET /api/v1/distribuicao/municipios?especie=&grupo=&municipio=&ano_de=&ano_ate=&conjunto=
export const rotaMunicipios = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    const r = await distribuicaoPorMunicipio(consultar, lerFiltro(lerParametros(busca, PARAMETROS_FILTRO)));
    return respostaOk({
      dados: { municipios: r.municipios, registros_sem_municipio: r.registros_sem_municipio },
      metadados: await metadadosAgregados(consultar, "Contagem de registros públicos por município (malha IBGE), inclusive os sensíveis.", r.licencas),
    });
  });

// GET /api/v1/territorio/municipios
export const rotaMalha = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    lerParametros(busca, []);
    const r = await malhaMunicipal(consultar);
    const fontes = r.fontes.map((f) => ({ tipo: "referencia" as const, titulo: f.nome, licenca: f.termos_de_uso, citacao: f.citacao, doi: f.doi, url: f.url }));
    return respostaOk({
      dados: r.geojson,
      metadados: metadados({
        natureza: ["derivado"],
        descricao: "Malha municipal oficial simplificada (tolerância de 0,005°, cerca de 550 m) só para desenho do mapa.",
        fontes, licencas: fontes.flatMap((f) => (f.licenca ? [f.licenca] : [])), aviso: "Geometria simplificada: não usar para medir áreas ou limites.",
      }),
    });
  });

// GET /api/v1/indicadores
export const rotaIndicadores = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    lerParametros(busca, []);
    const r = await resumoPublico(consultar);
    return respostaOk({
      dados: r,
      metadados: await metadadosAgregados(consultar, "Contagens sobre os registros públicos (só conjuntos de dados aprovados).", r.por_licenca.map((l) => l.licenca)),
    });
  });

// GET /api/v1/fontes
export const rotaFontes = (busca: URLSearchParams, consultar: Consultar) =>
  responder(async () => {
    lerParametros(busca, []);
    const r = await listarFontes(consultar);
    return respostaOk({
      dados: r,
      metadados: metadados({
        natureza: ["original"],
        descricao: "Fontes, downloads (com DOI) e conjuntos de dados aprovados para publicação, com publicador, licença e citação. "
          + "As contagens do lote referem-se ao download inteiro; registros_publicos, ao que está publicado.",
        fontes: [], licencas: r.conjuntos.map((c) => c.licenca), aviso: "Cite o conjunto de dados e o download do GBIF ao reutilizar os registros.",
      }),
    });
  });
