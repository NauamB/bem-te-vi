-- Bem-te-vi — Fase 11.1: fundação do modelo de dados (ADR-0001, revisão 2, com simplificação de schemas).
--
-- Dois schemas, que são a fronteira de segurança:
--   protegido  todas as tabelas, inclusive coordenadas precisas. Nenhum acesso para papéis da aplicação.
--   publico    só views, sem coordenada precisa. O site lê apenas daqui, com o papel bemtevi_leitura.
-- A natureza da informação (types/informacao.ts) é separada por TABELA, e cada tabela declara a sua no comentário.
--
-- Compatível com PostgreSQL 15+ (Supabase) e com o PGlite (PostgreSQL 18) usado nos testes locais.
-- Esta migração não insere nenhum dado: fontes, conjuntos, lotes e registros entram pela ingestão.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

set search_path = protegido, extensions, public;

create schema protegido;
create schema publico;
comment on schema protegido is 'Bem-te-vi: dados completos, inclusive coordenadas precisas. Sem acesso para papéis da aplicação.';
comment on schema publico is 'Bem-te-vi: camada pública, só views e sem coordenadas precisas. Lida pelo papel bemtevi_leitura.';

-- Ninguém além do dono acessa os schemas por padrão.
revoke all on schema protegido from public;
revoke all on schema publico from public;

-- Impede alterações em tabelas append-only (originais, arquivos, revisões).
create function protegido.impedir_alteracao() returns trigger
language plpgsql as $$
begin
  raise exception 'tabela % é somente inserção: % não é permitido', tg_table_name, tg_op
    using errcode = 'insufficient_privilege';
end;
$$;

-- ============================================================================================
-- Proveniência
-- ============================================================================================

create table protegido.fonte (
  codigo        text primary key check (codigo ~ '^[a-z0-9][a-z0-9-]{1,40}$'),
  nome          text not null,
  papel         text not null check (papel in ('taxonomia', 'ocorrencias', 'territorio', 'protecao')),
  url           text not null,
  termos_de_uso text,
  criado_em     timestamptz not null default now()
);
comment on table protegido.fonte is 'Proveniência: fonte externa e o seu papel (taxonomia, ocorrências, território, proteção).';

create table protegido.lote (
  id                    bigint generated always as identity primary key,
  fonte_codigo          text not null references protegido.fonte,
  descricao             text not null,
  filtros               jsonb not null default '{}'::jsonb,
  doi                   text check (doi is null or doi ~ '^10\.\d{4,9}/\S+$'),
  citacao               text,
  versao_fonte          text,
  versao_conector       text not null,
  solicitado_em         timestamptz,
  obtido_em             timestamptz,
  iniciado_em           timestamptz not null default now(),
  concluido_em          timestamptz,
  situacao              text not null default 'em_andamento'
                        check (situacao in ('em_andamento', 'ok', 'parcial', 'falha')),
  recebidos             integer check (recebidos >= 0),
  aceitos               integer check (aceitos >= 0),
  rejeitados            integer check (rejeitados >= 0),
  nao_conciliados       integer check (nao_conciliados >= 0),
  sinalizados           integer check (sinalizados >= 0),
  rejeicoes_por_motivo  jsonb not null default '{}'::jsonb,
  check (situacao = 'em_andamento' or concluido_em is not null),
  check (concluido_em is null or concluido_em >= iniciado_em)
);
comment on table protegido.lote is 'Proveniência: uma execução de ingestão, com filtros, DOI, contagens e situação.';

create table protegido.arquivo_original (
  id            bigint generated always as identity primary key,
  lote_id       bigint not null references protegido.lote,
  caminho       text not null,
  tipo          text not null,
  tamanho_bytes bigint not null check (tamanho_bytes > 0),
  sha256        text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  arquivado_em  timestamptz not null default now(),
  unique (lote_id, sha256)
);
comment on table protegido.arquivo_original is 'Proveniência: arquivo original arquivado (bucket privado), com SHA-256. Somente inserção.';

