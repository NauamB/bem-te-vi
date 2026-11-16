# Relatório da Fase 10D.4 — Testes automatizados versionados e preparação para CI

Data: 16/11/2026. Repositório `~/Downloads/bem-te-vi`. **Sem `git add`, commit, push ou deploy, e sem alterações no GitHub ou na Vercel.** Todos os testes desta fase rodaram **no build de produção local** (`next start` em `127.0.0.1`). A produção (`https://bem-te-vi-zeta.vercel.app`) não foi acessada.

## 1. Objetivo

Cumprir o item 2 das recomendações da Fase 10D.3 (seção 14 de `RELATORIO_FASE_10D_3.md`):

- adicionar o Playwright como dependência de desenvolvimento;
- versionar testes de ponta a ponta das rotas, da 404, de `robots.txt` e `sitemap.xml`, dos metadados, da responsividade nas 7 larguras e do foco do menu (Esc, âncora e troca de página);
- criar uma CI no GitHub Actions com lint, `decoracao:verificar`, build e testes.

Os demais itens daquela seção (CSP em modo só relatório, `experimental.sri`, cache dos SVG na Vercel) **não fazem parte desta fase** e não foram tocados.

## 2. Diagnóstico inicial

| Item | Situação encontrada |
|---|---|
| Branch / HEAD | `main` / `2874341` ("feat: aprimora acessibilidade, desempenho e SEO do Bem-te-vi") |
| Alterações preexistentes | `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md`, não rastreado. **Preservado sem alteração** |
| Execução anterior | Interrompida durante o `npm ci`. A primeira tentativa falhou porque `lightningcss.win32-x64-msvc.node` estava em uso; a segunda foi interrompida pelo limite da conta |
| `node_modules` | Instalação incompleta: sem `node_modules/.bin`, sem `react` e `react-dom`, com `next` e `typescript` inválidos e vários pacotes sobrando (`npm ls` com erros) |
| Processos Node ativos | Nenhum. O bloqueio do arquivo não existia mais |
| Arquivos da fase | Já criados e completos: testes, configuração do Playwright, workflow, `.nvmrc`, alterações em `package.json` e `.gitignore`. Nada foi refeito |

**Ação:** um novo `npm ci`, concluído sem erros. Nenhum arquivo foi descartado ou reescrito.

## 3. Ferramentas e versões

| Ferramenta | Versão |
|---|---|
| Sistema local | Windows 11 Pro 10.0.26300 |
| Node.js / npm | 26.13.0 / 11.20.0 |
| Next.js | 16.4.6 |
| React / React DOM | 19.3.0 / 19.3.0 |
| TypeScript | 5.9.3 |
| ESLint | 9.39.5 (`eslint-config-next` 16.4.6) |
| Tailwind CSS | 4.3.3 |
| `@playwright/test` | 1.65.0 (versão exata, sem `^`) |
| Chromium do Playwright | 158.0.8127.18 |

## 4. Arquivos criados e modificados

**Modificados (3)**
- `package.json`:
  - `@playwright/test` 1.65.0 em `devDependencies`;
  - scripts `test:e2e` (build e testes), `test:e2e:report` e `test:e2e:instalar`;
  - `"engines": { "node": "26.x" }`.
- `package-lock.json`: 115 linhas adicionadas, nenhuma removida (seção 9).
- `.gitignore`: ignora os resultados temporários do Playwright (`/test-results/`, `/playwright-report/`, `/blob-report/`, `/playwright/.cache/`).

**Criados**
- `.nvmrc`: `26`.
- `playwright.config.ts`.
- `.github/workflows/ci.yml`.
- `tests/support/fixtures.ts` e `tests/support/larguras.ts`.
- `tests/e2e/`: `acesso`, `apresentacao`, `menu-movel`, `nao-encontrado`, `navegacao`, `responsividade`, `seguranca`, `seo` e `teclado` (todos `.spec.ts`).
- `docs/RELATORIO_FASE_10D_4.md` (este relatório).

