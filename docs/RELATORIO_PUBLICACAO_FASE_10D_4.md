# Relatório de publicação — Fase 10D.4 (execução 10D.4.3)

Publicação autorizada dos testes de ponta a ponta e da integração contínua da Fase 10D.4: commit, push, primeira execução real do GitHub Actions, deploy automático pela Vercel e validação espaçada da produção.

**Este relatório foi redigido sem commit, para revisão.** Depois da revisão, foi publicado num commit documental exclusivo (`docs: registra a publicação da fase 10D.4`). As seções 11 e 12 descrevem o estado ao fim da execução 10D.4.3, antes desse commit.

## 1. Data e horário

16/11/2026 (horário local −04:00; UTC entre parênteses).

| Evento | Horário |
|---|---|
| Push | 12:48:59 (16:48:59Z) |
| GitHub Actions, execução nº 1 | 16:49:07Z → 16:51:05Z (1 min 58 s) |
| Vercel: `pending` (implantando) | 16:49:04Z |
| Vercel: `success` (implantação concluída) | 16:49:22Z |
| Validação da produção | 16:52:09Z → 16:52:43Z, mais o redirecionamento HTTP |

## 2. Auditoria antes do staging

| Item | Resultado |
|---|---|
| Branch / HEAD inicial | `main` / `2874341fb634ecf5cb765681762db48ed980ed12`, igual ao `origin/main` e ao `main` remoto (`git ls-remote`) |
| Identidade | `user.name = NauamB`, com o e-mail já autorizado configurado só neste repositório. A configuração global não tem e-mail e **não foi alterada** |
| Arquivos no estado de trabalho | Os 20 revisados na 10D.4.1. Nenhum arquivo inesperado |
| Adendo ao `RELATORIO_FASE_10D_4.md` | Seção 13 (10D.4.1): README, auditoria, hashes, limitações |
| `RELATORIO_FASE_10D_3.md` | Idêntico ao `HEAD` (SHA-256 `4f7571b1cdda74c0…`) |
| `RELATORIO_PUBLICACAO_FASE_10D_3.md` | Hash Git `c9fcc887…` e SHA-256 `ef658f13481aa8ce…`, sem alteração |
| Credenciais | Nenhuma (a busca só encontrou as expressões de detecção de `tests/e2e/seguranca.spec.ts`) |
| SEMA LabFlow | Não acessado |

## 3. Staging, revisão e commit

**Staging explícito** dos 20 arquivos, sem `git add .`. Ficaram 20 no staging e nenhum arquivo fora dele.

| Grupo | Arquivos |
|---|---|
| Modificados (4) | `.gitignore`, `README.md`, `package.json`, `package-lock.json` |
| Configuração e CI (3) | `.nvmrc`, `.github/workflows/ci.yml`, `playwright.config.ts` |
| Testes (11) | `tests/support/fixtures.ts`, `tests/support/larguras.ts`, `tests/e2e/{acesso,apresentacao,menu-movel,nao-encontrado,navegacao,responsividade,seguranca,seo,teclado}.spec.ts` |
| Relatórios (2) | `docs/RELATORIO_FASE_10D_4.md`, `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md` |

**Revisão do que foi preparado:**
- O SHA-256 de cada um dos 20 arquivos preparados é idêntico ao do arquivo auditado (tabela da seção 13.4 de `RELATORIO_FASE_10D_4.md`).
- O diff preparado não tem credenciais, e-mail nem caminho pessoal.
- Nenhum destes itens entrou: `.env*`, `node_modules/`, `.next/`, `test-results/`, `playwright-report/`, caches, `tsconfig.tsbuildinfo`, `next-env.d.ts`.
- O código da aplicação (`app/`, `components/`, `lib/`, `next.config.ts`) não mudou.

**Commit:**