create table protegido.conjunto_dados (
  id                 bigint generated always as identity primary key,
  fonte_codigo       text not null references protegido.fonte,
  chave_externa      text not null,
  titulo             text not null,
  publicador         text,
  pais_publicador    text check (pais_publicador is null or pais_publicador ~ '^[A-Z]{2}$'),
  licenca            text not null check (licenca in ('CC0-1.0', 'CC-BY-4.0', 'CC-BY-NC-4.0', 'outra', 'ausente')),
  licenca_verbatim   text,
  direitos_verbatim  text,
  citacao            text,
  doi                text check (doi is null or doi ~ '^10\.\d{4,9}/\S+$'),
  url                text,
  unique (fonte_codigo, chave_externa)
);
comment on table protegido.conjunto_dados is 'Proveniência: conjunto de dados de origem (ex.: datasetKey do GBIF), com licença e direitos verbatim.';

create table protegido.revisao_conjunto (
  id                  bigint generated always as identity primary key,
  conjunto_id         bigint not null references protegido.conjunto_dados,
  revisor             text not null check (length(trim(revisor)) > 0),
  revisado_em         timestamptz not null default now(),
  tipo                text not null check (tipo in ('humana', 'automatica')),
  licenca_confirmada  text not null check (licenca_confirmada in ('CC0-1.0', 'CC-BY-4.0', 'CC-BY-NC-4.0')),
  condicoes_de_uso    text not null check (length(trim(condicoes_de_uso)) > 0),
  atribuicao_exigida  text not null check (length(trim(atribuicao_exigida)) > 0),
  decisao             text not null check (decisao in ('aprovado', 'rejeitado', 'pendente')),
  justificativa       text not null check (length(trim(justificativa)) > 0),
  -- ADR-0001, seção 7: CC BY-NC exige revisão humana; a finalidade não comercial não dispensa a leitura dos termos.
  check (licenca_confirmada <> 'CC-BY-NC-4.0' or tipo = 'humana')
);
comment on table protegido.revisao_conjunto is 'Decisão humana (ou conferência automática registrada) sobre o uso de um conjunto de dados. Somente inserção; vale a mais recente.';
create index on protegido.revisao_conjunto (conjunto_id, revisado_em desc, id desc);

-- ============================================================================================
-- Original: registros como recebidos (inclusive os rejeitados)
-- ============================================================================================

create table protegido.ocorrencia_recebida (
  id                        bigint generated always as identity primary key,
  lote_id                   bigint not null references protegido.lote,
  conjunto_id               bigint references protegido.conjunto_dados,
  gbif_id                   text not null,
  occurrence_id             text,
  dataset_key               text,
  institution_code          text,
  collection_code           text,
  catalog_number            text,
  recorded_by               text,
  record_number             text,
  event_date                text,
  ano                       text,
  scientific_name           text,
  scientific_name_authorship text,
  taxon_key                 text,
  verbatim_locality         text,
  municipality              text,
  state_province            text,
  decimal_latitude          text,
  decimal_longitude         text,
  coordinate_uncertainty_m  text,
  georeference_remarks      text,
  data_generalizations      text,
  information_withheld      text,
  license                   text,
  rights                    text,
  issues                    text[],
  motivo_rejeicao           text,
  recebido_em               timestamptz not null default now(),
  unique (lote_id, gbif_id)
);
comment on table protegido.ocorrencia_recebida is 'Dado original: registro de ocorrência como recebido (texto verbatim), inclusive rejeitados com o motivo. Somente inserção.';
create index on protegido.ocorrencia_recebida (gbif_id);

create table protegido.nome_recebido (
  id                     bigint generated always as identity primary key,
  lote_id                bigint not null references protegido.lote,
  taxon_id               text not null,
  nome                   text not null,
  autoria                text,
  rank                   text,
  status                 text,
  accepted_name_usage_id text,
  familia                text,
  genero                 text,
  recebido_em            timestamptz not null default now(),
  unique (lote_id, taxon_id)
);
comment on table protegido.nome_recebido is 'Dado original: linha da lista taxonômica de referência (Flora e Funga do Brasil) como recebida. Somente inserção.';