**Código da aplicação:** nenhuma alteração. `git diff HEAD -- app components lib next.config.ts` está vazio.

## 5. Testes implementados (61 em 9 arquivos)

| Arquivo | Testes | O que valida |
|---|---|---|
| `responsividade.spec.ts` | 21 | 7 larguras × 3 rotas (seção 7) |
| `navegacao.spec.ts` | 8 | Cabeçalho, marca, hero, âncoras, rodapé, histórico, retornos de Explorar e de Acesso |
| `apresentacao.spec.ts` | 6 | Título, H1, seções, destinos dos botões, avisos institucionais, ausência de números ambientais inventados, decoração local sem imagens raster |
| `menu-movel.spec.ts` | 6 | Estado inicial, `aria-expanded`, Esc devolve o foco, âncora leva o foco à seção, troca de página e troca de layout levam o foco ao `main` |
| `teclado.spec.ts` | 6 | Ordem de Tab com foco visível (1366 px e 390 px), link "Ir para o conteúdo", Shift+Tab, menu por teclado sem armadilha de foco, Tab e Enter na 404 |
| `acesso.spec.ts` | 4 | "Em construção" sem formulário nem senha simulada, autenticação "Não configurada", nenhuma requisição externa, `noindex` (meta e `X-Robots-Tag`) |
| `seo.spec.ts` | 4 | Metadados e Open Graph, `robots.txt`, `sitemap.xml` só com páginas públicas existentes |
| `nao-encontrado.spec.ts` | 3 | 404 real com título próprio e uma única meta `robots`, retorno ao início, outros caminhos inexistentes |
| `seguranca.spec.ts` | 3 | Cabeçalhos de segurança (inclusive na 404), arquivos sensíveis não servidos, scripts sem mapas de código e sem padrões de credenciais |

**Proteção comum (`tests/support/fixtures.ts`):** todo teste que abre páginas falha se houver erro de JavaScript, `console.error`, requisição com falha ou resposta HTTP ≥ 400 inesperada. Há duas exceções documentadas no próprio arquivo:
- as 404 que são o objeto do teste;
- `net::ERR_ABORTED`, que vem de pré-carregamentos cancelados pelo Next.js.

### 5.1 Revisão final dos testes

| Critério | Resultado |
|---|---|
| Testes temporários | Nenhum. O diagnóstico usado na retomada (seção 6.2) foi apagado; `tests/e2e/` tem só os 9 arquivos da fase |
| `test.skip`, `test.only`, `fixme`, `fail` | Nenhum. Em CI, `forbidOnly` bloquearia um `only` |
| Esperas fixas (`waitForTimeout`) e `console.log` | Nenhum |
| Contagem | `playwright test --list`: 61 testes em 9 arquivos |
| Seletores | Por papel e nome acessível (`getByRole`) ou por atributos reais (`aria-controls`, `aria-labelledby`, `id`). Os localizadores são estritos: um seletor ambíguo falha em vez de passar por engano, como aconteceu na seção 6.2 |
| Falsos positivos | Nenhum encontrado. As listas de medições terminam em `toEqual([])` e mostram o elemento problemático em caso de falha. Os números permitidos na página inicial estão listados e justificados em `fixtures.ts` |
| Serviços externos | Nenhum. Os testes só acessam `http://127.0.0.1:3200`. O endereço `https://bem-te-vi-zeta.vercel.app` aparece só como texto esperado no `sitemap.xml`, sem requisição. Dois testes (`acesso` e `apresentacao`) falham se houver qualquer requisição fora de `127.0.0.1` |
| Supabase | Os testes rodam sem variáveis de ambiente do Supabase e esperam "Não configurada". Nenhuma credencial foi criada ou usada |

## 6. Resultados das execuções

### 6.1 Verificações

