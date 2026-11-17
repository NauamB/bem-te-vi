-- Bem-te-vi — Fase 11.4.4: proteção de espécies ameaçadas também pela categoria IUCN do PRÓPRIO registro.
--
-- Até aqui, a categoria IUCN (CR, EN, VU) informada pelo GBIF só protegia a ocorrência quando ela estava
-- conciliada com uma espécie marcada em protegido.taxon_sensivel. Na reconciliação da Fase 11.4.3, 5 registros
-- de plantas ameaçadas (ex.: Mimosa jacobita, Solanum arachnidanthum, VU) não teriam correspondência na Flora
-- e Funga e apareceriam como célula de 0,1°.
--
-- Agora a view pública também considera ocorrencia_recebida.iucn_red_list_category: CR, EN ou VU (e as formas
-- por extenso) tornam a ocorrência sensível — só município, sem célula, sem data exata e sem link do registro —
-- com ou sem conciliação taxonômica. Todas as condições anteriores continuam; a proteção só aumenta.
-- Mesma lista e ordem de colunas da Fase 11.3 (exigência do CREATE OR REPLACE VIEW).

set search_path = protegido, extensions, public;

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
      or exists (select 1 from protegido.taxon_sensivel ts where ts.especie_id = n.especie_id)
      or upper(coalesce(r.iucn_red_list_category, '')) in ('CR', 'EN', 'VU', 'CRITICALLY_ENDANGERED', 'ENDANGERED', 'VULNERABLE')) as sensivel
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
comment on view publico.ocorrencia is 'Ocorrência pública: célula de 0,1° (generalização conservadora) ou só município para sensíveis (lista de referência, generalização/retenção na fonte ou categoria IUCN CR/EN/VU do registro ou da espécie). Nunca coordenada precisa.';
