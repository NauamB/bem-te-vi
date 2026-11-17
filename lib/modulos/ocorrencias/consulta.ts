// Lista paginada de ocorrências públicas. A localização é só a célula de 0,1° (em inteiros, como na view) ou,
// para registros sensíveis, só o município. Nenhuma coordenada precisa existe nas views lidas aqui.
import type { Consultar } from "../../banco/tipos.ts";
import { lista, numero, numeroOuNulo, textoOuNulo } from "../valores.ts";
import { condicoesDoFiltro, onde, type FiltroOcorrencias } from "./filtro.ts";

// Célula a partir do canto sudoeste em décimos de grau: limites [oeste, sul, leste, norte] em graus.
export const limitesDaCelula = (x10: number, y10: number) => [x10 / 10, y10 / 10, (x10 + 1) / 10, (y10 + 1) / 10];

export async function listarOcorrencias(consultar: Consultar, f: FiltroOcorrencias & { limite: number; apos?: number }) {
  const parametros: unknown[] = [];
  const condicoes = condicoesDoFiltro(f, parametros);
  if (f.apos !== undefined) {
    parametros.push(f.apos);
    condicoes.push(`o.id > $${parametros.length}::bigint`);
  }
  parametros.push(f.limite + 1);
  const linhas = await consultar(
    `select o.id::int8 as id, o.especie_id::int8 as especie_id, o.especie, o.familia, o.nome_recebido, o.conciliacao, o.grupo, o.ano,
            o.data_evento::text as data_evento, o.municipio_codigo, o.municipio, o.protecao, o.celula_x10, o.celula_y10,
            o.incerteza_m::float8 as incerteza_m, o.base_do_registro, o.alertas, o.licenca_efetiva, o.conjunto_id::int8 as conjunto_id,
            o.conjunto, o.publicador, o.lote_id::int8 as lote_id, o.url_origem
     from publico.ocorrencia_celula o
     ${onde(condicoes)}
     order by o.id
     limit $${parametros.length}`,
    parametros,
  );
  const pagina = linhas.slice(0, f.limite).map((o) => {
    const x10 = numeroOuNulo(o.celula_x10);
    const y10 = numeroOuNulo(o.celula_y10);
    return {
      id: numero(o.id),
      especie: o.especie_id === null ? null : { id: numero(o.especie_id), nome: String(o.especie), familia: textoOuNulo(o.familia) },
      nome_recebido: String(o.nome_recebido),
      conciliacao: String(o.conciliacao),
      grupo: String(o.grupo),
      ano: numeroOuNulo(o.ano),
      data_evento: textoOuNulo(o.data_evento),
      municipio: o.municipio_codigo === null ? null : { codigo: String(o.municipio_codigo), nome: textoOuNulo(o.municipio) },
      protecao: String(o.protecao) as "celula_0_1_grau" | "municipio",
      celula: x10 === null || y10 === null ? null : { id: `${x10}_${y10}`, limites: limitesDaCelula(x10, y10) },
      incerteza_m: numeroOuNulo(o.incerteza_m),
      base_do_registro: textoOuNulo(o.base_do_registro),
      alertas: lista(o.alertas),
      licenca: String(o.licenca_efetiva),
      conjunto: { id: numero(o.conjunto_id), titulo: String(o.conjunto), publicador: textoOuNulo(o.publicador) },
      lote_id: numero(o.lote_id),
      url_origem: textoOuNulo(o.url_origem),
    };
  });
  const ultimo = pagina.at(-1);
  return { ocorrencias: pagina, proximo: linhas.length > f.limite && ultimo ? ultimo.id : null };
}
