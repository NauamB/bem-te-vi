// Distribuição geográfica das ocorrências públicas: agregação por célula de 0,1° (só registros não sensíveis)
// e por município (todos, inclusive os sensíveis, que só existem nesse nível). Dado derivado: contagens.
import type { Consultar } from "../../banco/tipos.ts";
import { limitesDaCelula } from "../ocorrencias/consulta.ts";
import { condicoesDoFiltro, onde, type FiltroOcorrencias } from "../ocorrencias/filtro.ts";
import { numero, textoOuNulo } from "../valores.ts";

export async function distribuicaoPorCelula(consultar: Consultar, f: FiltroOcorrencias) {
  const parametros: unknown[] = [];
  const condicoes = condicoesDoFiltro(f, parametros);
  const celulas = await consultar(
    `select o.celula_x10 as x10, o.celula_y10 as y10, count(*)::int as registros, count(distinct o.especie_id)::int as especies
     from publico.ocorrencia_celula o
     ${onde([...condicoes, "o.celula_x10 is not null"])}
     group by 1, 2 order by 1, 2`,
    parametros,
  );
  const [fora] = await consultar(
    `select count(*)::int as n from publico.ocorrencia_celula o ${onde([...condicoes, "o.celula_x10 is null"])}`,
    parametros,
  );
  const licencas = await consultar(`select distinct o.licenca_efetiva as licenca from publico.ocorrencia_celula o ${onde(condicoes)}`, parametros);
  return {
    geojson: {
      type: "FeatureCollection" as const,
      features: celulas.map((c) => {
        const [oeste, sul, leste, norte] = limitesDaCelula(numero(c.x10), numero(c.y10));
        return {
          type: "Feature" as const,
          id: `${numero(c.x10)}_${numero(c.y10)}`,
          geometry: { type: "Polygon" as const, coordinates: [[[oeste, sul], [leste, sul], [leste, norte], [oeste, norte], [oeste, sul]]] },
          properties: { registros: numero(c.registros), especies: numero(c.especies) },
        };
      }),
    },
    // Registros que só aparecem por município (sensíveis ou generalizados na fonte): fora das células.
    registros_so_por_municipio: numero(fora?.n ?? 0),
    licencas: licencas.map((l) => String(l.licenca)),
  };
}

export async function distribuicaoPorMunicipio(consultar: Consultar, f: FiltroOcorrencias) {
  const parametros: unknown[] = [];
  const condicoes = condicoesDoFiltro(f, parametros);
  const linhas = await consultar(
    `select o.municipio_codigo, o.municipio, count(*)::int as registros, count(distinct o.especie_id)::int as especies,
            count(*) filter (where o.protecao = 'municipio')::int as registros_so_por_municipio
     from publico.ocorrencia_celula o
     ${onde(condicoes)}
     group by 1, 2 order by 1`,
    parametros,
  );
  const licencas = await consultar(`select distinct o.licenca_efetiva as licenca from publico.ocorrencia_celula o ${onde(condicoes)}`, parametros);
  const comMunicipio = linhas.filter((l) => l.municipio_codigo !== null);
  const sem = linhas.find((l) => l.municipio_codigo === null);
  return {
    municipios: comMunicipio.map((l) => ({
      codigo: String(l.municipio_codigo), nome: textoOuNulo(l.municipio), registros: numero(l.registros), especies: numero(l.especies),
      registros_so_por_municipio: numero(l.registros_so_por_municipio),
    })),
    registros_sem_municipio: numero(sem?.registros ?? 0),
    licencas: licencas.map((l) => String(l.licenca)),
  };
}

// Malha municipal simplificada (desenho do mapa), com a fonte territorial.
export async function malhaMunicipal(consultar: Consultar) {
  const municipios = await consultar("select codigo_ibge, nome, uf, edicao_malha, geometria from publico.municipio_mapa order by codigo_ibge");
  const fontes = await consultar(
    `select distinct f.codigo, f.nome, f.url, f.termos_de_uso, l.citacao, l.doi, l.versao_fonte
     from publico.fonte f join publico.lote l on l.fonte_codigo = f.codigo where f.papel = 'territorio' order by f.codigo`,
  );
  return {
    geojson: {
      type: "FeatureCollection" as const,
      features: municipios.map((m) => ({
        type: "Feature" as const,
        id: String(m.codigo_ibge),
        geometry: m.geometria as object,
        properties: { codigo: String(m.codigo_ibge), nome: String(m.nome), uf: String(m.uf), edicao_malha: textoOuNulo(m.edicao_malha) },
      })),
    },
    fontes: fontes.map((f) => ({
      codigo: String(f.codigo), nome: String(f.nome), url: textoOuNulo(f.url), termos_de_uso: textoOuNulo(f.termos_de_uso),
      citacao: textoOuNulo(f.citacao), doi: textoOuNulo(f.doi), versao: textoOuNulo(f.versao_fonte),
    })),
  };
}
