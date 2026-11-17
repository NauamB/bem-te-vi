// Filtro comum das consultas de ocorrências públicas (lista, células e municípios). Só gera condições sobre
// colunas de publico.ocorrencia_celula, sempre com parâmetros ($n), nunca com valores no texto SQL.

export type FiltroOcorrencias = {
  especie?: number;
  grupo?: string;
  municipio?: string;
  anoDe?: number;
  anoAte?: number;
  conjunto?: number;
};

export function condicoesDoFiltro(f: FiltroOcorrencias, parametros: unknown[]): string[] {
  const condicoes: string[] = [];
  const p = (valor: unknown) => {
    parametros.push(valor);
    return `$${parametros.length}`;
  };
  if (f.especie !== undefined) condicoes.push(`o.especie_id = ${p(f.especie)}::bigint`);
  if (f.grupo !== undefined) condicoes.push(`o.grupo = ${p(f.grupo)}`);
  if (f.municipio !== undefined) condicoes.push(`o.municipio_codigo = ${p(f.municipio)}`);
  if (f.anoDe !== undefined) condicoes.push(`o.ano >= ${p(f.anoDe)}::int`);
  if (f.anoAte !== undefined) condicoes.push(`o.ano <= ${p(f.anoAte)}::int`);
  if (f.conjunto !== undefined) condicoes.push(`o.conjunto_id = ${p(f.conjunto)}::bigint`);
  return condicoes;
}

export const onde = (condicoes: string[]) => (condicoes.length ? `where ${condicoes.join(" and ")}` : "");
