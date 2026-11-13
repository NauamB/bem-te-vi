# Auditoria complementar — Fase 10D.3.1

Auditoria **somente de leitura** da Fase 10D.3, antes de autorizar commit, push e deploy. Data: 13/11/2026, das 14:46 às 14:55 (horário local, −04:00). Repositório `~/Downloads/bem-te-vi`.

O que **não** foi feito:
- nenhuma alteração de código ou de documento anterior;
- nenhum commit, push ou deploy;
- nenhuma dependência atualizada;
- nenhum acesso ao SEMA LabFlow.

Os comandos Git usaram `--no-optional-locks`; o hash do `.git/index` ficou igual do início ao fim (`4161ce59…`). **Não houve novo build:** confirmei que o build existente (`.next/BUILD_ID` de 14:31:36) é mais recente que todos os arquivos de código e o servi com `next start` local, encerrado ao final. **Único arquivo criado:** este relatório.

## 1. Git

| Item | Valor |
|---|---|
| Branch / HEAD | `main` / `5389a0fd5b2f33788a52562f22e9d9b0c33bf99b`, igual a `origin/main` (referência local, sem fetch) |
| Preparados para commit | 0 |
| **Modificados** | **12** |
| **Novos (não rastreados)** | **8**, antes deste relatório |

`git status --short`:

```
 M README.md
 M app/globals.css
 M app/layout.tsx
 M app/not-found.tsx
 M components/navigation/menu-movel.tsx
 M components/presentation/curvas-de-nivel.tsx
 M components/presentation/hero.tsx
 M components/presentation/mato-grosso.tsx
 M docs/arquitetura/ARQUITETURA_INICIAL.md
 M lib/config/site.ts
 M next.config.ts
 M package.json
?? app/robots.ts                               (521 B)
?? app/sitemap.ts                              (372 B)
?? docs/RELATORIO_FASE_10D_3.md                (21.402 B)
?? docs/RELATORIO_VALIDACAO_PRODUCAO.md        (15.216 B)
?? public/decoracao/curvas-hero.svg            (17.156 B)
?? public/decoracao/curvas-mato-grosso.svg     (24.382 B)
?? public/decoracao/curvas-painel.svg          (24.353 B)
?? scripts/gerar-decoracao.mjs                 (4.516 B)
```

Diff resumido: 12 arquivos, +100/−68 linhas:
- `menu-movel.tsx` (+54/−);
- `curvas-de-nivel.tsx` (46, reescrito como fundo CSS);
- `hero.tsx` e `mato-grosso.tsx` (−, trocam o uso do componente);
- `not-found.tsx` (+8), `globals.css` (+7), `next.config.ts` (+6), `lib/config/site.ts` (+5), `README.md` (+5), `package.json` (+4), `ARQUITETURA_INICIAL.md` (+4), `layout.tsx` (+2).

**Relatório da Fase 10D.2:** `docs/RELATORIO_VALIDACAO_PRODUCAO.md`, SHA-256 `3d87a38815a09bf1424b9ef47518a6d7e1cfef8a890da7a9c0cff65a42e4ade3`. É **idêntico** ao registrado no início da 10D.3. A data de modificação (14:07:05) é anterior à 10D.3, então o arquivo está **intacto**.

### Contagens: relatório da 10D.3 × Git

| Fonte | Modificados | Novos |
|---|---|---|
| `RELATORIO_FASE_10D_3.md`, seção 2 | 12 | "Criados (7)": 2 rotas de metadados, gerador, 3 SVG e o próprio relatório |
| Git real | 12 | 8 |

**Não há divergência real.** O oitavo arquivo não rastreado é `docs/RELATORIO_VALIDACAO_PRODUCAO.md`, criado na **Fase 10D.2** e preexistente à 10D.3. O relatório da 10D.3 o listou como "alteração preexistente" (seção 1), não como criado, e o resumo final na conversa falou em 8 novos, incluindo-o. As duas contagens estão corretas, cada uma no seu recorte.

### Alterações fora do escopo estrito

| Arquivo | Natureza | Avaliação |
|---|---|---|
| `README.md` (+5) e `docs/arquitetura/ARQUITETURA_INICIAL.md` (+4) | Sincronização documental: novos comandos `decoracao:*`, novas pastas, estado de SEO, decoração e CSP | **Fora do escopo estrito** (a fase pedia só criar `RELATORIO_FASE_10D_3.md`), mas sem efeito em código. Já declaradas na seção 2 do relatório da 10D.3. Podem ser mantidas ou revertidas por decisão do proprietário |
| `package.json` (+2 scripts) | Suporte ao gerador de SVG | Dentro do escopo da otimização; **nenhuma dependência** alterada |
| `app/layout.tsx` (`metadataBase`, Open Graph) | Metadados gerais | Dentro do escopo ("conferir metadados gerais") |

