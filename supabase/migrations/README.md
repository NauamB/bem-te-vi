# supabase/migrations

Pasta reservada para as migrações SQL versionadas do banco (PostgreSQL + PostGIS no Supabase).

**Não há migrações nesta fase.** A modelagem (espécies, registros de ocorrência, fontes, municípios, biomas, geometrias, importações e auditoria) é objeto de fase própria e começará por um ADR de modelo de dados (ver `docs/dados/ESTRATEGIA_DE_DADOS.md`).

Regras previstas:
- Uma migração por mudança, aplicada por pipeline, nunca à mão em produção.
- Toda tabela nova com RLS habilitado e política explícita no mesmo arquivo.
- Tabelas de auditoria sem `UPDATE`/`DELETE` para qualquer papel da aplicação.
- Nenhum dado científico ou de demonstração dentro de migrações.
