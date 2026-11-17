// Impressão digital da estrutura do banco (schemas protegido e publico): colunas, restrições, índices, views,
// funções, RLS e privilégios. A mesma consulta roda no PGlite local e no Supabase, para comparar os dois.
// `consultar(sql)` deve devolver as linhas (array de objetos).

const CONSULTAS = {
  colunas: `select c.table_schema || '.' || c.table_name || '.' || c.column_name as chave,
      c.data_type || coalesce('(' || c.udt_name || ')', '') || case when c.is_nullable = 'NO' then ' not null' else '' end as valor
    from information_schema.columns c where c.table_schema in ('protegido', 'publico')`,
  restricoes: `select n.nspname || '.' || t.relname || '.' || con.conname as chave, pg_get_constraintdef(con.oid) as valor
    from pg_constraint con join pg_class t on t.oid = con.conrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname in ('protegido', 'publico')
      -- NOT NULL vira restrição de catálogo (tipo n) só a partir do PostgreSQL 18; a nulidade é comparada em colunas.
      and con.contype <> 'n'`,
  indices: `select schemaname || '.' || indexname as chave, regexp_replace(indexdef, '\\s+', ' ', 'g') as valor
    from pg_indexes where schemaname in ('protegido', 'publico')`,
  views: `select schemaname || '.' || viewname as chave, regexp_replace(definition, '\\s+', ' ', 'g') as valor
    from pg_views where schemaname in ('protegido', 'publico')`,
  funcoes: `select n.nspname || '.' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as chave,
      pg_get_function_result(p.oid) as valor
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname in ('protegido', 'publico')`,
  gatilhos: `select n.nspname || '.' || c.relname || '.' || t.tgname as chave, pg_get_triggerdef(t.oid) as valor
    from pg_trigger t join pg_class c on c.oid = t.tgrelid join pg_namespace n on n.oid = c.relnamespace
    where not t.tgisinternal and n.nspname in ('protegido', 'publico')`,
  rls: `select n.nspname || '.' || c.relname as chave, c.relrowsecurity::text || '/' || c.relforcerowsecurity::text as valor
    from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'protegido' and c.relkind = 'r'`,
  privilegios: `select p.papel || ' ' || n.nspname || '.' || c.relname as chave,
      concat_ws(',', case when has_table_privilege(p.papel, c.oid, 'SELECT') then 'select' end,
        case when has_table_privilege(p.papel, c.oid, 'INSERT') then 'insert' end,
        case when has_table_privilege(p.papel, c.oid, 'UPDATE') then 'update' end,
        case when has_table_privilege(p.papel, c.oid, 'DELETE') then 'delete' end) as valor
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    cross join (values ('anon'), ('authenticated'), ('bemtevi_leitura')) as p(papel)
    where n.nspname in ('protegido', 'publico') and c.relkind in ('r', 'v')`,
  schemas: `select p.papel || ' ' || s.nspname as chave,
      concat_ws(',', case when has_schema_privilege(p.papel, s.oid, 'USAGE') then 'usage' end,
        case when has_schema_privilege(p.papel, s.oid, 'CREATE') then 'create' end) as valor
    from pg_namespace s cross join (values ('anon'), ('authenticated'), ('bemtevi_leitura')) as p(papel)
    where s.nspname in ('protegido', 'publico')`,
};

export async function estrutura(consultar) {
  // search_path fixo: as definições saem sempre com o schema explícito, nos dois bancos.
  await consultar("set search_path to pg_catalog");
  const resultado = {};
  for (const [nome, sql] of Object.entries(CONSULTAS)) {
    resultado[nome] = Object.fromEntries((await consultar(sql)).map((r) => [r.chave, r.valor]));
  }
  return resultado;
}

// Diferenças entre duas estruturas: { categoria: { so_a: [...], so_b: [...], diferentes: [...] } }.
export function comparar(a, b) {
  const diferencas = {};
  for (const categoria of Object.keys(CONSULTAS)) {
    const x = a[categoria] ?? {};
    const y = b[categoria] ?? {};
    const so_a = Object.keys(x).filter((k) => !(k in y));
    const so_b = Object.keys(y).filter((k) => !(k in x));
    const diferentes = Object.keys(x).filter((k) => k in y && x[k] !== y[k]).map((k) => ({ chave: k, a: x[k], b: y[k] }));
    if (so_a.length || so_b.length || diferentes.length) diferencas[categoria] = { so_a, so_b, diferentes };
  }
  return diferencas;
}

export const contagens = (e) => Object.fromEntries(Object.entries(e).map(([k, v]) => [k, Object.keys(v).length]));