-- ============================================================================================
-- Taxonomia (dado tratado): espécie ≠ nome científico ≠ ocorrência
-- ============================================================================================

create table protegido.especie (
  id       bigint generated always as identity primary key,
  nome     text not null,
  familia  text,
  genero   text,
  lote_id  bigint not null references protegido.lote,
  unique (lote_id, nome)
);
comment on table protegido.especie is 'Dado tratado: espécie (nome aceito de rank espécie na referência taxonômica). Unidade das páginas de espécie.';

create table protegido.nome_cientifico (
  id               bigint generated always as identity primary key,
  lote_id          bigint not null references protegido.lote,
  recebido_id      bigint not null unique references protegido.nome_recebido,
  taxon_id         text not null,
  nome             text not null,
  autoria          text,
  rank             text not null,
  status           text not null check (status in ('aceito', 'sinonimo', 'outro')),
  nome_aceito_id   bigint references protegido.nome_cientifico,
  especie_id       bigint references protegido.especie,
  unique (lote_id, taxon_id),
  check (status <> 'sinonimo' or nome_aceito_id is not null)
);
comment on table protegido.nome_cientifico is 'Dado tratado: nome científico (aceito ou sinônimo) da referência taxonômica, ligado à espécie.';
create index on protegido.nome_cientifico (nome);
create index on protegido.nome_cientifico (especie_id);

-- ============================================================================================
-- Território (dado tratado): referência IBGE
-- ============================================================================================

create table protegido.uf (
  codigo_ibge  text primary key check (codigo_ibge ~ '^[0-9]{2}$'),
  sigla        text not null unique check (sigla ~ '^[A-Z]{2}$'),
  nome         text not null,
  geom         geometry(MultiPolygon, 4674) not null check (st_isvalid(geom)),
  edicao_malha text not null,
  lote_id      bigint not null references protegido.lote
);
comment on table protegido.uf is 'Dado tratado: unidade da federação (malha do IBGE, SIRGAS 2000).';
create index on protegido.uf using gist (geom);

create table protegido.municipio (
  codigo_ibge   text primary key check (codigo_ibge ~ '^[0-9]{7}$'),
  nome          text not null,
  uf_codigo     text not null references protegido.uf,
  geom          geometry(MultiPolygon, 4674) not null check (st_isvalid(geom)),
  edicao_malha  text not null,
  lote_id       bigint not null references protegido.lote,
  -- Os dois primeiros dígitos do código do município são o código da UF.
  check (left(codigo_ibge, 2) = uf_codigo)
);
comment on table protegido.municipio is 'Dado tratado: município (malha do IBGE, código de 7 dígitos, SIRGAS 2000).';
create index on protegido.municipio using gist (geom);

-- ============================================================================================
-- Ocorrências (dado tratado, com coordenada PRECISA — nunca exposta)
-- ============================================================================================

