// Proveniência: fontes, downloads (lotes) e conjuntos de dados aprovados, para citação e atribuição.
// Só lê views de publico; conjuntos pendentes ou rejeitados não existem em publico.conjunto_dados.
import type { Consultar } from "../../banco/tipos.ts";
import type { FonteCitada } from "../../api/resposta.ts";
import { numero, numeroOuNulo, textoOuNulo } from "../valores.ts";

// Citações dos downloads e dos conjuntos que aparecem num conjunto de registros.
export async function citarOcorrencias(consultar: Consultar, loteIds: number[], conjuntoIds: number[]): Promise<FonteCitada[]> {
  const lotes = loteIds.length
    ? await consultar("select id::int8 as id, descricao, doi, citacao from publico.lote where id = any($1::bigint[]) order by id", [loteIds])
    : [];
  const conjuntos = conjuntoIds.length
    ? await consultar(
        "select id::int8 as id, titulo, publicador, licenca, citacao, doi, url from publico.conjunto_dados where id = any($1::bigint[]) order by titulo, id",
        [conjuntoIds],
      )
    : [];
  return [
    ...lotes.map((l): FonteCitada => ({
      tipo: "download-gbif", titulo: String(l.descricao ?? `Lote ${l.id}`), citacao: textoOuNulo(l.citacao), doi: textoOuNulo(l.doi),
      url: l.doi ? `https://doi.org/${l.doi}` : null,
    })),
    ...conjuntos.map((c): FonteCitada => ({
      tipo: "conjunto-de-dados", titulo: String(c.titulo), publicador: textoOuNulo(c.publicador), licenca: textoOuNulo(c.licenca),
      citacao: textoOuNulo(c.citacao), doi: textoOuNulo(c.doi), url: textoOuNulo(c.url),
    })),
  ];
}

// Fontes de referência (taxonomia, território) pelo código, com os termos de uso declarados.
export async function citarReferencias(consultar: Consultar, codigos: string[]): Promise<FonteCitada[]> {
  if (!codigos.length) return [];
  const fontes = await consultar(
    `select f.codigo, f.nome, f.url, f.termos_de_uso, l.doi, l.citacao
     from publico.fonte f
     left join lateral (select doi, citacao from publico.lote where fonte_codigo = f.codigo order by id desc limit 1) l on true
     where f.codigo = any($1::text[]) order by f.codigo`,
    [codigos],
  );
  return fontes.map((f) => ({
    tipo: "referencia", titulo: String(f.nome), licenca: textoOuNulo(f.termos_de_uso), citacao: textoOuNulo(f.citacao),
    doi: textoOuNulo(f.doi), url: textoOuNulo(f.url),
  }));
}

// Downloads do GBIF com registros publicados (para citar em agregações sem listar todos os conjuntos).
export async function citarDownloadsPublicados(consultar: Consultar): Promise<FonteCitada[]> {
  const lotes = await consultar(
    `select l.id::int8 as id, l.descricao, l.doi, l.citacao from publico.lote l
     where exists (select 1 from publico.ocorrencia_celula o where o.lote_id = l.id) order by l.id`,
  );
  return lotes.map((l) => ({
    tipo: "download-gbif", titulo: String(l.descricao ?? `Lote ${l.id}`), citacao: textoOuNulo(l.citacao), doi: textoOuNulo(l.doi),
    url: l.doi ? `https://doi.org/${l.doi}` : null,
  }));
}

export async function listarFontes(consultar: Consultar) {
  const [conjuntos, fontes, lotes] = [
    await consultar(
      `select c.id::int8 as id, c.chave_externa, c.titulo, c.publicador, c.pais_publicador, c.licenca, c.citacao, c.doi, c.url,
              c.revisado_em::text as revisado_em, coalesce(o.registros, 0)::int as registros_publicos
       from publico.conjunto_dados c
       left join (select conjunto_id, count(*) as registros from publico.ocorrencia_celula group by conjunto_id) o on o.conjunto_id = c.id
       order by c.titulo, c.id`,
    ),
    await consultar("select codigo, nome, papel, url, termos_de_uso, nota_publica from publico.fonte order by codigo"),
    await consultar(
      `select id::int8 as id, fonte_codigo, descricao, doi, citacao, versao_fonte, obtido_em::text as obtido_em, concluido_em::text as concluido_em,
              recebidos, aceitos, rejeitados
       from publico.lote order by id`,
    ),
  ];
  return {
    conjuntos: conjuntos.map((c) => ({
      id: numero(c.id), chave_externa: String(c.chave_externa), titulo: String(c.titulo), publicador: textoOuNulo(c.publicador),
      pais_publicador: textoOuNulo(c.pais_publicador), licenca: String(c.licenca), citacao: textoOuNulo(c.citacao), doi: textoOuNulo(c.doi),
      url: textoOuNulo(c.url), revisado_em: textoOuNulo(c.revisado_em), registros_publicos: numero(c.registros_publicos),
    })),
    fontes: fontes.map((f) => ({
      codigo: String(f.codigo), nome: String(f.nome), papel: String(f.papel), url: textoOuNulo(f.url),
      termos_de_uso: textoOuNulo(f.termos_de_uso), nota_publica: textoOuNulo(f.nota_publica),
    })),
    // Contagens do lote referem-se ao download inteiro (inclusive registros não publicados).
    lotes: lotes.map((l) => ({
      id: numero(l.id), fonte_codigo: String(l.fonte_codigo), descricao: textoOuNulo(l.descricao), doi: textoOuNulo(l.doi),
      citacao: textoOuNulo(l.citacao), versao_fonte: textoOuNulo(l.versao_fonte), obtido_em: textoOuNulo(l.obtido_em),
      concluido_em: textoOuNulo(l.concluido_em), recebidos: numeroOuNulo(l.recebidos), aceitos: numeroOuNulo(l.aceitos),
      rejeitados: numeroOuNulo(l.rejeitados),
    })),
  };
}
