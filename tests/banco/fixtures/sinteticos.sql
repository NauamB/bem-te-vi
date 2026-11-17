-- ╔══════════════════════════════════════════════════════════════════════════════════════════════════╗
-- ║ DADOS SINTÉTICOS — EXCLUSIVAMENTE PARA TESTES AUTOMATIZADOS.                                      ║
-- ║ Não são dados reais, não representam espécies, lugares, coleções ou pessoas e nunca devem ser     ║
-- ║ carregados em banco publicado. Só são usados num banco em memória criado pelos testes.            ║
-- ║ Marcadores: fontes "teste-sintetico-*", UF "99"/"ZZ", municípios "99000xx", nomes "Sinteticus *", ║
-- ║ URLs no domínio reservado ".invalid" e geometrias perto de (0°, 0°), no oceano.                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════════════════════════╝
set search_path = protegido, extensions, public;

insert into protegido.fonte (codigo, nome, papel, url) values
  ('teste-sintetico-territorio',  '[SINTÉTICO] Território de teste',  'territorio',  'https://teste.invalid/territorio'),
  ('teste-sintetico-taxonomia',   '[SINTÉTICO] Taxonomia de teste',   'taxonomia',   'https://teste.invalid/taxonomia'),
  ('teste-sintetico-ocorrencias', '[SINTÉTICO] Ocorrências de teste', 'ocorrencias', 'https://teste.invalid/ocorrencias'),
  ('teste-sintetico-protecao',    '[SINTÉTICO] Lista de teste',       'protecao',    'https://teste.invalid/protecao');

insert into protegido.lote (fonte_codigo, descricao, versao_conector, situacao, concluido_em) values
  ('teste-sintetico-territorio',  'sintetico-territorio',  'teste', 'ok', now()),
  ('teste-sintetico-taxonomia',   'sintetico-taxonomia',   'teste', 'ok', now()),
  ('teste-sintetico-ocorrencias', 'sintetico-ocorrencias', 'teste', 'ok', now()),
  ('teste-sintetico-protecao',    'sintetico-protecao',    'teste', 'ok', now());

-- Território fictício: UF 99 = [0,2]×[0,1]; município 9900001 = [0,1]×[0,1]; 9900002 = [1,2]×[0,1].
insert into protegido.uf (codigo_ibge, sigla, nome, geom, edicao_malha, lote_id) values
  ('99', 'ZZ', '[SINTÉTICO] UF de teste',
   st_multi(st_makeenvelope(0, 0, 2, 1, 4674)), 'teste',
   (select id from protegido.lote where descricao = 'sintetico-territorio'));

insert into protegido.municipio (codigo_ibge, nome, uf_codigo, geom, edicao_malha, lote_id) values
  ('9900001', '[SINTÉTICO] Município A', '99', st_multi(st_makeenvelope(0, 0, 1, 1, 4674)), 'teste',
   (select id from protegido.lote where descricao = 'sintetico-territorio')),
  ('9900002', '[SINTÉTICO] Município B', '99', st_multi(st_makeenvelope(1, 0, 2, 1, 4674)), 'teste',
   (select id from protegido.lote where descricao = 'sintetico-territorio'));

-- Taxonomia fictícia: "Sinteticus communis" (comum), "Sinteticus rarus" (sensível), sinônimo "Sinteticus vetus".
insert into protegido.nome_recebido (lote_id, taxon_id, nome, autoria, rank, status, accepted_name_usage_id, familia, genero)
select l.id, v.taxon_id, v.nome, 'Teste', 'ESPECIE', v.status, v.aceito, 'Sinteticaceae', 'Sinteticus'
from protegido.lote l,
  (values ('T1', 'Sinteticus communis', 'NOME_ACEITO', null),
          ('T2', 'Sinteticus rarus',    'NOME_ACEITO', null),
          ('T3', 'Sinteticus vetus',    'SINONIMO',    'T1')) as v(taxon_id, nome, status, aceito)
where l.descricao = 'sintetico-taxonomia';

insert into protegido.especie (nome, familia, genero, lote_id)
select v.nome, 'Sinteticaceae', 'Sinteticus', l.id
from protegido.lote l, (values ('Sinteticus communis'), ('Sinteticus rarus')) as v(nome)
where l.descricao = 'sintetico-taxonomia';

insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, autoria, rank, status, especie_id, nome_canonico, nome_busca)
select r.lote_id, r.id, r.taxon_id, r.nome, r.autoria, 'especie', 'aceito', e.id, r.nome, lower(r.nome)
from protegido.nome_recebido r join protegido.especie e on e.nome = r.nome
where r.taxon_id in ('T1', 'T2');

insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, autoria, rank, status, nome_aceito_id, especie_id, nome_canonico, nome_busca)
select r.lote_id, r.id, r.taxon_id, r.nome, r.autoria, 'especie', 'sinonimo', a.id, a.especie_id, r.nome, lower(r.nome)
from protegido.nome_recebido r join protegido.nome_cientifico a on a.taxon_id = 'T1'
where r.taxon_id = 'T3';

-- Nomes populares, distribuição e perfil fictícios da referência sintética.
insert into protegido.nome_popular_recebido (lote_id, taxon_id, nome, idioma, nome_busca)
select id, 'T1', '[SINTÉTICO] árvore-de-teste', 'PORTUGUES', '[sintetico] arvore-de-teste' from protegido.lote where descricao = 'sintetico-taxonomia';
insert into protegido.distribuicao_recebida (lote_id, taxon_id, location_id, establishment_means, endemismo, dominios)
select id, 'T1', 'BR-ZZ', 'Nativa', '[SINTÉTICO]', '{"[SINTÉTICO] Domínio"}' from protegido.lote where descricao = 'sintetico-taxonomia';
insert into protegido.perfil_recebido (lote_id, taxon_id, formas_de_vida)
select id, 'T1', '{"[SINTÉTICO] Forma"}' from protegido.lote where descricao = 'sintetico-taxonomia';

-- Lista de proteção fictícia: "Sinteticus rarus" é sensível.
insert into protegido.lista_referencia (lote_id, nome, ato_normativo)
select id, '[SINTÉTICO] Lista de teste', 'Nenhum (teste)' from protegido.lote where descricao = 'sintetico-protecao';

insert into protegido.taxon_sensivel (especie_id, lista_id, categoria)
select e.id, l.id, 'TESTE' from protegido.especie e, protegido.lista_referencia l where e.nome = 'Sinteticus rarus';

-- Conjuntos de dados fictícios e revisões:
--   S1 CC BY, aprovado (conferência automática)    S2 CC BY-NC, aprovado (revisão humana)
--   S3 CC BY, sem revisão (não pode aparecer)      S4 CC BY, rejeitado (não pode aparecer)
--   S5 CC BY, aprovado e depois rejeitado (vale a mais recente: não pode aparecer)
insert into protegido.conjunto_dados (fonte_codigo, chave_externa, titulo, publicador, licenca, url) values
  ('teste-sintetico-ocorrencias', 'S1', '[SINTÉTICO] Conjunto 1', '[SINTÉTICO] Publicador', 'CC-BY-4.0',    'https://teste.invalid/s1'),
  ('teste-sintetico-ocorrencias', 'S2', '[SINTÉTICO] Conjunto 2', '[SINTÉTICO] Publicador', 'CC-BY-NC-4.0', 'https://teste.invalid/s2'),
  ('teste-sintetico-ocorrencias', 'S3', '[SINTÉTICO] Conjunto 3', '[SINTÉTICO] Publicador', 'CC-BY-4.0',    'https://teste.invalid/s3'),
  ('teste-sintetico-ocorrencias', 'S4', '[SINTÉTICO] Conjunto 4', '[SINTÉTICO] Publicador', 'CC-BY-4.0',    'https://teste.invalid/s4'),
  ('teste-sintetico-ocorrencias', 'S5', '[SINTÉTICO] Conjunto 5', '[SINTÉTICO] Publicador', 'CC-BY-4.0',    'https://teste.invalid/s5');