Nenhuma outra alteração fora do escopo.

## 2. Sitemap e robots

| Verificação | Resultado |
|---|---|
| Arquivo de sitemap | **`app/sitemap.ts`**, o único (busca por `sitem*` no projeto, fora de `node_modules` e `.next`) |
| `app/sitemo.mjs` | **Não existe.** Se existisse, **não** seria reconhecido como sitemap: o Next.js 16.4 só reconhece `sitemap.xml`, `sitemap.js` e `sitemap.ts` (`docs/01-app/03-api-reference/03-file-conventions/01-metadata/sitemap.md`). Por convenção do App Router, um arquivo com outro nome dentro de `app/` também não vira rota. `/sitemo.mjs` responde 404 |
| Convenção | `app/sitemap.ts` e `app/robots.ts` exportam funções padrão tipadas com `MetadataRoute.Sitemap` e `MetadataRoute.Robots`, conforme a documentação instalada. O build os listou como rotas estáticas (`○ /sitemap.xml`, `○ /robots.txt`) e gerou `.next/server/app/sitemap.xml*` e `robots.txt*` |
| `/sitemap.xml` | **200** `application/xml`; 2 URLs: `https://bem-te-vi-zeta.vercel.app` e `https://bem-te-vi-zeta.vercel.app/explorar`, as duas respondendo 200 localmente |
| `/robots.txt` | **200** `text/plain`: `User-Agent: *`, `Allow: /`, `Sitemap: https://bem-te-vi-zeta.vercel.app/sitemap.xml` |
| Só páginas públicas existentes | Sim (`rotasIndexaveis = ["/", "/explorar"]`); nenhuma rota futura ou inexistente |
| `/acesso` | **Fora do sitemap** (0 ocorrências); meta `noindex, nofollow` e cabeçalho `X-Robots-Tag: noindex, nofollow`. De propósito, não está em `Disallow`, porque um robô bloqueado não leria o `noindex` (justificativa no próprio `robots.ts`) |
| Domínio absoluto | `site.url = "https://bem-te-vi-zeta.vercel.app"` (`lib/config/site.ts`), correto |
| Exposição de código-fonte | `/sitemap.ts` e `/app/sitemap.ts` respondem 404 |

## 3. Página 404

| Verificação | Resultado |
|---|---|
| Status | **404** real |
| Título | `Página não encontrada · Bem-te-vi` |
| Descrição | `O endereço solicitado não corresponde a nenhuma página do Bem-te-vi.` |
| Meta robots | **Uma única**: `<meta name="robots" content="noindex"/>`, injetada pelo Next. Sem duplicação |
| Retorno | Link `<a href="/">Voltar à apresentação</a>`. Na 10D.3, ele foi seguido por teclado e levou a `/` |

## 4. Otimização dos SVG

| Verificação | Resultado |
|---|---|
| Os 3 SVG existem | `public/decoracao/curvas-hero.svg` (17.156 B), `curvas-painel.svg` (24.353 B), `curvas-mato-grosso.svg` (24.382 B) |
| Reprodutibilidade | `npm run decoracao:verificar` (só leitura): **ok** nos 3, código 0. O script regenera o conteúdo em memória e ele bate byte a byte com os arquivos |
| Caminhos locais | **0 ocorrências** nos 3 SVG e no script. O script resolve o destino relativo ao próprio arquivo (`import.meta.url`). A única URL nos SVG é o namespace `http://www.w3.org/2000/svg` |
| Dependências | O script importa só `node:fs`, `node:path` e `node:url`. `package.json` com +2 scripts, nenhuma dependência; `package-lock.json` **inalterado** |
| Carregamento no build | Os 3 respondem **200 `image/svg+xml`**, com conteúdo **idêntico** ao arquivo do repositório (`cmp`). O HTML de `/` referencia `url(/decoracao/…)` para os 3 |
| Identidade visual | As capturas desta auditoria são **idênticas pixel a pixel** (0 pixels diferentes) às capturas validadas na 10D.3, nas 6 seções e larguras. A comparação com a versão anterior à otimização, feita na 10D.3, mostrou diferença média abaixo de 0,7/255; lado a lado, as versões são indistinguíveis. A marca não foi alterada |

## 5. Segurança e dependências

