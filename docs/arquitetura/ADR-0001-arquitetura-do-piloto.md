# ADR-0001 — Arquitetura do piloto demonstrativo

| Campo | Valor |
|---|---|
| Situação | **Proposta revisada.** A direção arquitetural foi aprovada pelo proprietário em 16/11/2026, condicionada aos ajustes desta revisão. Aguarda aprovação final para implementação |
| Data | 16/11/2026 (revisão 2) |
| Fase | 11 (preparação) |
| Relação | Detalha e simplifica a seção 2 de `ARQUITETURA_INICIAL.md` para o piloto. Plano de execução: `docs/PLANO_FASE_11.md` |

## 1. Contexto

O Bem-te-vi é **exclusivamente um projeto piloto, sem finalidade comercial**, destinado à entrega e à apresentação demonstrativa. Não é produto comercial nem plataforma empresarial.

O piloto precisa demonstrar, com dados reais e verificáveis de Mato Grosso, o fluxo:

> fonte → ingestão → validação → armazenamento → consulta geográfica → mapa

Requisitos que valem desde a primeira publicação:
- custo zero;
- arquitetura simples;
- segurança, integridade e licenciamento preservados;
- expansão nacional possível, sem ser implementada agora.

## 2. As três fontes e o papel de cada uma

As três fontes têm papéis distintos e **não se misturam**. Quantidades de nomes taxonômicos, de ocorrências e de municípios são grandezas diferentes.

| Papel | Fonte | O que fornece | Unidade | Licença | Identificação |
|---|---|---|---|---|---|
| **Referência taxonômica** | Flora e Funga do Brasil — Lista Oficial (JBRJ) | Nomes científicos, status (aceito ou sinônimo), hierarquia, distribuição por UF | **Nomes**: 169.230 no checklist | CC BY 4.0 | Checklist no GBIF, DOI `10.15468/1mtkaw`, versão 393.433 (01/11/2026). DwC-A em `ipt.jbrj.gov.br`, recurso `lista_especies_flora_brasil` |
| **Fonte de ocorrências georreferenciadas** | GBIF | Registros de ocorrência com coordenada, data, coletor e instituição | **Ocorrências**: lote 1 com ~85.843 (seção 3) | Por conjunto de dados: CC0, CC BY ou CC BY-NC | DOI gerado a cada download (ainda não existe; seção 3.3) |
| **Referência territorial** | IBGE — malha municipal | Limites de municípios e da UF | **Municípios**: 142 em MT | Termos do IBGE, a confirmar (pendência P6 do plano) | Edição e ano da malha registrados no lote |

A Flora e Funga **não fornece ocorrências** neste piloto. O GBIF **não é a referência taxonômica**: o nome que ele atribui é preservado como dado recebido. O IBGE **não fornece dados biológicos**.

## 3. Lote 1 do GBIF: origem dos 85.843 registros

### 3.1 Como o número foi obtido

É uma **contagem prévia** feita na API pública de busca do GBIF (`api.gbif.org/v1/occurrence/search`), sem autenticação, em **16/11/2026, às 17:18 UTC**. **Não é um download, não tem DOI** e muda com o tempo, porque as instituições atualizam os dados. O número definitivo é o do download efetivo, registrado no lote.

### 3.2 Filtros

| Filtro | Valor | Motivo |
|---|---|---|
| `gadmGid` | `BRA.12_1` (Mato Grosso; `BRA.11_1` é Mato Grosso do Sul) | Recorte territorial atribuído pelo GBIF. A atribuição de município, feita depois, usa a malha do IBGE |
| `kingdomKey` | `6` (Plantae) | Coerente com a referência taxonômica adotada |
| `basisOfRecord` | `PRESERVED_SPECIMEN` | Exemplar de herbário tombado: verificável |
| `year` | `2000,2026` | Coordenadas mais confiáveis, em geral obtidas por GPS |
| `hasCoordinate` | `true` | Necessário para o mapa |
| `hasGeospatialIssue` | `false` | Exclui coordenadas que o GBIF marcou como problemáticas |
| `occurrenceStatus` | `PRESENT` | Exclui registros de ausência |

O filtro `coordinateUncertaintyInMeters` **não é usado**: o campo raramente vem preenchido, e o filtro excluiria quase tudo.

### 3.3 Composição medida, DOI e licença