| Verificação | Resultado |
|---|---|
| `npm ci` | 360 pacotes adicionados, 361 auditados |
| `npm ls --depth=0` | Sem erros |
| `npm audit` | 7 vulnerabilidades moderadas de desenvolvimento, as mesmas da 10D.3. Nenhuma nova |
| `npm run lint` | Sem erros nem avisos |
| `npx tsc --noEmit` | Sem erros |
| `npm run decoracao:verificar` | `ok` nos 3 SVG |
| `npm run build` | Aprovado, com 7 rotas estáticas: `/`, `/_not-found`, `/acesso`, `/explorar`, `/icon.svg`, `/robots.txt`, `/sitemap.xml` |
| `npx playwright install chromium` | Concluído |
| `npx playwright test` (1ª execução) | 60 aprovados e 1 reprovado (seção 6.2) |
| `npx playwright test` (depois do ajuste) | **61 de 61 aprovados** |
| `CI=true npx playwright test` (simula a CI: 2 workers, 1 nova tentativa, `forbidOnly`, relatório `github`) | **61 de 61 aprovados**, sem novas tentativas |
| `--repeat-each=3` em `menu-movel` e `teclado` | **36 de 36 aprovados** |

### 6.2 Falha na 1ª execução: dois `main#conteudo` na troca de layout

O teste "ir ao acesso interno (outro layout) leva o foco ao conteúdo principal" falhou por violação do modo estrito: `main#conteudo` correspondia a 2 elementos.

**Comportamento observado (diagnóstico com 3 s de espera depois da navegação):**
- ao navegar de `/` (layout `(publico)`) para `/acesso` (layout `(interno)`), o Next.js 16 **mantém no DOM a árvore da rota anterior, oculta com `display: none`**, e com ela o `main id="conteudo"` do outro layout;
- o `main` visível é o **primeiro** no documento, então `document.getElementById("conteudo")` devolve o visível;
- o foco foi para o `main` visível, como esperado;
- na volta (`/acesso` → `/`), a situação se inverte e continua correta: o `main` visível vem primeiro e o oculto fica depois;
- entre rotas do mesmo layout (`/` → `/explorar`) há um único `main`, porque o layout é compartilhado.

**Classificação:** comportamento do framework observado, **não um defeito funcional confirmado**.
- Foco, link "Ir para o conteúdo" e navegação funcionam.
- O `main` oculto não aparece na árvore de acessibilidade: `getByRole("main")` encontra só um.
- Ponto de atenção: enquanto a rota anterior está preservada, existem dois elementos com o mesmo `id`, o que formalmente não é HTML válido. Fica como observação para acompanhar, sem correção no código da aplicação.

**Ajuste, restrito ao teste** (`tests/e2e/menu-movel.spec.ts`, último teste):
- o seletor passou a ser `main#conteudo:visible`;
- foi adicionada a verificação de que o primeiro `main#conteudo` do documento é o visível;
- um comentário explica o motivo.

`:visible` não aparece em nenhum outro teste nem no código da aplicação.

## 7. Validação de responsividade

`responsividade.spec.ts` cobre **as 7 larguras do projeto** (360, 390, 430, 768, 1024, 1366 e 1920 px, com 900 px de altura) nas 3 rotas (`/`, `/explorar`, `/acesso`): 21 testes, todos aprovados. Abaixo de 768 px, o teste usa viewport móvel e toque.

Cada teste verifica:
- ausência de rolagem horizontal;
- nenhum elemento fora da tela (exceto `position: fixed`);
- nenhum texto cortado por `overflow`;
- nenhuma sobreposição de mais de 4 px entre blocos de texto e controles;
- alvos interativos com pelo menos 44 px de altura e 24 px de largura;
- troca do cabeçalho: menu móvel abaixo de 1024 px e navegação completa a partir de 1024 px.

**Limitação:** um único motor (Chromium), com dispositivos emulados.

## 8. Configuração da CI (`.github/workflows/ci.yml`)

Revisão estática:

| Item | Configuração | Avaliação |
|---|---|---|
| Gatilhos | `push` e `pull_request` para `main` | Adequado |
| Permissões | `contents: read`; checkout com `persist-credentials: false` | Mínimas |
| Segredos | Nenhum usado | Adequado |
| Concorrência | `ci-${{ github.ref }}` com `cancel-in-progress` | Adequado. Observação: um push novo em `main` cancela a execução anterior ainda em andamento |
| Ambiente | `ubuntu-latest`, limite de 20 min, `CI=true`, `NEXT_TELEMETRY_DISABLED=1` | Adequado |
| Node | `actions/setup-node` com `node-version-file: .nvmrc` (26), cache do npm | Coerente com `engines` e com o ambiente local |
| Instalação | `npm ci` com o lockfile versionado | Reproduzível |
| Etapas | Lint → `decoracao:verificar` → build → Chromium → testes | Completas |
| Chromium | `npx playwright install --with-deps chromium`, que instala também as bibliotecas do sistema Ubuntu | Adequado. Não verificado no runner |
| Testes | `npx playwright test` sobre o build da etapa anterior (`next start` em `127.0.0.1:3200`, sem reaproveitar servidor) | Sem acesso à produção |
| Artefatos | `upload-artifact` **só com `failure()`**: `playwright-report/` e `test-results/`, retenção de 7 dias | Adequado |
| Publicação e deploy | Nenhum passo de deploy, publicação, release ou escrita no repositório | Confirmado. O deploy continua pela integração Git/Vercel |

**SHAs fixados das Actions** (conferidos com `git ls-remote`, consulta só de leitura):

