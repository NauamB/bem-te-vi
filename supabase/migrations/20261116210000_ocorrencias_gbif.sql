-- Bem-te-vi — Fase 11.3: campos das ocorrências do GBIF (download Darwin Core Archive) e atributos públicos
-- de qualidade e filtro. A lógica de proteção de coordenadas da camada pública NÃO muda.

set search_path = protegido, extensions, public;

alter table protegido.ocorrencia_recebida
  add column basis_of_record          text,
  add column kingdom                  text,
  add column phylum                   text,
  add column class                    text,
  add column "order"                  text,
  add column family                   text,
  add column genus                    text,
  add column species                  text,
  add column species_key              text,
  add column taxon_rank               text,
  add column verbatim_scientific_name text,
  add column iucn_red_list_category   text,
  add column access_rights            text,
  add column level1_gid               text;

alter table protegido.ocorrencia
  add column base_do_registro text,
  add column reino_recebido   text;

-- Mesma definição da Fase 11.1 (generalização conservadora), com colunas acrescentadas ao fim:
-- grupo, base do registro, incerteza (metros) e data do evento.
create or replace view publico.ocorrencia with (security_barrier = true) as
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
    o.base_do_registro,
    o.reino_recebido,
    o.incerteza_m,
    o.data_evento,
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
  b.lote_id,
  publico.grupo_do_reino(coalesce(e.reino, b.reino_recebido)) as grupo,
  b.base_do_registro,
  -- Incerteza e data não revelam a posição; para sensíveis, só o ano.
  b.incerteza_m,
  case when b.sensivel then null else b.data_evento end as data_evento
from base b
join protegido.conjunto_dados c on c.id = b.conjunto_id
left join protegido.especie e on e.id = b.especie_id
left join protegido.municipio m on m.codigo_ibge = b.municipio_codigo;
