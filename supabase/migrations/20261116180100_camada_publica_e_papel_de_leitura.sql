-- Bem-te-vi — Fase 11.1: camada pública e papel de leitura (ADR-0001, seções 6, 7 e 10).
--
-- Regras desta camada:
--   1. Nenhuma view expõe coordenada precisa (nem geometria de ponto, nem latitude/longitude, nem texto verbatim
--      de localidade ou coordenada).
--   2. Generalização CONSERVADORA para todas as ocorrências, enquanto a política de proteção não for validada:
--      a ocorrência aparece como a célula de 0,1° (≈ 11 km) que a contém.
--   3. Espécie sensível (lista de referência) ou registro já generalizado/retido na fonte: sem geometria,
--      só o município, e sem link para o registro individual de origem.
--   4. Só entram ocorrências de conjuntos de dados cuja revisão mais recente é "aprovado", e não removidas na fonte.
-- Mudar a generalização exige nova migração depois da validação da política (protegido.politica_protecao).

set search_path = protegido, extensions, public;

-- Revisão vigente de cada conjunto de dados (a mais recente).
create view protegido.revisao_vigente as
select distinct on (conjunto_id) conjunto_id, decisao, licenca_confirmada, tipo, revisado_em
from protegido.revisao_conjunto
order by conjunto_id, revisado_em desc, id desc;
comment on view protegido.revisao_vigente is 'Revisão mais recente de cada conjunto de dados.';

create view publico.ocorrencia with (security_barrier = true) as
with base as (
  select
    o.id,
    o.geom,
    o.nome_recebido,
    o.conciliacao,
    o.ano,
    o.licenca_efetiva,
    o.alertas,
    o.url_origem,
    o.conjunto_id,
    o.lote_id,
    n.especie_id,
    om.municipio_codigo,
    (o.generalizada_na_fonte
      or coalesce(r.data_generalizations, '') <> ''
      or coalesce(r.information_withheld, '') <> ''
      or exists (select 1 from protegido.taxon_sensivel ts where ts.especie_id = n.especie_id)) as sensivel
  from protegido.ocorrencia o
  join protegido.ocorrencia_recebida r on r.id = o.recebida_id
  join protegido.revisao_vigente rv on rv.conjunto_id = o.conjunto_id and rv.decisao = 'aprovado'
  left join protegido.nome_cientifico n on n.id = o.nome_cientifico_id
  left join protegido.ocorrencia_municipio om on om.ocorrencia_id = o.id
  where not o.removido_na_fonte
)
select
  b.id,
  b.especie_id,
  e.nome as especie,
  e.familia,
  b.nome_recebido,
  b.conciliacao,
  b.ano,
  b.municipio_codigo,
  m.nome as municipio,
  case when b.sensivel then 'municipio' else 'celula_0_1_grau' end as protecao,
  case when b.sensivel then null else
    st_makeenvelope(
      floor(st_x(b.geom) / 0.1) * 0.1, floor(st_y(b.geom) / 0.1) * 0.1,
      floor(st_x(b.geom) / 0.1) * 0.1 + 0.1, floor(st_y(b.geom) / 0.1) * 0.1 + 0.1,
      4674)
  end as celula,
  b.licenca_efetiva,
  b.alertas,
  case when b.sensivel then null else b.url_origem end as url_origem,
  b.conjunto_id,
  c.titulo as conjunto,
  c.publicador,
  b.lote_id
from base b
join protegido.conjunto_dados c on c.id = b.conjunto_id
left join protegido.especie e on e.id = b.especie_id
left join protegido.municipio m on m.codigo_ibge = b.municipio_codigo;
comment on view publico.ocorrencia is 'Ocorrência pública: célula de 0,1° (generalização conservadora) ou só município, para sensíveis. Nunca coordenada precisa.';

create view publico.especie as
select
  e.id,
  e.nome,
  e.familia,
  e.genero,
  exists (select 1 from protegido.taxon_sensivel ts where ts.especie_id = e.id) as sensivel,
  (select count(*) from publico.ocorrencia po where po.especie_id = e.id) as ocorrencias,
  (select count(distinct po.municipio_codigo) from publico.ocorrencia po where po.especie_id = e.id) as municipios
from protegido.especie e;
comment on view publico.especie is 'Espécie e contagens derivadas a partir das ocorrências públicas.';

create view publico.nome_cientifico as
select n.id, n.nome, n.autoria, n.rank, n.status, n.especie_id, n.nome_aceito_id
from protegido.nome_cientifico n;
comment on view publico.nome_cientifico is 'Nomes científicos (aceitos e sinônimos) da referência taxonômica.';

create view publico.municipio as
select
  m.codigo_ibge,
  m.nome,
  u.sigla as uf,
  m.geom,
  m.edicao_malha,
  (select count(*) from publico.ocorrencia po where po.municipio_codigo = m.codigo_ibge) as ocorrencias,
  (select count(distinct po.especie_id) from publico.ocorrencia po where po.municipio_codigo = m.codigo_ibge) as especies
from protegido.municipio m
join protegido.uf u on u.codigo_ibge = m.uf_codigo;
comment on view publico.municipio is 'Município (malha do IBGE, dado público) e contagens derivadas das ocorrências públicas.';

create view publico.conjunto_dados as
select c.id, c.fonte_codigo, c.chave_externa, c.titulo, c.publicador, c.pais_publicador,
       rv.licenca_confirmada as licenca, c.citacao, c.doi, c.url, rv.revisado_em
from protegido.conjunto_dados c
join protegido.revisao_vigente rv on rv.conjunto_id = c.id and rv.decisao = 'aprovado';
comment on view publico.conjunto_dados is 'Conjuntos de dados aprovados em revisão, com licença confirmada e citação.';

create view publico.fonte as
select f.codigo, f.nome, f.papel, f.url, f.termos_de_uso from protegido.fonte f;
comment on view publico.fonte is 'Fontes externas e o papel de cada uma.';

create view publico.lote as
select l.id, l.fonte_codigo, l.descricao, l.filtros, l.doi, l.citacao, l.versao_fonte, l.obtido_em,
       l.concluido_em, l.situacao, l.recebidos, l.aceitos, l.rejeitados, l.nao_conciliados, l.sinalizados,
       l.rejeicoes_por_motivo
from protegido.lote l
where l.situacao in ('ok', 'parcial');
comment on view publico.lote is 'Lotes de ingestão concluídos, com DOI, citação e contagens.';

-- ============================================================================================
-- Papel de leitura do site: só o schema `publico`.
-- No Supabase, o login e a senha são definidos fora do repositório (ver supabase/README.md).
-- ============================================================================================

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'bemtevi_leitura') then
    create role bemtevi_leitura nologin;
  end if;
end;
$$;
comment on role bemtevi_leitura is 'Bem-te-vi: leitura somente das views do schema publico.';

grant usage on schema publico to bemtevi_leitura;
grant select on all tables in schema publico to bemtevi_leitura;
grant usage on schema extensions to bemtevi_leitura;

-- Papéis da API do Supabase (anon, authenticated) não recebem nada: o site não usa a Data API para estes schemas.
do $$
declare papel text;
begin
  foreach papel in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = papel) then
      execute format('revoke all on schema protegido, publico from %I', papel);
      execute format('revoke all on all tables in schema protegido from %I', papel);
      execute format('revoke all on all tables in schema publico from %I', papel);
    end if;
  end loop;
end;
$$;