| Medida | Valor (16/11/2026, 17:18 UTC) |
|---|---|
| Ocorrências | 85.843 |
| Por licença | CC BY 4.0: 83.732 · CC0 1.0: 1.734 · **CC BY-NC 4.0: 377** |
| Conjuntos de dados | 176 (os 10 maiores somam 57.227) |
| Conjuntos com registros CC BY-NC | **6** (377 registros) |
| País da instituição publicadora | Brasil 80.981 · Reino Unido 2.634 · EUA 2.072 · outros 156 |

**DOI:** o download é solicitado com os filtros acima por uma conta GBIF (pendência P2 do plano). O GBIF gera então um DOI e uma citação, registrados no lote e exibidos na página de fontes.

**Licença do download:** como há registros CC BY-NC, o GBIF atribui CC BY-NC ao download como um todo. **Cada registro mantém a sua licença efetiva** (seção 7).

### 3.4 Critérios de qualidade na carga

| Situação | Tratamento |
|---|---|
| `gbifID` repetido | Rejeitado como duplicata exata, com motivo no relatório |
| Coordenada ausente, (0, 0) ou fora do limite de MT (malha do IBGE, com tolerância de fronteira registrada) | Rejeitado, com motivo |
| Data posterior à data da ingestão | Rejeitado, com motivo |
| Licença fora de {CC0 1.0, CC BY 4.0, CC BY-NC 4.0} ou ausente | Rejeitado, com motivo |
| Nome sem correspondência na Flora e Funga | **Aceito** e marcado "não conciliado"; aparece na interface como tal |
| Alertas do GBIF (`issues`) | **Aceito e sinalizado.** Na medição: `COORDINATE_ROUNDED` 34.256, `RECORDED_DATE_INVALID` 6.309, `TAXON_MATCH_HIGHERRANK` 832. Os alertas ficam visíveis no registro |
| Duplicata provável (mesmo coletor, número e data em instituições diferentes) | Agrupada, nunca excluída. Os originais são preservados |

Rejeitar não apaga: o registro rejeitado fica na tabela de originais, com o motivo.

## 4. Decisão de arquitetura

**Monólito modular Next.js** (o repositório atual) **+ PostgreSQL/PostGIS no Supabase gerenciado.** Não haverá microsserviços, filas, workers dedicados nem agendamentos.

```
Flora e Funga (IPT JBRJ)        GBIF (download com DOI)        IBGE (malha municipal)
  referência taxonômica          ocorrências                     referência territorial
            \                           |                              /
     GitHub Actions — workflow manual (workflow_dispatch), disparado por pessoa
     baixar → SHA-256 → arquivar original → validar → carregar → conciliar → derivar → relatório do lote
                                        │ credencial de escrita: só em GitHub Secrets
                                        ▼
     Supabase Free — PostgreSQL + PostGIS (sa-east-1) + Storage (bucket privado)
     schemas: proveniencia · original · taxonomia · territorio · ocorrencias · protecao · publico
                                        ▲ papel de banco SÓ LEITURA, restrito ao schema `publico`
     Next.js (Vercel Hobby, condicionado — seção 9)
     ├─ páginas: mapa, espécie, município, fontes e licenças, sobre os dados
     └─ /api/mapa/{z}/{x}/{y}: tiles vetoriais por ST_AsMVT, lendo só views de `publico`
     Navegador: MapLibre GL + mapa base OpenFreeMap (atribuição OpenStreetMap)
```

O código fica organizado por módulo: `lib/modulos/{proveniencia,taxonomia,territorio,ocorrencias,protecao,mapa}`, `scripts/ingestao/` e `supabase/migrations/`.

## 5. Modelo de dados

Cada schema corresponde a uma natureza de informação (`types/informacao.ts`). Original, tratado e derivado nunca dividem tabela. Todas as geometrias usam SIRGAS 2000 (EPSG:4674).

### 5.1 `proveniencia` — de onde veio e sob que licença