**Cabeçalhos** (local) em `/`, `/explorar`, `/acesso`, 404, `/robots.txt`, `/sitemap.xml` e `/decoracao/curvas-hero.svg`:
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`;
- `Cross-Origin-Opener-Policy: same-origin`;
- sem `X-Powered-By`;
- só `/acesso`: `X-Robots-Tag: noindex, nofollow`.

A CSP continua **não ativada**, conforme decidido. O HSTS é aplicado pela Vercel em produção (confirmado na 10D.2) e não se aplica ao servidor local em http.

**Credenciais:** a busca por padrões (chaves Supabase, JWT, GitHub, AWS, Google, Slack, chave privada, `password`/`token`/`secret` com valor) nos **20 arquivos alterados e novos** e no build (`.next/static`, `.next/server/app`) achou **0 ocorrências**. Também não há e-mail nem caminho pessoal nesses arquivos. `.env` e `.env.local` não existem.

**Dependências:**

| Verificação | Resultado |
|---|---|
| `npm audit` | **7 moderadas**, 0 altas, 0 críticas |
| `npm audit --omit=dev` | **0** |
| Origem única | `minimatch@10.2.6` (dev), em `node_modules/@typescript-eslint/typescript-estree/node_modules/minimatch`; [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249), faixa `>=7.0.0 <11.0.1` |
| Cadeia (`npm explain`) | `eslint-config-next@16.4.6` → `typescript-eslint@^8.56.0` (8.72.2) → `@typescript-eslint/eslint-plugin@8.72.2` → `@typescript-eslint/parser@8.72.2` → `@typescript-eslint/typescript-estree@8.72.2` → `minimatch@^10.2.2` (10.2.6). Os outros 6 alertas são os pacotes dessa cadeia |
| Atualizações aplicadas nesta fase | **Nenhuma.** Hash do `package-lock.json` antes e depois: `a49d1440…` |

**Uso efetivo do código vulnerável:** o `typescript-estree` 8.72.2 chama o `minimatch` só em `useProgramFromProjectService.js`, para a opção `allowDefaultProject` do *project service*. A configuração de lint efetiva (`eslint-config-next`) usa o parser do `typescript-eslint` só com `parserOptions: { sourceType: 'module' }`, **sem `projectService`**. Assim, **o caminho de código vulnerável não é executado** no lint deste projeto. O risco real atual é praticamente nulo. Ele passaria a existir só se o lint com tipos for ativado no futuro, e mesmo assim com padrões vindos da própria configuração.

**Proposta de correção (não aplicada):**
- Aguardar uma versão do `typescript-eslint` compatível com `minimatch` 11. Hoje não há: 8.72.2 é a mais recente e exige `^10.2.2`.
- Alternativa: `overrides` de `minimatch` para `^11.0.1` só sob `@typescript-eslint/typescript-estree`.
- Indícios de compatibilidade: o `minimatch` 11 continua oferecendo a entrada CommonJS (`exports.require`) e a exportação nomeada `minimatch` que o `typescript-estree` usa (`require("minimatch").minimatch`), e exige Node `20 || >=22` (o ambiente usa 26.13.0).
- **Mesmo assim, a compatibilidade não está comprovada:** é uma mudança de versão maior contra o intervalo declarado pelo pacote, e só um teste (lint e build num branch) confirmaria. Dado que o caminho vulnerável não é executado, **não recomendo aplicar agora**. Reavaliar a cada atualização do `eslint-config-next`.

## 6. Pendências

1. **Validação em produção desta versão:** depende de commit, push e deploy autorizados.
2. **Testes automatizados versionados:** inexistentes; recomendado para a 10D.4.
3. **CSP:** proposta na 10D.3, não ativada.
4. **Vulnerabilidades de desenvolvimento:** 7 moderadas, sem correção compatível e com o caminho vulnerável não executado.
5. **Cache dos SVG em produção:** política da Vercel para `public/` a verificar depois do deploy.
6. **Documentação fora do escopo estrito:** decidir se ficam as alterações em `README.md` e `ARQUITETURA_INICIAL.md` (recomendação: manter, porque mantêm a documentação coerente com o código).
7. **Arquivos a incluir no commit:** decisão do proprietário. Sugestão: os 12 modificados, os 6 de código e recursos novos, `docs/RELATORIO_FASE_10D_3.md`, `docs/RELATORIO_VALIDACAO_PRODUCAO.md` (10D.2) e este relatório.

## 7. Parecer

**A Fase 10D.3 está apta para commit, push e deploy.**
- O build auditado é o mesmo que foi validado (capturas idênticas pixel a pixel).
- `robots.txt` e `sitemap.xml` seguem a convenção da versão instalada e têm o conteúdo correto.
- A 404 é real e tem uma única meta `robots`.
- Os SVG são reproduzíveis, sem caminhos locais e sem novas dependências.
- Os cabeçalhos de segurança estão preservados.
- Não há credenciais expostas.
- Não há alteração de dependências.
- O relatório da 10D.2 está intacto.

Não há impeditivo técnico. As pendências da seção 6 são decisões ou próximas etapas, não bloqueios.