| Action | Tag | SHA no workflow | SHA da tag no GitHub |
|---|---|---|---|
| `actions/checkout` | v7.0.1 | `3d3c42e5aac5ba805825da76410c181273ba90b1` | idêntico |
| `actions/setup-node` | v7.1.0 | `949feb2413d6458794dcd2491c4babbbce0c15c1` | idêntico |
| `actions/upload-artifact` | v7.0.2 | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` | idêntico |

O YAML foi validado com `js-yaml`: 1 job (`qualidade`) com 9 passos.

**Dependência de rede no build:** `app/layout.tsx` usa `next/font/google`, que baixa as fontes do Google Fonts **durante o build** para embuti-las no app. O navegador não faz requisição externa. O runner do GitHub tem acesso à internet, então isso não deve impedir a CI, mas uma falha do Google Fonts faria o build falhar.

## 9. Revisão do `package-lock.json`

Comparação entre `HEAD` e a cópia de trabalho, entrada por entrada:

| Item | Resultado |
|---|---|
| Linhas | 115 adicionadas, 0 removidas |
| Pacotes | 432 → 441 (+9), nenhum removido |
| Entradas existentes alteradas | **Só a raiz (`""`)**, que agora espelha o `package.json` (`@playwright/test` 1.65.0 e `engines`). **Nenhuma dependência existente mudou de versão** |
| `lockfileVersion` | 3 (inalterado) |

**As 9 entradas novas:**

1. **Playwright (3):**
   - `@playwright/test` 1.65.0 → `playwright` 1.65.0 → `playwright-core` 1.65.0;
   - todas com `resolved` no registro oficial do npm, `integrity` SHA-512, licença Apache-2.0 e `engines.node >= 20`;
   - nenhuma dependência nativa ou específica de plataforma: os navegadores são baixados à parte por `playwright install`;
   - marcadas como `devOptional` (e não só `dev`) porque o `next` 16.4.6 declara `@playwright/test ^1.51.1` como *peer dependency* opcional. A 1.65.0 atende esse intervalo.
2. **`@tailwindcss/oxide-wasm32-wasi` (6):**
   - `@emnapi/core` 1.11.1, `@emnapi/runtime` 1.11.1, `@emnapi/wasi-threads` 1.2.2, `@napi-rs/wasm-runtime` 1.1.4, `@tybys/wasm-util` 0.10.2 e `tslib` 2.8.1, todos sob `node_modules/@tailwindcss/oxide-wasm32-wasi/node_modules/`;
   - **não são dependências novas do projeto.** O pacote `@tailwindcss/oxide-wasm32-wasi` 4.3.3 já estava no lock do `HEAD` com essas 6 bibliotecas declaradas em `bundleDependencies`;
   - as entradas têm `inBundle: true`, sem `resolved` nem `integrity`: vêm dentro do próprio pacote, cuja integridade já está registrada. O npm 11 passou a registrar esse conteúdo ao regravar o lock durante a instalação do Playwright;
   - são `optional` e só se aplicam a `cpu: wasm32`. **Não são instaladas no Windows x64 nem no Ubuntu x64.**

**Compatibilidade entre plataformas:** o lock tem os binários nativos de Linux e de Windows x64.

| Pacote | Linux (glibc) | Windows (msvc) |
|---|---|---|
| `@next/swc` | 16.4.6 | 16.4.6 |
| `lightningcss` | 1.32.0 | 1.32.0 |
| `@tailwindcss/oxide` | 4.3.3 | 4.3.3 |
| `@img/sharp` | 0.35.5 | 0.35.5 |
| `@unrs/resolver-binding` | 1.13.0 | 1.13.0 |

O `npm ci` da CI no Ubuntu deve, portanto, encontrar os binários de que precisa (não verificado no runner).

**Correspondência `package.json` ↔ lock:** confirmada. O `npm ci`, que exige correspondência exata, terminou sem erro, e o `npm ls` não aponta inconsistências.

**`engines.node: "26.x"`:** a Vercel aceita `26.x`, que hoje é a versão padrão dela ([documentação](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [anúncio](https://vercel.com/changelog/node-js-26-lts-is-now-generally-available-on-vercel)). Com esse campo, **o `package.json` passa a ter prioridade sobre a versão do Node escolhida nas configurações do projeto na Vercel**.

**Conclusão:** nenhum problema real encontrado. Nenhuma entrada foi removida e nenhuma versão foi atualizada.

## 10. Limitações

1. **A CI nunca foi executada no GitHub Actions.** O workflow só passou por revisão estática e simulação local do modo CI (`CI=true`) no Windows. O Ubuntu do runner, o `--with-deps` e o cache do npm ainda não foram testados.
2. **Um único motor de navegador** (Chromium), em dispositivos emulados. Sem Firefox, WebKit ou aparelhos físicos.
3. **Sem teste com leitor de tela real.** Os testes de acessibilidade cobrem teclado, foco e papéis ARIA.
4. **Cabeçalho HSTS não testado:** o servidor local usa http; o HSTS é aplicado pela Vercel.
5. **Rota anterior preservada pelo Next.js 16:** dois `main#conteudo` coexistem por um tempo (seção 6.2). Sem defeito funcional comprovado.
6. **`README.md`** ainda diz "Node.js ≥ 20.9 (testado com 26.13.0)" e não descreve os comandos de teste. Não foi alterado nesta etapa.
7. As **7 vulnerabilidades moderadas de desenvolvimento** continuam como na 10D.3.

## 11. Pendências para publicação

1. **Execução real no GitHub Actions:** depende de commit e push autorizados. Até lá, a CI não está validada.
2. Decidir se o `README.md` deve citar `engines` 26.x e os scripts `test:e2e`, `test:e2e:report` e `test:e2e:instalar`.
3. Revisar e definir os arquivos do commit. Sugestão: os 3 modificados, os arquivos novos da seção 4 e, por decisão do proprietário, `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md`.
4. Depois do primeiro deploy com `engines`, conferir na Vercel se o build usou Node 26.x.
5. Seguem em aberto as recomendações 3 a 7 da 10D.3: CSP em modo só relatório, `experimental.sri`, `npm audit` periódico, cache dos SVG e modelagem de dados.

## 12. Confirmação

