# Banco de dados do Bem-te-vi

PostgreSQL + PostGIS. Modelo e decisões: `docs/arquitetura/ADR-0001-arquitetura-do-piloto.md`.

**Situação (Fase 11.3):**
- as migrações e os testes rodam **localmente**;
- o projeto Supabase existe (`bem-te-vi`, Free, `sa-east-1`), mas **nenhuma migração foi aplicada nele**; a inspeção remota está pronta e só lê;
- **dados reais carregados só no banco local:**
  - malha municipal do IBGE 2025 (142 municípios);
  - Flora e Funga do Brasil v393.433 (166.251 nomes, 57.960 espécies);
- **ocorrências do GBIF:** o conector está pronto e testado com dados sintéticos, mas os downloads oficiais ainda não foram solicitados.

## Estrutura

| Schema | Conteúdo | Quem acessa |
|---|---|---|
| `protegido` | Todas as tabelas, inclusive coordenadas precisas e originais verbatim | Só o dono (ingestão). RLS sem políticas em todas as tabelas |
| `publico` | Só views, **sem coordenada precisa** | Papel `bemtevi_leitura` (site) |

Principais tabelas de `protegido`:

| Grupo | Tabelas |
|---|---|
| Proveniência | `fonte`, `conjunto_dados`, `lote`, `arquivo_original`, `revisao_conjunto` |
| Dado original | `ocorrencia_recebida` (inclusive os registros rejeitados), `nome_recebido` |
| Taxonomia | `especie`, `nome_cientifico` (aceitos e sinônimos) |
| Território | `uf`, `municipio` (código IBGE de 7 dígitos, SIRGAS 2000) |
| Ocorrências | `ocorrencia` (ponto preciso), `ocorrencia_municipio` (derivado) |
| Proteção | `lista_referencia`, `taxon_sensivel`, `politica_protecao` |

Views de `publico`: `ocorrencia`, `especie`, `nome_cientifico`, `municipio`, `conjunto_dados`, `fonte`, `lote`.

**Proteção de coordenadas (estado atual):**
- **toda** ocorrência pública aparece como a célula de 0,1° (cerca de 11 km) que a contém;
- espécies da lista de sensíveis e registros generalizados ou retidos na fonte aparecem só com o município, sem link para o registro individual;
- só entram conjuntos de dados cuja revisão mais recente é "aprovado";
- maior precisão só depois da validação da política, e por nova migração.

## Executar localmente

Não há Docker, servidor PostgreSQL nem conta externa envolvidos. Os testes usam o **PGlite** (`@electric-sql/pglite` com `@electric-sql/pglite-postgis`): PostgreSQL 18.6 com PostGIS 3.6.2, compilado para WebAssembly e rodando em memória.

```bash
npm ci
npm run territorio:baixar   # baixa a malha oficial do IBGE e confere o SHA-256 (necessário para os testes de território)
npm run test:banco          # testes em bancos novos, em memória
```

O `test:banco` cria bancos vazios em memória, emula os papéis `anon` e `authenticated` do Supabase e aplica todas as migrações. Depois roda:
- os testes de migração, integridade, permissões e proteção, com os **dados sintéticos** de `tests/banco/fixtures/sinteticos.sql`;
- os testes de território, com a **malha oficial** baixada.

Os bancos são descartados no fim. A CI roda os mesmos comandos.

### Banco local persistente

```bash
npm run banco:local           # cria ou atualiza dados/banco-local/ (migrações pendentes) e mostra o estado
npm run territorio:carregar   # carrega a malha do IBGE no banco local (uma vez; repetir não duplica)
```

- `dados/banco-local/` e `dados/originais/` são ignorados pelo Git.
- Cada migração aplicada fica registrada, com SHA-256, em `bemtevi_local.migracao`. Uma migração editada depois de aplicada é recusada.

### Repetir a importação da malha do IBGE

1. O manifesto versionado `dados/referencias/ibge-malha-municipal-2025.json` registra a origem de cada arquivo:
   - URL oficial;
   - tamanho e SHA-256;
   - `Last-Modified` do servidor;
   - data de obtenção;
   - condições de uso conhecidas.
