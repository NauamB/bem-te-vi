-- Bem-te-vi — Fase 11.3: taxonomia para todos os grupos (plantas, fungos, animais e outros), nomes populares,
-- distribuição e perfil da referência taxonômica, e busca por nome científico ou popular.
--
-- Referências taxonômicas (ADR-0001, adendo 2):
--   flora-funga-brasil  Flora e Funga do Brasil — Lista Oficial (plantas, algas e fungos).
--   gbif-taxonomia      Classificação atribuída pelo GBIF às ocorrências. Referência PROVISÓRIA para fauna e
--                       demais grupos; não é catálogo taxonômico oficial brasileiro (fonte.nota_publica).

set search_path = protegido, extensions, public;

-- Aviso público obrigatório de cada fonte (ex.: "referência provisória", "limites aproximados").
alter table protegido.fonte add column nota_publica text;

-- Classificação e identificador da espécie na sua referência.
alter table protegido.especie
  add column taxon_id text,
  add column reino    text,
  add column filo     text,
  add column classe   text,
  add column ordem    text;
alter table protegido.especie add constraint especie_taxon_id_unico unique (lote_id, taxon_id);
-- Homônimos existem (mesmo nome canônico, autores diferentes; 7 casos na Flora e Funga v393.433):
-- a identidade da espécie é o identificador da referência, não o nome.
alter table protegido.especie drop constraint especie_lote_id_nome_key;
-- (sem índice por nome: a busca usa nome_cientifico.nome_canonico e nome_busca)
create index on protegido.especie (reino);

-- Nome canônico (sem autoria) e chave normalizada para busca, em todos os nomes científicos.
alter table protegido.nome_cientifico
  add column nome_canonico text,
  add column nome_busca    text;
create index on protegido.nome_cientifico (nome_canonico);
drop index protegido.nome_cientifico_nome_idx;
create index on protegido.nome_cientifico (nome_busca text_pattern_ops);

-- Campos adicionais do registro original da referência taxonômica.
alter table protegido.nome_recebido
  add column parent_name_usage_id text,
  add column filo                 text,
  add column classe               text,
  add column ordem                text,
  add column especifico           text,
  add column infraespecifico      text,
  add column status_nomenclatural text,
  add column reino                text;

create table protegido.nome_popular_recebido (
  id          bigint generated always as identity primary key,
  lote_id     bigint not null references protegido.lote,
  taxon_id    text not null,
  nome        text not null check (length(trim(nome)) > 0),
  idioma      text,
  localidade  text,
  nome_busca  text not null
);
comment on table protegido.nome_popular_recebido is 'Dado original: nome popular (vernáculo) como recebido da referência taxonômica. Somente inserção.';
create index on protegido.nome_popular_recebido (lote_id, taxon_id);
create index on protegido.nome_popular_recebido (nome_busca text_pattern_ops);

create table protegido.distribuicao_recebida (
  id                    bigint generated always as identity primary key,
  lote_id               bigint not null references protegido.lote,
  taxon_id              text not null,
  location_id           text not null,
  establishment_means   text,
  endemismo             text,
  dominios              text[] not null default '{}',
  occurrence_remarks    text
);
comment on table protegido.distribuicao_recebida is 'Dado original: distribuição declarada pela referência taxonômica (ex.: BR-MT, origem, endemismo, domínios fitogeográficos). Somente inserção.';
create index on protegido.distribuicao_recebida (lote_id, taxon_id);

create table protegido.perfil_recebido (
  id              bigint generated always as identity primary key,
  lote_id         bigint not null references protegido.lote,
  taxon_id        text not null,
  formas_de_vida  text[] not null default '{}',
  habitats        text[] not null default '{}',
  vegetacao       text[] not null default '{}',
  texto_original  text
);
comment on table protegido.perfil_recebido is 'Dado original: perfil da espécie declarado pela referência taxonômica (forma de vida, hábitat, tipo de vegetação). Somente inserção.';
create index on protegido.perfil_recebido (lote_id, taxon_id);

do $$
declare t text;
begin
  foreach t in array array['nome_popular_recebido', 'distribuicao_recebida', 'perfil_recebido'] loop
    execute format('create trigger somente_insercao before update or delete on protegido.%I for each row execute function protegido.impedir_alteracao()', t);
    execute format('alter table protegido.%I enable row level security', t);
    execute format('revoke all on protegido.%I from public', t);
  end loop;
end;
$$;

-- ============================================================================================
-- Camada pública
-- ============================================================================================