| Campo | Valor |
|---|---|
| Hash | **`194341ec15055eb1cb0a4fd72564aac529c83aeb`** |
| Mensagem | `feat: adiciona testes E2E e integração contínua` (mais a linha de coautoria da IA) |
| Autor | `NauamB` |
| Pai | `2874341fb634ecf5cb765681762db48ed980ed12` |
| Conteúdo | 20 arquivos, +1366/−3 |
| Código de saída | 0 |

## 4. Push

`git push origin main` (normal, sem force, reset ou rebase):

```
To https://github.com/NauamB/bem-te-vi.git
   2874341..194341e  main -> main
```

**Código de saída 0.** HEAD local, `origin/main` e `main` remoto (`git ls-remote`) estão todos em `194341ec15055eb1cb0a4fd72564aac529c83aeb`.

## 5. GitHub Actions: primeira execução real

Acompanhada pela API pública do GitHub (`/actions/runs?head_sha=…`, consultas a cada 45 s, sem autenticação).

| Campo | Valor |
|---|---|
| Workflow | `CI` (`.github/workflows/ci.yml`) |
| Execução | **`43911666610`**, nº 1, tentativa 1 |
| URL | https://github.com/NauamB/bem-te-vi/actions/runs/43911666610 |
| Evento / commit | `push` em `main` / `194341ec15055eb1cb0a4fd72564aac529c83aeb` |
| Job | `133454898295`, "Lint, build e testes", no runner `ubuntu-latest` |
| Resultado | **`success`**, sem nova tentativa |

| # | Etapa | Resultado | Duração |
|---|---|---|---|
| 1 | Set up job | success | 0 s |
| 2 | Checkout (`actions/checkout@3d3c42e…`, v7.0.1) | success | 1 s |
| 3 | Node.js (`actions/setup-node@949feb2…`, v7.1.0, `.nvmrc` = 26) | success | 6 s |
| 4 | Instalar dependências (`npm ci`) | success | 43 s |
| 5 | Lint | success | 2 s |
| 6 | Verificar decorações (SVG gerados) | success | 0 s |
| 7 | Build de produção | success | 6 s |
| 8 | Instalar Chromium do Playwright (`--with-deps`, com as bibliotecas do Ubuntu) | success | 32 s |
| 9 | Testes de ponta a ponta | success | 16 s |
| 10 | Publicar relatório e rastros da falha | **skipped** (só roda quando algo falha) | — |

**Testes na CI**, pela anotação "🎭 Playwright Run Summary" do próprio job: **`61 passed (14.8s)`**. Nenhum reprovado, instável (*flaky*) ou pulado. A cobertura é a mesma da execução local: 61 testes em 9 arquivos.

**Aviso do GitHub (não é erro):** "The ubuntu-latest label will migrate to Ubuntu 26 beginning October 19, 2026". O rótulo `ubuntu-latest` está migrando para o Ubuntu 26, então execuções futuras podem rodar numa imagem diferente.

**Nenhuma correção foi necessária:** a CI passou na primeira execução, sem commit adicional.

## 6. Implantação na Vercel

- **Mecanismo:** a integração Git/Vercel que já estava configurada. Não usei CLI, token nem configuração nova; Firewall, variáveis de ambiente e proteção contra bots não foram tocados.
- **Status publicado pela Vercel no commit `194341e`** (API pública do GitHub, `/commits/194341e…/status`, contexto `Vercel`):
  - consulta às 12:49:14 local (16:49:14Z): `pending — Vercel is deploying your app` (criado às 16:49:04Z);
  - consulta às 12:51:47 local (16:51:47Z): **`success — Deployment has completed`** (16:49:22Z);
  - identificador da implantação: `6kHynFUsaxFSHEn9bf86cBWLHjWS` (URL do painel: `https://vercel.com/nauam1/bem-te-vi/6kHynFUsaxFSHEn9bf86cBWLHjWS`, que exige login).