2. `npm run territorio:baixar` baixa os ZIPs para `dados/originais/ibge/malha-municipal-2025/` e confere tamanho e SHA-256. **Se o IBGE republicar o arquivo, o hash diverge e o processo para.** Nesse caso, a nova versão exige revisão e manifesto novo; não se atualiza o hash às cegas.
3. `npm run territorio:carregar` valida antes de gravar e grava num único lote, que é desfeito por inteiro se algo falhar:
   - **atributos:** 142 registros, sem apagados; códigos de 7 dígitos iniciados por 51 e únicos; nome, UF e área presentes; anéis fechados; `.prj` em SIRGAS 2000; `.cpg` em UTF-8;
   - **geometrias:** montadas no PostGIS com `ST_BuildArea`, sem nenhuma correção; precisam ser válidas e estar em EPSG:4674;
   - **áreas:** cada município confere com o `AREA_KM2` oficial (tolerância de 0,5%);
   - **cobertura:** soma das áreas = área da união = área da UF (tolerância de 1 km²), e nenhum município com ponto interno fora da UF.
4. O lote registra fonte, edição, os dois arquivos com SHA-256 e o relatório da validação (`protegido.lote.relatorio`).

**Limitações do PGlite:**
- não tem `ST_AsMVT`, porque o build não inclui `protobuf-c`. O piloto usa GeoJSON de células (ADR-0001, seção 13.2);
- `ST_Difference` e `ST_Intersection` entre multipolígonos muito grandes **devolvem zero linhas sem erro**. Por isso as validações usam áreas e exigem exatamente uma linha por consulta (ADR-0001, seção 13.3).


## Fontes e comandos da Fase 11.3

```bash
npm run taxonomia:baixar          # Flora e Funga (DwC-A versionado do IPT do JBRJ; confere SHA-256)
npm run taxonomia:carregar        # nomes, sinônimos, espécies, nomes populares, distribuição em MT e perfil
npm run gbif -- avaliar flora     # contagens prévias na API pública (também: fauna)
npm run gbif -- solicitar flora   # pede o download oficial (exige GBIF_USUARIO e GBIF_SENHA no .env.local)
npm run gbif -- situacao <chave>  # acompanha o pedido; mostra o DOI
npm run gbif -- baixar <chave>    # baixa o ZIP e registra SHA-256 e DOI em dados/referencias/gbif-downloads.json
npm run gbif -- carregar <chave>  # valida, concilia e carrega no banco local
npm run gbif -- pendentes         # conjuntos de dados aguardando revisão humana (CC BY-NC ou termos adicionais)
npm run gbif -- revisar --conjunto <datasetKey> --decisao aprovado --revisor "<nome>" --licenca CC-BY-NC-4.0   --condicoes "<termos lidos>" --atribuicao "<crédito exigido>" --justificativa "<motivo>"
npm run banco:remoto -- inspecionar   # Supabase: só leitura (exige SUPABASE_DB_URL no .env.local)
```

Os comandos que acessam a rede usam `--use-system-ca`, para confiar nos certificados do sistema operacional (redes com inspeção TLS institucional). A verificação TLS **nunca** é desligada.

## Aplicar no Supabase (etapa posterior — ainda não executada)

Depende de ações do proprietário (plano da Fase 11, ações A3 e A4). Nenhum valor de credencial entra no repositório.

1. **Criar o projeto** Supabase Free na região `sa-east-1` e conferir os limites atuais do plano.
2. **Aplicar as migrações** com a CLI do Supabase:
   ```bash
   npx supabase@<versão fixada> link --project-ref <ref-do-projeto>
   npx supabase@<versão fixada> db push
   ```
   O `db push` aplica, em ordem, as migrações de `supabase/migrations/` ainda não aplicadas. A CLI pede a senha do banco de forma interativa; ela não é gravada no repositório.
3. **Ativar o login do papel do site**, uma única vez, no editor SQL do painel, com uma senha forte gerada na hora:
   ```sql
   alter role bemtevi_leitura with login password '<senha gerada — não registrar no repositório>';
   ```
4. **Configurar o site:** a conexão de leitura usa o *pooler* do Supabase, com o usuário `bemtevi_leitura.<ref-do-projeto>`. A string fica só em variável de servidor da Vercel (ex.: `BANCO_LEITURA_URL`), **nunca** com prefixo `NEXT_PUBLIC_`. A compatibilidade de papéis próprios com o pooler é confirmada nessa etapa.
5. **Conferir no banco real:**
   - rodar, sobre o projeto, as consultas de permissão dos testes (o papel do site não lê `protegido`);
   - confirmar que `protegido` e `publico` **não** estão expostos na Data API (Configurações → API → *Exposed schemas*).

A chave secreta do Supabase (`service_role` / `sb_secret_…`) não é usada pelo site. A credencial de escrita da ingestão fica só em GitHub Secrets.