-- Grupo de exibição a partir do reino da referência.
create function publico.grupo_do_reino(reino text) returns text
language sql immutable parallel safe as $$
  select case lower(coalesce(reino, ''))
    when 'plantae' then 'flora'
    when 'animalia' then 'fauna'
    when 'fungi' then 'fungos'
    else 'outros'
  end
$$;
grant execute on function publico.grupo_do_reino(text) to bemtevi_leitura;

drop view publico.especie;
create view publico.especie as
select
  e.id,
  e.nome,
  e.taxon_id,
  e.reino,
  publico.grupo_do_reino(e.reino) as grupo,
  e.filo,
  e.classe,
  e.ordem,
  e.familia,
  e.genero,
  l.fonte_codigo as referencia,
  f.nome as referencia_nome,
  f.nota_publica as referencia_nota,
  l.versao_fonte as referencia_versao,
  exists (select 1 from protegido.taxon_sensivel ts where ts.especie_id = e.id) as sensivel,
  (select count(*) from publico.ocorrencia po where po.especie_id = e.id) as ocorrencias,
  (select count(distinct po.municipio_codigo) from publico.ocorrencia po where po.especie_id = e.id) as municipios
from protegido.especie e
join protegido.lote l on l.id = e.lote_id
join protegido.fonte f on f.codigo = l.fonte_codigo;
comment on view publico.especie is 'Espécie, classificação, referência taxonômica (com aviso público) e contagens derivadas das ocorrências públicas.';
grant select on publico.especie to bemtevi_leitura;

drop view publico.nome_cientifico;
create view publico.nome_cientifico as
select n.id, n.nome, n.nome_canonico, n.autoria, n.rank, n.status, n.especie_id, n.nome_aceito_id
from protegido.nome_cientifico n;
comment on view publico.nome_cientifico is 'Nomes científicos (aceitos e sinônimos) das referências taxonômicas.';
grant select on publico.nome_cientifico to bemtevi_leitura;

create view publico.nome_popular as
select distinct on (e.id, lower(p.nome))
  e.id as especie_id, p.nome, p.idioma, p.localidade as regiao_do_nome
from protegido.nome_popular_recebido p
join protegido.nome_cientifico n on n.lote_id = p.lote_id and n.taxon_id = p.taxon_id
join protegido.especie e on e.id = n.especie_id
order by e.id, lower(p.nome), p.idioma nulls last;
comment on view publico.nome_popular is 'Nomes populares das espécies, como informados pela referência taxonômica.';
grant select on publico.nome_popular to bemtevi_leitura;

-- Índice de busca: nomes científicos (aceitos e sinônimos) e populares, com chave normalizada (sem acento, minúscula).
create view publico.busca as
select n.especie_id, n.nome_busca as chave, n.nome_canonico as texto,
       case when n.status = 'aceito' then 'cientifico' else 'sinonimo' end as tipo
from protegido.nome_cientifico n
where n.especie_id is not null and n.nome_busca is not null
union
select n.especie_id, p.nome_busca, p.nome, 'popular'
from protegido.nome_popular_recebido p
join protegido.nome_cientifico n on n.lote_id = p.lote_id and n.taxon_id = p.taxon_id
where n.especie_id is not null;
comment on view publico.busca is 'Chaves de busca (sem repetição) por nome científico, sinônimo ou nome popular, ligadas à espécie.';
grant select on publico.busca to bemtevi_leitura;

create view publico.distribuicao as
select n.especie_id, d.location_id, d.establishment_means as origem, d.endemismo, d.dominios
from protegido.distribuicao_recebida d
join protegido.nome_cientifico n on n.lote_id = d.lote_id and n.taxon_id = d.taxon_id
where n.especie_id is not null and n.status = 'aceito';
comment on view publico.distribuicao is 'Distribuição declarada pela referência taxonômica (não é ocorrência documentada).';
grant select on publico.distribuicao to bemtevi_leitura;

create view publico.perfil as
select n.especie_id, p.formas_de_vida, p.habitats, p.vegetacao
from protegido.perfil_recebido p
join protegido.nome_cientifico n on n.lote_id = p.lote_id and n.taxon_id = p.taxon_id
where n.especie_id is not null and n.status = 'aceito';
comment on view publico.perfil is 'Forma de vida, hábitat e vegetação declarados pela referência taxonômica.';
grant select on publico.perfil to bemtevi_leitura;

create or replace view publico.fonte as
select f.codigo, f.nome, f.papel, f.url, f.termos_de_uso, f.nota_publica from protegido.fonte f;