Nesta fase **não houve** `git add`, commit, push, reset, deploy nem alteração no GitHub ou na Vercel. As únicas consultas externas foram somente leitura: `git ls-remote` nos repositórios das Actions e uma pesquisa na documentação pública da Vercel. `docs/RELATORIO_FASE_10D_3.md` (idêntico ao `HEAD`) e `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md` (não rastreado) não foram modificados.

## 13. Adendo — Fase 10D.4.1 (ajuste documental e auditoria final)

Data: 16/11/2026. Este adendo **substitui** a limitação 6 (seção 10) e a pendência 2 (seção 11), que diziam que o `README.md` não tinha sido alterado. As seções 1 a 12 ficam como registro da 10D.4.

### 13.1 Atualização do README (autorizada)

Só a seção "Requisitos e comandos" e a lista de estrutura mudaram (+22/−3). Identidade, avisos institucionais, rotas, tecnologia, documentação e licença ficaram como estavam.

- **Requisitos:** "Node.js ≥ 20.9" passou a ser **Node.js 26.x** (definido em `.nvmrc` e em `engines`; testado com 26.13.0).
- **Instalação:** `npm install` passou a ser **`npm ci`**.
- **Nova subseção "Testes de ponta a ponta (Playwright)":**
  - `npm run test:e2e:instalar` instala o Chromium;
  - `npm run test:e2e` faz o build e roda a suíte;
  - `npm run test:e2e:report` abre o relatório HTML;
  - os testes rodam contra o servidor local, e os resultados não são versionados.
- **Nova subseção "Integração contínua":** descreve as etapas do `ci.yml` e informa que ele não faz deploy.
- **Estrutura:** entraram `tests/` e `.github/workflows/`.

Todos os comandos citados existem no `package.json`.

### 13.2 Resultados da auditoria final (local)

| Verificação | Resultado |
|---|---|
| Branch / HEAD | `main` / `2874341fb634ecf5cb765681762db48ed980ed12`, igual ao `origin/main` e ao `main` remoto (`git ls-remote`) |
| `npm ls --depth=0` | Sem erros |
| `npm audit` | 7 vulnerabilidades moderadas de desenvolvimento, as mesmas da 10D.3 |
| `package-lock.json` | +115/−0, igual à revisão da seção 9. Nenhuma versão existente alterada |
| `npm run lint`, `npx tsc --noEmit`, `npm run decoracao:verificar` | Aprovados |
| `npm run test:e2e` (o comando documentado no README: build e testes) | Build aprovado; **61 de 61 testes aprovados**, nenhum reprovado ou pulado |
| Workflow | YAML válido; sem alterações desde a revisão da seção 8 |
| Credenciais | Nenhuma nos arquivos do commit. As únicas ocorrências da busca são as expressões de detecção do próprio `tests/e2e/seguranca.spec.ts`. O `.env.local` é ignorado pelo Git |
| `RELATORIO_PUBLICACAO_FASE_10D_3.md` | Lido na íntegra: sem token, e-mail ou caminho pessoal |
| Artefatos locais | `node_modules/`, `.next/`, `test-results/`, `playwright-report/`, `tsconfig.tsbuildinfo` e `next-env.d.ts` são ignorados pelo Git e ficam fora do commit |

### 13.3 Preservação dos relatórios anteriores

| Arquivo | Hash Git (blob) | SHA-256 | Situação |
|---|---|---|---|
| `docs/RELATORIO_FASE_10D_3.md` | `2081e333b0d5054603b112c6b911cdf4d1e96ec3` | `4f7571b1cdda74c0fe106952c7f4240074a1e899db7697d71a9e9bb091f0fa53` | Idêntico ao `HEAD` e ao hash registrado em `RELATORIO_PUBLICACAO_FASE_10D_3.md` |
| `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md` | `c9fcc88734d6197706d07386dabaa324402460bd` | `ef658f13481aa8cea4c46489aac70cf2545171130c2c101ae344f3829aef8238` | Mesmo hash Git observado no início da 10D.4. Não modificado |