insert into protegido.revisao_conjunto
  (conjunto_id, revisor, revisado_em, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
select c.id, '[SINTÉTICO] revisor', v.quando::timestamptz, v.tipo, v.licenca, 'teste', 'teste', v.decisao, 'teste'
from protegido.conjunto_dados c join (values
  ('S1', '2026-01-01', 'automatica', 'CC-BY-4.0',    'aprovado'),
  ('S2', '2026-01-01', 'humana',     'CC-BY-NC-4.0', 'aprovado'),
  ('S4', '2026-01-01', 'humana',     'CC-BY-4.0',    'rejeitado'),
  ('S5', '2026-01-01', 'automatica', 'CC-BY-4.0',    'aprovado'),
  ('S5', '2026-02-01', 'humana',     'CC-BY-4.0',    'rejeitado')) as v(chave, quando, tipo, licenca, decisao)
  on v.chave = c.chave_externa;

-- Ocorrências recebidas (texto verbatim). G7 foi rejeitada na carga e não vira ocorrência.
insert into protegido.ocorrencia_recebida
  (lote_id, conjunto_id, gbif_id, occurrence_id, scientific_name, verbatim_locality,
   decimal_latitude, decimal_longitude, data_generalizations, license, motivo_rejeicao)
select l.id, c.id, v.gbif, 'occ-' || v.gbif, v.nome, '[SINTÉTICO] localidade precisa ' || v.gbif,
       v.lat, v.lon, v.generalizacao, 'teste', v.motivo
from protegido.lote l
join (values
  ('G1',  'S1', 'Sinteticus communis', '0.456', '0.123',  null,                  null),
  ('G2',  'S1', 'Sinteticus rarus',    '0.567', '1.234',  null,                  null),
  ('G3',  'S2', 'Sinteticus vetus',    '0.111', '0.987',  null,                  null),
  ('G4',  'S3', 'Sinteticus communis', '0.222', '0.333',  null,                  null),
  ('G5',  'S4', 'Sinteticus communis', '0.444', '0.555',  null,                  null),
  ('G6',  'S1', 'Sinteticus communis', '0.666', '0.777',  null,                  null),
  ('G7',  'S1', 'Sinteticus communis', '0',     '0',      null,                  'coordenada (0, 0)'),
  ('G8',  'S1', 'Sinteticus ignotus',  '0.818', '1.919',  null,                  null),
  ('G9',  'S1', 'Sinteticus communis', '0.313', '1.414',  'coordenada arredondada pela fonte', null),
  ('G10', 'S1', 'Sinteticus communis', '-0.0577', '-0.0399', null,               null),
  ('G11', 'S5', 'Sinteticus communis', '0.888', '0.999',  null,                  null)
) as v(gbif, chave, nome, lat, lon, generalizacao, motivo) on true
join protegido.conjunto_dados c on c.chave_externa = v.chave
where l.descricao = 'sintetico-ocorrencias';

-- Ocorrências tratadas. G6 foi removida na fonte; G8 tem nome não conciliado e foi generalizada na fonte.
insert into protegido.ocorrencia
  (recebida_id, fonte_codigo, id_externo, conjunto_id, lote_id, nome_recebido, nome_cientifico_id, conciliacao,
   ano, geom, licenca_efetiva, generalizada_na_fonte, removido_na_fonte, url_origem)
select r.id, 'teste-sintetico-ocorrencias', r.gbif_id, r.conjunto_id, r.lote_id, r.scientific_name, n.id,
       case when n.id is null then 'nao_conciliado' else 'conciliado' end,
       2020,
       st_setsrid(st_makepoint(r.decimal_longitude::float8, r.decimal_latitude::float8), 4674),
       c.licenca, r.gbif_id = 'G8', r.gbif_id = 'G6', 'https://teste.invalid/ocorrencia/' || r.gbif_id
from protegido.ocorrencia_recebida r
join protegido.conjunto_dados c on c.id = r.conjunto_id
left join protegido.nome_cientifico n on n.nome = r.scientific_name
where r.motivo_rejeicao is null;

insert into protegido.ocorrencia_municipio (ocorrencia_id, municipio_codigo, metodo, edicao_malha)
select o.id, m.codigo_ibge, 'st_intersects', m.edicao_malha
from protegido.ocorrencia o join protegido.municipio m on st_intersects(m.geom, o.geom);