| Tabela | Conteúdo essencial |
|---|---|
| `fonte` | Fonte: GBIF, Flora e Funga, IBGE, lista de sensíveis. Papel (taxonômica, ocorrências, territorial, proteção), URL, termos de uso |
| `conjunto_dados` | Conjunto de dados de origem: chave do GBIF (`datasetKey`), título, instituição publicadora, país, **licença**, `rights`/`accessRights` verbatim, citação, DOI do conjunto, URL |
| `lote` | Execução de ingestão: fonte, filtros (JSON), DOI e citação do download, data de solicitação e de obtenção, versão do conector, contagens (recebidos, aceitos, rejeitados por motivo, não conciliados, sinalizados, sensíveis), situação (`ok`, `parcial`, `falha`), início e fim |
| `arquivo_original` | Arquivo arquivado: lote, caminho no bucket privado, tamanho, **SHA-256**, tipo. Nunca sobrescrito |
| `revisao_conjunto` | **Decisão humana** sobre um conjunto de dados: revisor, data, condições de uso lidas, forma de atribuição exigida, licença confirmada, decisão (`aprovado`, `rejeitado`, `pendente`) e justificativa |

### 5.2 `original` — como recebido

| Tabela | Conteúdo essencial |
|---|---|
| `ocorrencia_recebida` | Uma linha por registro do download, **incluindo os rejeitados**, com: `gbifID`, `occurrenceID`, `datasetKey`, `institutionCode`, `collectionCode`, `catalogNumber`, `recordedBy`, `recordNumber`, `eventDate` e `year` verbatim, `scientificName` e autor verbatim, `taxonKey` do GBIF, `verbatimLocality`, `municipality` e `stateProvince` verbatim, `decimalLatitude`/`decimalLongitude` verbatim, `coordinateUncertaintyInMeters`, `georeferenceRemarks`, `dataGeneralizations`, `informationWithheld`, `license`, `rights`, `issues`. Também o lote e o motivo de rejeição, quando houver |
| `nome_recebido_flora` | Linhas da Flora e Funga como recebidas: `taxonID`, nome, autor, rank, status, `acceptedNameUsageID`, hierarquia, distribuição por UF. Mais o lote |
| `municipio_recebido` | Atributos e geometria da malha do IBGE como recebidos, mais o lote |

O arquivo completo (DwC-A ou shapefile) fica no Storage. Esta camada guarda os campos relevantes para auditoria e reprocessamento.

### 5.3 `taxonomia` — nomes e espécies (dado tratado)

| Tabela | Conteúdo essencial |
|---|---|
| `nome_cientifico` | Todo nome da Flora e Funga (aceito ou sinônimo): `taxonID` da Flora e Funga, nome, autor, rank, status, referência ao nome aceito, versão da lista |
| `especie` | Só nomes **aceitos** de rank espécie: nome aceito, família, gênero, versão da lista. É a unidade das páginas de espécie |
| `conciliacao` | Ligação entre o nome recebido do GBIF e o `nome_cientifico`: método (exato, sem autor, via sinônimo), versão da lista, resultado (`conciliado`, `não conciliado`, `ambíguo`), data |

**Espécie, nome e ocorrência são entidades diferentes.** Uma espécie tem vários nomes (sinônimos) e muitas ocorrências. Uma ocorrência aponta para o nome recebido e, quando houver, para a espécie conciliada.

### 5.4 `territorio` — referência territorial (dado tratado)

| Tabela | Conteúdo essencial |
|---|---|
| `uf` | Código IBGE, sigla, geometria, edição da malha |
| `municipio` | **Código IBGE de 7 dígitos** (chave), nome, UF, geometria, geometria simplificada para o mapa, edição da malha |

### 5.5 `ocorrencias` — ocorrência tratada (protegida)

| Tabela | Conteúdo essencial |
|---|---|
| `ocorrencia` | Chave natural (fonte, `gbifID`); referência à linha em `original`; conjunto de dados; lote; nome recebido; espécie conciliada (opcional); data padronizada; **geometria precisa** (EPSG:4674); incerteza; **licença efetiva** (seção 7); alertas; `primeira_vez_visto`, `ultima_vez_visto`, `removido_na_fonte` |
| `ocorrencia_municipio` | **Derivado:** município atribuído pela malha do IBGE (`ST_Intersects`), com método, edição da malha e data |

### 5.6 `protecao` — política de sensíveis

| Tabela | Conteúdo essencial |
|---|---|
| `lista_referencia` | Lista oficial usada, por exemplo a de espécies ameaçadas da flora: ato normativo, data, fonte, hash do arquivo, lote |
| `taxon_sensivel` | Espécie, lista, categoria, nível de generalização exigido |
| `politica` | Versão da política, parâmetros (tamanho da grade, níveis), **estado (`provisória` ou `validada`)**, quem validou e quando |

### 5.7 `publico` — a única camada que o site lê