Até a 10D.4, o hash de `RELATORIO_PUBLICACAO_FASE_10D_3.md` não estava gravado em nenhum documento: tinha sido informado apenas na conversa da 10D.4. Esta tabela passa a ser o registro.

### 13.4 SHA-256 dos arquivos do commit da Fase 10D.4

Calculados no estado aprovado para o commit. Os arquivos têm finais de linha LF, iguais ao conteúdo que o Git armazena. Este relatório não aparece na tabela, porque não pode conter o próprio hash.

| Arquivo | SHA-256 |
|---|---|
| `.github/workflows/ci.yml` | `b0584987c19fc878aa86230ad0a5264f6f5894f4b53384e449fad6be6364b26c` |
| `.gitignore` | `34a1e8a85238f286fcbf703baac2012b690bd2a55d9c31bded91fe96bfa77257` |
| `.nvmrc` | `20d2add851bf39edcc6b5e830930f962db7e19dffa2cab8610eed551eda6c302` |
| `README.md` | `72801822a4384a6d127756f03bcc4ae62185657777a255275146668189d34421` |
| `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md` | `ef658f13481aa8cea4c46489aac70cf2545171130c2c101ae344f3829aef8238` |
| `package-lock.json` | `dcdd5f9be8800ef76c0ee6872e07ea4b5d86a8a30a0f56bbbbfa9a5f10acb5fd` |
| `package.json` | `5f7353f6a48146a0954091326ce6c6edeb6a4043fcc4d818fa6eb7e017348528` |
| `playwright.config.ts` | `5675ede7702dc3586f3b7f6e3c2dceffc2a2434b31e061e1855547353d86507d` |
| `tests/e2e/acesso.spec.ts` | `c2c45bbe9498ec6e00f7502b219d20a922e8751302115f3d2993ac218dad58d6` |
| `tests/e2e/apresentacao.spec.ts` | `52305386f940e98b5030b25398f891bad15f153ffd610e6a11108d25f85433a7` |
| `tests/e2e/menu-movel.spec.ts` | `5a7af86e64ae1447afd0ba7ac12368ec698ec51aadf8c9fc6a2e2a03ec3c30c1` |
| `tests/e2e/nao-encontrado.spec.ts` | `59c2ee17a8a78520c809dc94e7081db96362469e78f942d7e8af0d12c993bd6f` |
| `tests/e2e/navegacao.spec.ts` | `b02ea16ecb3900b20a49af660ebfd63642da1c87ca87e4388d046822bfc0e372` |
| `tests/e2e/responsividade.spec.ts` | `54c0f9940f24451cd6bbf2814c9fb586d1849d1ea4c24a1f7c4b1a27072a3485` |
| `tests/e2e/seguranca.spec.ts` | `c0fee25f0d1c776a26df39a6fb3ffed600f09c75fca0e6c1905f13d2a21c07c8` |
| `tests/e2e/seo.spec.ts` | `0a00284e722c78ffa70fda7e0fc8a86bbb73f90699da2b2b18f36b3730a7b24c` |
| `tests/e2e/teclado.spec.ts` | `4715a6391796d867478133dca10958c47a8fd360f07cd2a7c242c14db35ec484` |
| `tests/support/fixtures.ts` | `70f42b9a04df65a936a785e12d6f6b60a33e7c39a6f281b0f7c427b3748fe71d` |
| `tests/support/larguras.ts` | `ed8e41357b397f80489db27afec824cbab0c04e3c7396816744a95cef9ca6959` |

### 13.5 Limitações e pendências restantes

1. **A CI ainda não foi executada no GitHub Actions.** A primeira execução real depende do push (Fase 10D.4.3).
2. **A versão do Node usada pela Vercel** com `engines: 26.x` ainda não foi confirmada; a confirmação depende do deploy.
3. Continuam valendo as limitações 2 a 5 e 7 da seção 10: um único motor de navegador, sem leitor de tela real, HSTS não testado localmente, rota anterior preservada pelo Next.js 16 e vulnerabilidades moderadas de desenvolvimento.