- **Domínio de produção e nova versão:** **a correspondência é indireta.** Este commit não altera o código da aplicação, então o conteúdo servido em `bem-te-vi-zeta.vercel.app` é, por construção, igual ao da versão `2874341`. O tamanho das páginas é idêntico ao da 10D.3. A ligação entre o domínio e a implantação `6kHynFUs…` vem de dois fatos:
  - a Vercel informou sucesso para o commit de `main`, que é o branch de produção;
  - o cabeçalho de cache mostrou `Age: 0` em todas as respostas.

  Não há um marcador visível que prove essa ligação sem acesso ao painel.

## 7. Versão do Node.js

| Ambiente | Versão | Evidência |
|---|---|---|
| Local | 26.13.0 | `node -v` |
| GitHub Actions | **26.x (versão exata não confirmada)** | O `setup-node` lê `.nvmrc` (`26`) e terminou com sucesso. A versão exata está no log do job, mas a API de logs exige autenticação (HTTP 403 sem token) |
| Vercel (build de produção) | **Não confirmada** | Ver abaixo |

**Vercel: limitação registrada.** Não foi possível ver o log de build da implantação:
- o painel da Vercel exige login;
- não há Vercel CLI instalada nem vínculo local do projeto (`.vercel/`);
- não se criou token;
- a automação do navegador não estava disponível nesta sessão.

**Evidência indireta, que não substitui a confirmação:**
- o `package.json` publicado declara `"engines": { "node": "26.x" }`;
- pela documentação da Vercel, esse campo tem prioridade sobre a configuração do projeto, e `26.x` é uma versão aceita (a atual padrão);
- o build terminou com sucesso.

**Como confirmar (manual, só leitura):**
1. Abrir `https://vercel.com/nauam1/bem-te-vi/6kHynFUsaxFSHEn9bf86cBWLHjWS` com a conta do projeto, ir a **Build Logs** e procurar a linha que informa a versão do Node.js usada (ou um aviso de `engines`).
2. Alternativa: **Project Settings → Build and Deployment → Node.js Version**. O painel indica quando o `engines` do `package.json` sobrepõe a configuração.
3. Para a CI: abrir a execução `43911666610` logado no GitHub e expandir a etapa `Run actions/setup-node…`, que mostra a versão 26.x resolvida.

## 8. Validação da produção

Foram 8 requisições `curl`, com 5 s entre elas (16:52:09Z → 16:52:43Z). **Nenhuma resposta teve `X-Vercel-Mitigated`.** Não houve automação de navegador em produção nem tentativa de contornar a proteção contra bots. Todos os resultados abaixo foram **efetivamente observados**.

| Rota | Status | Tamanho | Cache Vercel | Conteúdo verificado |
|---|---|---|---|---|
| `/` | **200** | 69.983 B | PRERENDER | Título "Bem-te-vi — Plataforma de Inteligência da Biodiversidade"; H1 "Conhecer a biodiversidade é compreender o território."; sem meta `robots` |
| `/explorar` | **200** | 38.741 B | PRERENDER | Título "Explorar biodiversidade · Bem-te-vi"; H1 correto |
| `/acesso` | **200** | 20.768 B | PRERENDER | Título "Acesso interno · Bem-te-vi"; H1 "Em construção"; meta `noindex, nofollow` **e** `X-Robots-Tag: noindex, nofollow`; "Não configurada"; nenhum `<form>` |
| `/robots.txt` | **200** `text/plain` | 79 B | MISS | `User-Agent: *` / `Allow: /` / `Sitemap: https://bem-te-vi-zeta.vercel.app/sitemap.xml` |
| `/sitemap.xml` | **200** `application/xml` | 235 B | MISS | Só `https://bem-te-vi-zeta.vercel.app` e `…/explorar`; `/acesso` ausente |
| `/pagina-inexistente-10d4` | **404** | 10.793 B | MISS | Título "Página não encontrada · Bem-te-vi"; **uma** meta `robots` (`noindex`) |
| `/decoracao/curvas-hero.svg` | **200** `image/svg+xml` | 17.156 B | MISS | **Byte a byte idêntico** ao arquivo do repositório |
| `http://…/robots.txt` | **308** → `https://…/robots.txt` | — | — | HTTPS forçado |