Só **views** (materializadas quando necessário), **sem nenhuma coluna de coordenada precisa**:

| View | Conteúdo |
|---|---|
| `ocorrencia_publica` | Ocorrência com **geometria generalizada** (seção 6), espécie ou nome recebido, município, conjunto de dados, licença efetiva, alertas, link de origem, lote |
| `especie_publica`, `municipio_publico` | Dados para as páginas de espécie e município |
| `contagem_*` | **Derivado:** contagens por espécie, município e conjunto de dados, com método e data |
| `fonte_publica` | Fontes, conjuntos de dados aprovados, licenças, citações e DOI |

Registros de conjuntos sem `revisao_conjunto` aprovada **não entram** nas views públicas.

### 5.8 Identificadores preservados

| Origem | Identificadores |
|---|---|
| GBIF | `gbifID`, `occurrenceID`, `datasetKey`, `institutionCode`, `collectionCode`, `catalogNumber`, `taxonKey` e o DOI do download |
| Flora e Funga | `taxonID` e o DOI do checklist com a versão |
| IBGE | Código de 7 dígitos e edição da malha |

Também ficam registrados o SHA-256 de cada arquivo e o identificador do lote.

## 6. Proteção de coordenadas sensíveis — obrigatória desde a primeira publicação

1. **Coordenadas precisas nunca são publicadas.** Elas só existem em `original` e `ocorrencias`, schemas sem nenhuma permissão para o papel de leitura do site e sem acesso anônimo. Nem a API de tiles nem qualquer view de `publico` as contêm.
2. **A camada pública só apresenta geometria generalizada**, calculada dentro do banco na criação das views.
3. **Estado inicial obrigatório: generalização conservadora para todas as ocorrências.** Enquanto a política estiver `provisória`, toda ocorrência pública aparece como a **célula de uma grade de 0,1° (cerca de 11 km)** que a contém, e nunca como ponto. Isso vale também se a lista oficial de sensíveis não estiver disponível ou falhar ao carregar. O tamanho da grade é parâmetro da política, proposto aqui e a validar pelo proprietário.
4. **Depois da validação da política** (registrada em `protecao.politica`, com responsável e data):
   - táxons da lista oficial, e registros com `dataGeneralizations` ou `informationWithheld` na origem, continuam generalizados, agregados por município ou pela regra validada;
   - os demais podem passar à precisão que a política validada definir.
5. **A generalização feita pela fonte é sempre respeitada** e nunca revertida.
6. **Testes automatizados que bloqueiam a publicação:**
   - nenhuma coluna de `publico` expõe coordenada precisa;
   - com a política `provisória`, toda geometria pública coincide com uma célula da grade;
   - nenhum táxon sensível aparece com precisão maior que a permitida;
   - o papel de leitura não consegue consultar `original` nem `ocorrencias`.

## 7. Licenças e revisão humana, inclusive CC BY-NC

1. **Licença efetiva** de cada registro = a mais restritiva entre a licença do registro e a do conjunto de dados.
2. **Revisão humana obrigatória para todo conjunto de dados com registros CC BY-NC.** No lote 1 são 6 conjuntos e 377 registros. A revisão, registrada em `proveniencia.revisao_conjunto`, confere:
   - licença declarada e texto de direitos (`rights`/`accessRights`);
   - termos adicionais do publicador ou da instituição;
   - forma de atribuição exigida;
   - compatibilidade com o uso demonstrativo.
3. **A finalidade não comercial não elimina outras restrições.** Exigência de atribuição específica, proibição de redistribuição de imagens, embargo ou qualquer outro termo prevalece. Conjunto com condição incompatível é rejeitado, com justificativa.
4. **Conjuntos CC0 e CC BY** passam por verificação automática de `rights`/`accessRights`. Os que tiverem texto adicional também vão para revisão humana. Os demais são aprovados com registro automático da conferência.
5. **Sem revisão aprovada, o conjunto não é publicado.**
6. **Atribuição:**
   - cada registro exibe conjunto de dados, instituição, licença e link de origem;
   - a página de fontes lista todos os conjuntos publicados, com citação e licença, e a citação com DOI do download;
   - conteúdo CC BY-NC é identificado como de uso não comercial.
7. Se a finalidade do projeto mudar, os registros CC BY-NC são revistos antes de qualquer outro uso.

## 8. Supabase Free: limitações e mitigações