create table protegido.ocorrencia (
  id                     bigint generated always as identity primary key,
  recebida_id            bigint not null unique references protegido.ocorrencia_recebida,
  fonte_codigo           text not null references protegido.fonte,
  id_externo             text not null,
  conjunto_id            bigint not null references protegido.conjunto_dados,
  lote_id                bigint not null references protegido.lote,
  nome_recebido          text not null,
  nome_cientifico_id     bigint references protegido.nome_cientifico,
  conciliacao            text not null check (conciliacao in ('conciliado', 'nao_conciliado', 'ambiguo')),
  conciliacao_metodo     text,
  data_evento            date,
  ano                    smallint check (ano between 1500 and 2100),
  geom                   geometry(Point, 4674) not null,
  incerteza_m            numeric check (incerteza_m >= 0),
  licenca_efetiva        text not null check (licenca_efetiva in ('CC0-1.0', 'CC-BY-4.0', 'CC-BY-NC-4.0')),
  alertas                text[] not null default '{}',
  generalizada_na_fonte  boolean not null default false,
  url_origem             text,
  primeira_vez_visto     timestamptz not null default now(),
  ultima_vez_visto       timestamptz not null default now(),
  removido_na_fonte      boolean not null default false,
  unique (fonte_codigo, id_externo),
  check (st_isvalid(geom) and st_x(geom) between -180 and 180 and st_y(geom) between -90 and 90),
  check ((conciliacao = 'conciliado') = (nome_cientifico_id is not null)),
  check (ultima_vez_visto >= primeira_vez_visto)
);
comment on table protegido.ocorrencia is 'Dado tratado: ocorrência georreferenciada com coordenada PRECISA. Nunca exposta: a camada pública usa geometria generalizada.';
create index on protegido.ocorrencia using gist (geom);
create index on protegido.ocorrencia (nome_cientifico_id);
create index on protegido.ocorrencia (conjunto_id);

create table protegido.ocorrencia_municipio (
  ocorrencia_id     bigint primary key references protegido.ocorrencia,
  municipio_codigo  text not null references protegido.municipio,
  metodo            text not null,
  edicao_malha      text not null,
  calculado_em      timestamptz not null default now()
);
comment on table protegido.ocorrencia_municipio is 'Dado derivado: município da ocorrência, calculado pela malha do IBGE (método e edição registrados).';
create index on protegido.ocorrencia_municipio (municipio_codigo);

-- ============================================================================================
-- Proteção de espécies sensíveis
-- ============================================================================================

create table protegido.lista_referencia (
  id             bigint generated always as identity primary key,
  lote_id        bigint not null references protegido.lote,
  nome           text not null,
  ato_normativo  text not null,
  publicada_em   date
);
comment on table protegido.lista_referencia is 'Proveniência: lista oficial usada para definir táxons sensíveis (ex.: espécies ameaçadas da flora).';

create table protegido.taxon_sensivel (
  especie_id  bigint not null references protegido.especie,
  lista_id    bigint not null references protegido.lista_referencia,
  categoria   text not null,
  primary key (especie_id, lista_id)
);
comment on table protegido.taxon_sensivel is 'Dado tratado: espécie sensível segundo uma lista de referência.';

create table protegido.politica_protecao (
  versao        integer primary key check (versao > 0),
  estado        text not null check (estado in ('provisoria', 'validada')),
  grade_graus   numeric not null check (grade_graus > 0 and grade_graus <= 1),
  descricao     text not null,
  validada_por  text,
  validada_em   timestamptz,
  criado_em     timestamptz not null default now(),
  check (estado = 'provisoria' or (validada_por is not null and validada_em is not null))
);
comment on table protegido.politica_protecao is 'Decisão humana: versões da política de proteção de coordenadas. Nesta fase as views públicas aplicam a generalização conservadora a todas as ocorrências, qualquer que seja o estado.';

-- ============================================================================================
-- Imutabilidade e RLS
-- ============================================================================================

create trigger somente_insercao before update or delete on protegido.ocorrencia_recebida
  for each row execute function protegido.impedir_alteracao();
create trigger somente_insercao before update or delete on protegido.nome_recebido
  for each row execute function protegido.impedir_alteracao();
create trigger somente_insercao before update or delete on protegido.arquivo_original
  for each row execute function protegido.impedir_alteracao();
create trigger somente_insercao before update or delete on protegido.revisao_conjunto
  for each row execute function protegido.impedir_alteracao();

-- RLS em todas as tabelas, sem políticas: qualquer papel que não seja o dono enxerga zero linhas,
-- mesmo que receba GRANT por engano. O acesso público é só pelas views de `publico`.
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'protegido' loop
    execute format('alter table protegido.%I enable row level security', t.tablename);
    execute format('revoke all on protegido.%I from public', t.tablename);
  end loop;
end;
$$;

revoke all on function protegido.impedir_alteracao() from public;
