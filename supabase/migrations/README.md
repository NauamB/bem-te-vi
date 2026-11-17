# supabase/migrations

Migrações SQL versionadas do banco do Bem-te-vi (PostgreSQL + PostGIS), aplicadas em ordem pelo nome (`AAAAMMDDHHMMSS_descricao.sql`, formato aceito pela CLI do Supabase).

| Migração | Conteúdo |
|---|---|
| `20261116180000_fundacao_modelo_de_dados.sql` | PostGIS, schemas `protegido` e `publico`, tabelas de proveniência, originais, taxonomia, território, ocorrências e proteção; restrições, índices, imutabilidade e RLS |
| `20261116180100_camada_publica_e_papel_de_leitura.sql` | Views públicas com generalização conservadora (células de 0,1°; sensíveis só por município) e papel `bemtevi_leitura` |
| `20261116190000_relatorio_do_lote.sql` | Coluna `relatorio` (resultado das validações) no lote e na view pública de lotes |
| `20261116200000_taxonomia_multigrupo_e_busca.sql` | Classificação da espécie, nomes populares, distribuição e perfil da referência; busca por nome científico ou popular; aviso público por fonte |
| `20261116210000_ocorrencias_gbif.sql` | Campos das ocorrências do GBIF; grupo, base do registro, incerteza e data na camada pública |
| `20261116220000_protecao_iucn_do_registro.sql` | Categoria IUCN CR/EN/VU do próprio registro também protege a ocorrência (só município), com ou sem conciliação taxonômica |
| `20261117120000_suspensao_de_revisao_do_conjunto.sql` | Revisão `pendente` sem licença confirmada, para a carga suspender uma aprovação que deixou de cobrir os registros do conjunto |

Regras:
- **Uma migração por mudança.** Migração já aplicada não é editada: a correção vem numa migração nova.
- **Toda tabela com RLS habilitado.** Sem políticas, nenhum papel que não seja o dono enxerga linhas. O acesso público é só pelas views de `publico`.
- **Toda tabela declara a sua natureza** no comentário: dado original, tratado, derivado, proveniência ou decisão humana. Um teste confere isso.
- **Tabelas de originais, arquivos e revisões são somente inserção:** um gatilho recusa `UPDATE` e `DELETE`.
- **Nenhum dado científico, de demonstração ou sintético dentro de migrações.** Um teste confere isso. Os dados sintéticos de teste ficam em `tests/banco/fixtures/` e só existem no banco em memória dos testes.
- **Compatibilidade:** PostgreSQL 15 ou superior (Supabase) e PGlite (PostgreSQL 18, usado nos testes). Não usar recursos exclusivos do PostgreSQL 18.

Como executar e como aplicar no Supabase: ver `supabase/README.md`.
