-- Bem-te-vi — Fase 11.2: relatório de validação de cada lote de ingestão (ex.: áreas, cobertura e
-- conferências da malha do IBGE), separado das rejeições por motivo.

alter table protegido.lote add column relatorio jsonb not null default '{}'::jsonb;
comment on column protegido.lote.relatorio is 'Resultado das validações do lote (métricas e conferências), gravado pelo conector.';

-- A view pública de lotes passa a expor o relatório (não contém coordenadas).
create or replace view publico.lote as
select l.id, l.fonte_codigo, l.descricao, l.filtros, l.doi, l.citacao, l.versao_fonte, l.obtido_em,
       l.concluido_em, l.situacao, l.recebidos, l.aceitos, l.rejeitados, l.nao_conciliados, l.sinalizados,
       l.rejeicoes_por_motivo, l.relatorio
from protegido.lote l
where l.situacao in ('ok', 'parcial');