| Limitação (fontes secundárias; conferir em `supabase.com/pricing` ao criar o projeto) | Efeito no piloto | Mitigação |
|---|---|---|
| **500 MB de banco**; acima disso, o banco fica só de leitura | Limita o volume de dados | Lote 1 e lista taxonômica estimados em 150 a 250 MB, **a medir**. A ingestão calcula o tamanho projetado e **recusa o lote acima de 400 MB** |
| 1 GB de Storage | Limita os arquivos originais | Guardar só os arquivos do piloto, com tamanho registrado no lote |
| **Pausa após 7 dias sem atividade** | O site fica sem dados até a reativação | Reativar manualmente e conferir antes de cada apresentação. **Não haverá acesso automático só para evitar a pausa** |
| **Sem backup automático** | Risco de perda | **Backup e teste de restauração obrigatórios antes da apresentação** (abaixo) |
| 2 projetos ativos | Sem espaço para ambientes extras | A CI usa banco **local** (Supabase CLI ou Postgres com PostGIS no runner), não um segundo projeto |

**Backup e restauração (critério de conclusão do piloto):**
1. `pg_dump` completo do banco publicado, guardado fora do repositório, em local escolhido pelo proprietário, com SHA-256 registrado.
2. **Teste de restauração** do dump num PostgreSQL/PostGIS local:
   - conferir as contagens por tabela;
   - conferir que as views públicas respondem;
   - rodar os testes de proteção de sensíveis sobre o banco restaurado.
3. **Reconstrução comprovada:** migrações mais arquivos originais, com SHA-256 conferido, reproduzem o banco. Os originais ficam no Storage e numa cópia local do proprietário.
4. Registro do backup e do teste no relatório da etapa.

## 9. Vercel Hobby: opção condicionada

- Pelas regras da Vercel, o Hobby é restrito a **uso pessoal e não comercial**. A Vercel orienta consultar o suporte em caso de dúvida.
- **Condição para usar o Hobby:** antes da publicação da Fase 11, o proprietário confirma que a forma de publicação atende a esses termos. O piloto é pessoal e não comercial, sem anúncios, cobrança ou serviço a cliente.
- **Publicação institucional:** se o piloto for publicado ou apresentado como serviço de uma instituição, **é preciso consultar a Vercel antes** de usar o Hobby e registrar a resposta.
- Se o Hobby não for adequado, a alternativa é um plano pago da Vercel ou outra hospedagem compatível com Next.js. A arquitetura não muda.

## 10. Segurança

- **RLS** habilitado em toda tabela, com teste automatizado.
- **Papel do site:**
  - o site usa um **papel de banco só de leitura**, com permissão apenas no schema `publico`;
  - a senha fica só em variável de servidor da Vercel, nunca `NEXT_PUBLIC_`;
  - a chave secreta do Supabase **não** vai para a Vercel.
- **Credencial de escrita:** só em GitHub Secrets, usada pelo workflow manual de ingestão. A conexão usa o *pooler* de sessão do Supabase (a conexão direta pode exigir IPv6; a confirmar).
- **Sem autenticação de usuários no piloto.** Não há login simulado.

## 11. Alternativas consideradas

| Alternativa | Por que não agora |
|---|---|
| Importar os ~2,27 milhões de ocorrências de MT | Não cabe no Supabase Free e não é necessário para demonstrar o fluxo |
| Planos pagos | Projeto não comercial e demonstrativo; os limites gratuitos atendem, com as mitigações das seções 8 e 9 |
| Taxonomia do GBIF como referência | O proprietário definiu a Flora e Funga do Brasil |
| Guardar só o DOI, sem os originais | Insuficiente: a diretriz pede preservar os originais relevantes |
| Pontos precisos para táxons não sensíveis já na primeira publicação | Proibido antes da validação da política (seção 6) |
| Ingestão agendada, workers, microsserviços | Complexidade sem ganho num piloto |

## 12. Consequências

**Positivas**
- Custo zero.
- Fluxo completo com dados reais e citáveis.
- Proveniência, licença e revisão por conjunto de dados.
- Proteção de sensíveis por construção.
- Expansão nacional por parâmetros, sem mudar a arquitetura.

**Negativas e aceitas**
- O piloto mostra só flora, e só exemplares de herbário a partir de 2000. Isso não representa toda a biodiversidade de MT e precisa estar dito na interface.
- Até a validação da política, o mapa mostra células de grade, não pontos.
- Pausa por inatividade no Supabase Free.
- Hobby condicionado aos termos da Vercel.

