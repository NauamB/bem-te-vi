// Indicadores gerais da camada pública: contagens derivadas das ocorrências publicadas (conjuntos aprovados).
import type { Consultar } from "../../banco/tipos.ts";
import { numero, numeroOuNulo } from "../valores.ts";

export async function resumoPublico(consultar: Consultar) {
  const [total] = await consultar(
    `select count(*)::int as registros, count(distinct o.especie_id)::int as especies, count(distinct o.municipio_codigo)::int as municipios,
            count(distinct o.conjunto_id)::int as conjuntos, count(*) filter (where o.protecao = 'municipio')::int as registros_so_por_municipio,
            count(*) filter (where o.especie_id is null)::int as registros_sem_especie, min(o.ano)::int as ano_minimo, max(o.ano)::int as ano_maximo
     from publico.ocorrencia_celula o`,
  );
  const porGrupo = await consultar(
    `select o.grupo, count(*)::int as registros, count(distinct o.especie_id)::int as especies
     from publico.ocorrencia_celula o group by 1 order by 1`,
  );
  const porLicenca = await consultar("select o.licenca_efetiva as licenca, count(*)::int as registros from publico.ocorrencia_celula o group by 1 order by 1");
  return {
    registros: numero(total.registros),
    especies: numero(total.especies),
    municipios: numero(total.municipios),
    conjuntos: numero(total.conjuntos),
    registros_so_por_municipio: numero(total.registros_so_por_municipio),
    registros_sem_especie: numero(total.registros_sem_especie),
    anos: { minimo: numeroOuNulo(total.ano_minimo), maximo: numeroOuNulo(total.ano_maximo) },
    por_grupo: porGrupo.map((g) => ({ grupo: String(g.grupo), registros: numero(g.registros), especies: numero(g.especies) })),
    por_licenca: porLicenca.map((l) => ({ licenca: String(l.licenca), registros: numero(l.registros) })),
  };
}
