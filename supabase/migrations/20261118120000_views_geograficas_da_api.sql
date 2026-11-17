-- Bem-te-vi — Fase 11.5.1: views geográficas da API pública.
--
-- publico.ocorrencia_celula: as mesmas linhas e colunas de publico.ocorrencia, sem a geometria, com a célula de
-- 0,1° como dois inteiros (canto sudoeste em décimos de grau). Assim a API agrupa e monta o GeoJSON sem chamar
-- o PostGIS e sem nenhuma coordenada além da célula, que já é pública. Ocorrências sensíveis (só município)
-- continuam sem célula: celula_x10 e celula_y10 nulos.
--
-- publico.municipio_mapa: malha municipal simplificada (tolerância de 0,005°, cerca de 550 m) já em GeoJSON,
-- para desenhar o mapa sem enviar a geometria oficial completa.
--
-- Só views, sem dados. Leitura pelo papel bemtevi_leitura, como as demais views de publico.

set search_path = protegido, extensions, public;

create view publico.ocorrencia_celula with (security_barrier = true) as
select
  o.id,
  o.especie_id,
  o.especie,
  o.familia,
  o.nome_recebido,
  o.conciliacao,
  o.ano,
  o.data_evento,
  o.municipio_codigo,
  o.municipio,
  o.protecao,
  round(st_xmin(o.celula) * 10)::integer as celula_x10,
  round(st_ymin(o.celula) * 10)::integer as celula_y10,
  o.licenca_efetiva,
  o.alertas,
  o.url_origem,
  o.conjunto_id,
  o.conjunto,
  o.publicador,
  o.lote_id,
  o.grupo,
  o.base_do_registro,
  o.incerteza_m
from publico.ocorrencia o;
comment on view publico.ocorrencia_celula is 'Ocorrência pública com a célula de 0,1° como inteiros (canto sudoeste × 10). Sensíveis sem célula. Nunca coordenada precisa.';

create view publico.municipio_mapa as
select
  m.codigo_ibge,
  m.nome,
  u.sigla as uf,
  m.edicao_malha,
  -- 4 casas decimais (cerca de 11 m); opção 0: sem "crs" (GeoJSON RFC 7946).
  st_asgeojson(st_simplifypreservetopology(m.geom, 0.005), 4, 0)::jsonb as geometria
from protegido.municipio m
join protegido.uf u on u.codigo_ibge = m.uf_codigo;
comment on view publico.municipio_mapa is 'Malha municipal simplificada (0,005°) em GeoJSON, só para desenho do mapa. A geometria oficial fica em publico.municipio.';

grant select on publico.ocorrencia_celula, publico.municipio_mapa to bemtevi_leitura;