## 13. Adendo 1 — decisões da implementação (Fases 11.1 e 11.2)

Data: 16/11/2026. Aprovado pelo proprietário na autorização da Fase 11.2. **Prevalece** sobre as seções 4 e 5 nos pontos abaixo; o restante do ADR continua válido.

### 13.1 Dois schemas em vez de sete

| Antes (seção 5) | Agora |
|---|---|
| Sete schemas: `proveniencia`, `original`, `taxonomia`, `territorio`, `ocorrencias`, `protecao`, `publico` | **Dois:** `protegido` (todas as tabelas) e `publico` (só views) |

**Justificativa**
- **A fronteira que importa para a segurança é uma só:** o que o site pode ler e o que ele não pode. Os sete schemas não acrescentavam nenhuma barreira de acesso, porque nenhum papel da aplicação lê qualquer um dos seis schemas internos.
- **Rastreabilidade preservada:**
  - a natureza da informação continua separada por **tabela**;
  - cada tabela declara a sua natureza no comentário (dado original, tratado, derivado, proveniência ou decisão humana);
  - um teste automatizado falha se alguma tabela não declarar.
- **Menos risco de configuração:**
  - `GRANT`s, RLS e exposição na Data API do Supabase passam a valer para 2 schemas, e não para 7;
  - RLS sem políticas em todas as tabelas de `protegido`: um `GRANT` indevido não expõe linhas, e há teste disso.
- **Evolução:** separar schemas no futuro, se necessário, é uma migração mecânica (`alter table … set schema`), sem efeito nas views públicas.

O modelo lógico da seção 5 (entidades, identificadores, imutabilidade dos originais, revisão de conjuntos, proteção) foi mantido. Detalhes em `supabase/README.md`.

### 13.2 GeoJSON de células agregadas em vez de MVT

- O mapa do piloto usa **GeoJSON** com as **células de 0,1° agregadas** (contagens por célula), servido a partir das views de `publico`. Não usa tiles vetoriais (`ST_AsMVT`).
- **Motivos:**
  - com a generalização conservadora, o lote 1 (cerca de 86 mil ocorrências) cabe em poucos milhares de células, um volume pequeno para GeoJSON;
  - é mais simples e funciona no banco local (o PGlite não tem `ST_AsMVT`);
  - reduz o prazo.
- MVT continua sendo opção futura se o volume exigir.

### 13.3 Banco local e de testes: PGlite

- **Ferramenta:** desenvolvimento e CI usam PGlite 0.5.16 (PostgreSQL 18.6) com `pglite-postgis` 0.2.16 (PostGIS 3.6.2), sem Docker nem serviço externo. As migrações seguem compatíveis com PostgreSQL 15 ou superior (Supabase).
- **Limitação 1 — tiles vetoriais:** não há `ST_AsMVT`, porque o build não tem `protobuf-c`. Não afeta o piloto (seção 13.2).
- **Limitação 2 — operações pesadas:**
  - **com multipolígonos muito grandes**, como a união dos 142 municípios de MT, que tem cerca de 784 mil vértices, `ST_Difference` **devolve zero linhas sem erro** e deixa a instância inutilizável;
  - é um efeito do PostGIS em WebAssembly de 32 bits;
  - as validações territoriais usam verificações por área, com resultado equivalente, e exigem que toda consulta de validação devolva exatamente uma linha;
  - **regra:** não usar `ST_Difference`/`ST_Intersection` entre geometrias completas no PGlite.

### 13.4 Referência territorial adotada

- **Fonte:** IBGE, Malha Municipal Digital, **edição 2025**, recorte de Mato Grosso:
  - arquivos `MT_Municipios_2025.zip` e `MT_UF_2025.zip`, em `geoftp.ibge.gov.br`;
  - SIRGAS 2000;
  - SHA-256 no manifesto `dados/referencias/ibge-malha-municipal-2025.json`.
- **Condições de uso:** segundo o `LEIA-ME.txt` dos arquivos, o uso é condicionado à Nota Metodológica do IBGE "Informações técnicas e legais para a utilização dos dados publicados" (versão 2025). **A nota não foi lida** (o portal recusou o acesso automatizado). A publicação dos limites municipais depende da leitura dela pelo proprietário.

## 14. Adendo 2 — referências taxonômicas, fauna, lotes do GBIF e termos territoriais (Fase 11.3)