Os tamanhos são idênticos aos medidos na publicação da 10D.3, como esperado de um commit que não muda o código da aplicação.

**Cabeçalhos de segurança: presentes em 7 de 7 respostas.**
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`;
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`;
- `Cross-Origin-Opener-Policy: same-origin`;
- sem `X-Powered-By` (0 de 7);
- CSP ausente (0 de 7), como decidido.

**Credenciais nas respostas de produção:** nenhuma.

## 9. Problemas encontrados e correções

| Problema | Situação |
|---|---|
| Falha da CI | **Nenhuma.** Passou na primeira execução |
| Incompatibilidade com Ubuntu | **Nenhuma.** `npm ci`, build, Chromium com `--with-deps` e os 61 testes passaram no `ubuntu-latest` |
| Commits de correção | **Nenhum** |

## 10. Critérios de conclusão da Fase 10D.4

| Critério | Situação |
|---|---|
| Commit publicado no GitHub | ✅ `194341ec15055eb1cb0a4fd72564aac529c83aeb` |
| `main` sincronizada | ✅ HEAD local = `origin/main` = remoto |
| GitHub Actions com sucesso | ✅ Execução `43911666610`, `success` |
| 61 testes aprovados na CI | ✅ `61 passed`; nenhum reprovado ou pulado |
| Vercel implantou a versão publicada | ✅ Status `success` da Vercel para o commit `194341e`. A ligação com o domínio é indireta (seção 6) |
| Rotas principais verificadas | ✅ `/`, `/explorar`, `/acesso`, `/robots.txt`, `/sitemap.xml`, 404, SVG e redirecionamento HTTPS |
| Versão do Node na Vercel | ⚠️ **Não confirmada.** A impossibilidade e o método de verificação estão registrados na seção 7. É uma pendência não bloqueadora, para a próxima revisão de infraestrutura |

## 11. Limitações ainda existentes

1. **A versão do Node na Vercel não foi confirmada** (seção 7). É uma pendência não bloqueadora, para a próxima revisão de infraestrutura. A versão exata da CI também não foi confirmada, embora seja 26.x pelo `.nvmrc`.
2. **A ligação entre o domínio de produção e a implantação `6kHynFUs…` é indireta**, porque o commit não muda o conteúdo servido.
3. **Interatividade não testada em produção.** Foco, teclado e larguras são cobertos pelos 61 testes na CI e no build local, não no domínio público.
4. **A imagem `ubuntu-latest` está migrando para o Ubuntu 26.** A primeira execução depois da troca deve ser acompanhada.
5. Continuam valendo:
   - um único motor de navegador (Chromium);
   - sem teste com leitor de tela real;
   - rota anterior preservada pelo Next.js 16 (dois `main#conteudo` por um tempo);
   - cache dos SVG com `max-age=0, must-revalidate`;
   - CSP não implementada;
   - 7 vulnerabilidades moderadas de desenvolvimento.
6. **Este relatório** ainda não estava commitado ao fim da execução 10D.4.3. Foi publicado depois, em commit documental exclusivo.

## 12. Estado final do Git

- Branch `main`, HEAD `194341ec15055eb1cb0a4fd72564aac529c83aeb`, igual ao `origin/main` e ao `main` remoto.
- Nenhum arquivo rastreado modificado.
- Único arquivo não rastreado: `docs/RELATORIO_PUBLICACAO_FASE_10D_4.md` (este).
- Nada foi feito no SEMA LabFlow, na CSP, nas dependências, no Supabase, no banco de dados ou nas configurações do GitHub e da Vercel.
