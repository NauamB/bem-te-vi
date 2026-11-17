-- Bem-te-vi — Fase 11.4.4C: suspensão de aprovação de conjunto entre lotes.
--
-- A cada lote, a carga reavalia o conjunto com TODOS os registros já recebidos dele. Se a aprovação vigente
-- deixou de valer (licença efetiva mais restritiva, licença não admitida ou termos adicionais novos), a carga
-- registra uma revisão 'pendente' que suspende a aprovação até nova revisão humana. A revisão anterior continua
-- no histórico (tabela somente inserção).
--
-- Uma revisão pendente não confirma licença nenhuma: licenca_confirmada passa a aceitar nulo, mas só quando
-- a decisão é 'pendente'. Aprovações e rejeições continuam exigindo a licença confirmada.

set search_path = protegido, extensions, public;

alter table protegido.revisao_conjunto alter column licenca_confirmada drop not null;
alter table protegido.revisao_conjunto add constraint revisao_conjunto_licenca_exigida
  check (decisao = 'pendente' or licenca_confirmada is not null);
comment on column protegido.revisao_conjunto.licenca_confirmada is 'Licença confirmada na revisão. Nula só em revisão pendente (ex.: aprovação suspensa por registros novos incompatíveis).';