Data: 16/11/2026. Decisões aprovadas pelo proprietário na autorização da Fase 11.3. **Prevalece** sobre as seções 2, 3 e 13.4 nos pontos abaixo.

### 14.1 Fauna incluída, com referência taxonômica provisória

| Grupo | Referência | Natureza |
|---|---|---|
| Plantas, algas e fungos | Flora e Funga do Brasil — Lista Oficial (JBRJ), v393.433, DOI `10.15468/1mtkaw`, CC BY 4.0 | Referência oficial brasileira |
| Fauna e demais grupos | Classificação atribuída pelo GBIF às ocorrências: GBIF Backbone Taxonomy (2023-08-28), DOI `10.15468/39omei`, CC BY 4.0 | **Referência provisória.** Não é o catálogo taxonômico oficial brasileiro. O aviso fica gravado em `fonte.nota_publica` e é exibido na ficha da espécie |

- **Plantas e fungos:** a ocorrência é conciliada com a Flora e Funga pelo nome canônico do GBIF e, se não houver correspondência, pelo nome verbatim. Sem correspondência, fica "não conciliado"; nome com mais de uma espécie possível fica "ambíguo".
- **Fauna:** a espécie é criada a partir do `speciesKey` do GBIF, num lote próprio (fonte `gbif-taxonomia`). Registros identificados só até gênero ficam "não conciliados".

### 14.2 Lotes de ocorrências do GBIF

Definidos em `dados/referencias/gbif-lotes.json`:
- **flora:** Plantae, exemplares de herbário a partir de 2000, cerca de 85,8 mil registros, 176 conjuntos de dados, 6 deles CC BY-NC;
- **fauna:** Animalia, exemplares de coleções zoológicas a partir de 2000, cerca de 45,8 mil registros, 131 conjuntos, 53 deles CC BY-NC.

Cada lote é um download oficial com DOI, solicitado pela conta do proprietário. A credencial fica só no `.env.local`, ignorado pelo Git.

**Revisão de conjuntos de dados:**
- conferência automática registrada só para CC0 e CC BY sem `rights`/`accessRights` nos registros;
- CC BY-NC ou termos adicionais exigem **revisão humana registrada por conjunto**;
- sem aprovação, o conjunto não aparece.

**`gbifID` repetido** no download recusa a carga inteira, por indicar arquivo corrompido.

### 14.3 Proteção adicional pela categoria IUCN

- A categoria da Lista Vermelha da IUCN informada pelo GBIF (CR, EN, VU) marca a espécie como sensível: ela aparece **só por município**, sem célula, sem data exata e sem link para o registro.
- É uma lista **global**, não a lista oficial brasileira. Por ser mais restritiva que a generalização conservadora, não depende da validação da política (seção 6).

### 14.4 Malha municipal: termos verificados

- **Termos:** a nota metodológica 01/2026 do IBGE ("Malha Municipal Digital e Áreas Territoriais 2025", págs. 5 a 8, `liv102268.pdf`, SHA-256 `bc88c446…`) declara **licença compatível com CC BY 4.0**, com créditos ao IBGE.
- **Avisos obrigatórios:**
  - os limites são aproximados e não constituem demarcação oficial;
  - a simplificação para exibição deve ser informada ao usuário.
- Os avisos ficam em `fonte.nota_publica`. **A pendência da seção 13.4 está resolvida.**

### 14.5 Biomas: pendente

- **Arquivo identificado:** "Biomas e Sistema Costeiro-Marinho do Brasil", compatível com 1:250.000, edição 2025 (`lml_bioma_e250k_v20250911_A`); manifesto em `dados/referencias/ibge-biomas-2025.json`.
- **Termos de uso não localizados.** O pacote não traz LEIA-ME, e o PDF de metadados do diretório é de 2006, na escala 1:5.000.000.
- **A camada não será publicada** até a verificação.

### 14.6 Orçamento de espaço (Supabase Free, 500 MB)

| Parte | Medição no PGlite |
|---|---|
| Taxonomia (Flora e Funga completa, distribuição só de MT, perfil só de espécies aceitas) | **139 MB**, depois de `VACUUM FULL` |
| Malha municipal | Medida junto com o banco local |
| Ocorrências (cerca de 131 mil) | Estimadas em 120 MB, **a medir** depois dos downloads |

Medida tomada na taxonomia: sem índices redundantes por nome.
