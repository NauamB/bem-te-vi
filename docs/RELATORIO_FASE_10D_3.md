# Relatório da Fase 10D.3 — Estabilização técnica, acessibilidade, SEO e desempenho

Período: 13/11/2026, das 14:25 às 14:40 (horário local, −04:00). Repositório `~/Downloads/bem-te-vi`. **Sem commit, push ou deploy.** Todos os testes desta fase foram feitos **no build de produção local**. A produção (`https://bem-te-vi-zeta.vercel.app`) continua com a versão anterior, `5389a0f`.

## 1. Estado inicial do Git

| Item | Valor |
|---|---|
| Caminho | `~/Downloads/bem-te-vi` |
| Branch / HEAD | `main` / `5389a0fd5b2f33788a52562f22e9d9b0c33bf99b`, igual a `origin/main` |
| Identidade local | `NauamB` (e-mail configurado só neste repositório) |
| Remoto | `origin` → `https://github.com/NauamB/bem-te-vi.git` |
| Alterações preexistentes | Só `docs/RELATORIO_VALIDACAO_PRODUCAO.md` (não rastreado, Fase 10D.2). **Preservado**: SHA-256 `3d87a388…` idêntico no início e no fim |

## 2. Arquivos modificados e criados

**Modificados (12)**
- `components/navigation/menu-movel.tsx`: foco acessível.
- `components/presentation/curvas-de-nivel.tsx`: virou fundo CSS com SVG estático.
- `components/presentation/hero.tsx` e `components/presentation/mato-grosso.tsx`: passam a usar o novo componente.
- `app/not-found.tsx`: metadados próprios.
- `app/layout.tsx`: `metadataBase` e Open Graph básico.
- `app/globals.css`: sem contorno em contêineres que recebem foco programático.
- `lib/config/site.ts`: `site.url` e `rotasIndexaveis`.
- `next.config.ts`: `X-Robots-Tag` em `/acesso`.
- `package.json`: scripts `decoracao:gerar` e `decoracao:verificar`. Nenhuma dependência alterada.
- `README.md` e `docs/arquitetura/ARQUITETURA_INICIAL.md`: atualização mínima de estrutura e estado.

**Criados (7)**
- `app/robots.ts`, `app/sitemap.ts`
- `scripts/gerar-decoracao.mjs`
- `public/decoracao/curvas-hero.svg`, `public/decoracao/curvas-painel.svg`, `public/decoracao/curvas-mato-grosso.svg`
- este relatório

**Dependências:** nenhuma adicionada, removida ou atualizada. O `package-lock.json` não mudou.

## 3. Problemas encontrados (diagnóstico)

| Id | Problema | Causa identificada |
|---|---|---|
| P1 | Foco não voltava ao botão "Menu" depois do Esc | O fechamento só mudava o estado; não havia referência ao botão. Além disso, o roteador do Next.js 16 **não move o foco** na navegação: o código-fonte (`layout-router.js`) diz que "resetar o foco na navegação fica adiado". Por isso, ao escolher um destino, o foco ficava num link que acabara de ser ocultado |
| P2 | Página 404 com o título padrão do site | `app/not-found.tsx` não exportava `metadata` |
| P3 | HTML de `/` com 217.925 bytes | As curvas de nível eram SVG inline gerados num Server Component. Os caminhos apareciam **duas vezes**: cerca de 75,6 KB de SVG no HTML e cerca de 59,7 KB no payload do React (`self.__next_f`). No total, ~135 KB, ou 62% do documento |
| P4 | Sem `robots.txt` e `sitemap.xml` | Não implementados |
| P5 | Sem CSP | Decisão adiada (seção 12) |
| P6 | 7 vulnerabilidades moderadas | Uma única origem (seção 6) |
| P7 | 404 com duas metas `robots` | Encontrado durante a fase, depois da primeira versão da correção P2: o Next já injeta `noindex` na 404, e eu tinha declarado outra. Corrigido |

## 4. Correções realizadas

**P1 — Menu acessível** (`menu-movel.tsx`)
- Botão com `ref`; **Esc** fecha o menu e devolve o foco ao botão.
- Ao abrir, o foco **continua no botão**. O painel vem logo depois dele no documento, então o Tab entra nos links e o Shift+Tab sai, sem armadilha. Quando fechado, o painel tem `hidden` e sai da ordem de Tab.
- Ao escolher um destino, a função `focarDestino` espera a navegação e leva o foco:
  - à seção da âncora (por exemplo `section#principios`);
  - ou ao conteúdo principal da nova página (`main#conteudo`), inclusive em `/acesso`, que usa outro layout.
  - Ela aplica `tabindex="-1"` só quando necessário e usa `focus({ preventScroll: true })`, deixando a rolagem por conta do roteador.
- `aria-expanded` e `aria-controls` foram mantidos. O nome acessível segue o texto visível ("Menu" / "Fechar").
- O visual não mudou. Contêineres com foco programático não exibem contorno (`globals.css`); controles interativos mantêm o contorno amarelo.

**P2 / P7 — 404**
- `export const metadata` com título "Página não encontrada" (vira "Página não encontrada · Bem-te-vi") e descrição. É o mecanismo documentado para o `app/not-found.tsx` raiz no Next 16.4.
- A meta `robots` fica só a do Next (`noindex`), sem duplicata.
- Status HTTP **404** mantido; o link "Voltar à apresentação" foi mantido.

**P3 — Curvas de nível**
- `scripts/gerar-decoracao.mjs`, sem dependências, gera 3 SVG estáticos com **os mesmos parâmetros, cores e opacidades** da versão aprovada.
- Usa interpolação suave (Catmull-Rom → Bézier, 40 pontos por curva) em vez de uma linha poligonal de 96 segmentos. O traço é igual ou mais suave, com menos dados.
- `vector-effect: non-scaling-stroke` em cada caminho, para manter a espessura do traço.
- O componente `CurvasDeNivel` agora é um `div` com `aria-hidden="true"` e o SVG como fundo (`background-size: 100% 100%`, que reproduz o `slice` anterior). A decoração fica fora do HTML, do payload do React e da árvore de acessibilidade, e é cacheável.
- O gerador é determinístico: `npm run decoracao:verificar` confere se os arquivos estão atualizados (código 1 se não estiverem).
- A marca (`marca.tsx`) **não foi alterada**.

**P4 — SEO técnico**
- `app/robots.ts`: `Allow: /` e `Sitemap: https://bem-te-vi-zeta.vercel.app/sitemap.xml`.
  - `/acesso` **não** entra em `Disallow` de propósito: um robô bloqueado não lê a página e, portanto, não vê o `noindex`.
  - A não indexação vem de três camadas: a meta `noindex, nofollow`, o cabeçalho `X-Robots-Tag: noindex, nofollow` e a exclusão do sitemap.
- `app/sitemap.ts`: só `/` e `/explorar` (lista `rotasIndexaveis`), sem rotas futuras e sem `lastModified` (não há data de conteúdo confiável a anunciar).
- `metadataBase` no domínio oficial e Open Graph básico (`website`, `pt_BR`, nome, título e descrição). Sem imagem de compartilhamento, porque ainda não há imagem aprovada.

## 5. Desempenho: antes × depois (build local, mesmo servidor `next start`)

| Rota | HTML antes | HTML depois | Gzip antes | Gzip depois |
|---|---|---|---|---|
| `/` | 217.925 B | **69.733 B (−68,0%)** | 73.944 B | **11.814 B (−84,0%)** |
| `/explorar` | 36.648 B | 38.491 B (+1.843) | 6.205 B | 6.402 B |
| `/acesso` | 18.661 B | 20.505 B (+1.844) | 4.218 B | 4.515 B |
| 404 | 8.976 B | 10.583 B (+1.607) | 2.385 B | 2.580 B |

- O aumento de ~1,8 KB nas demais páginas vem dos novos metadados (Open Graph, `metadataBase`, 404).
- Caminhos SVG no HTML de `/`: de 68.597 bytes para 674 bytes (sobram só os da marca).
- **Recursos decorativos** (arquivos separados, baixados uma vez e reaproveitados pelo cache):

| Arquivo | Bytes | Transferido com gzip |
|---|---|---|
| `curvas-hero.svg` | 17.156 | 7.770 |
| `curvas-painel.svg` | 24.353 | 9.773 |
| `curvas-mato-grosso.svg` | 24.382 | 10.992 |

  Na primeira visita, `/` transfere cerca de 11,8 KB de HTML mais 28,5 KB de decoração, contra 73,9 KB antes. Nas visitas seguintes, só o HTML.

**Fidelidade visual:** comparação pixel a pixel (System.Drawing do .NET) das capturas antes e depois, nas mesmas condições:

| Recorte | Pixels diferentes | Diferença > 8/255 | Diferença média | Máxima |
|---|---|---|---|---|
| Hero 1366 | 3,667% | 0,672% | 0,188/255 | 54/255 |
| Painel 1366 | 7,389% | 2,155% | 0,471/255 | 54/255 |
| Mato Grosso 1366 | 3,432% | 0,080% | 0,096/255 | 16/255 |
| Hero 390 | 4,862% | 1,291% | 0,301/255 | 37/255 |
| Painel 390 | 8,335% | 3,607% | 0,682/255 | 37/255 |
| Mato Grosso 390 | 0,942% | 0,054% | 0,028/255 | 16/255 |

As diferenças são de suavização ao longo dos traços: o traço suave passa a frações de pixel da antiga linha poligonal. Na inspeção visual lado a lado do hero (1366) e do painel (390), as versões são **indistinguíveis**. A identidade foi preservada.

## 6. Auditoria de dependências

`npm audit`: 7 moderadas, 0 altas e 0 críticas. `npm audit --omit=dev`: **0**. Todas estão em dependências de **desenvolvimento** (lint), e todas vêm de uma única origem:

| Pacote | Versão instalada | Severidade | Direta? | Papel |
|---|---|---|---|---|
| **`minimatch`** (aninhado em `@typescript-eslint/typescript-estree/node_modules`) | **10.2.6** | Moderada, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249): negação de serviço por amplificação de *globparts*; faixa afetada `>=7.0.0 <11.0.1` | Transitiva | **Origem** |
| `@typescript-eslint/typescript-estree` | 8.72.2 | Moderada (herdada) | Transitiva | Exige `minimatch ^10.2.2` |
| `@typescript-eslint/parser` | 8.72.2 | Moderada (herdada) | Transitiva | |
| `@typescript-eslint/utils` | 8.72.2 | Moderada (herdada) | Transitiva | |
| `@typescript-eslint/type-utils` | 8.72.2 | Moderada (herdada) | Transitiva | |
| `@typescript-eslint/eslint-plugin` | 8.72.2 | Moderada (herdada) | Transitiva | |
| `typescript-eslint` | 8.72.2 | Moderada (herdada) | Transitiva | Vem de `eslint-config-next@16.4.6` (`^8.56.0`) |

- **Versão corrigida:** `minimatch` 11.0.1 ou mais nova (mais recente: 11.0.8). **Não existe hoje uma cadeia compatível.** O `@typescript-eslint/typescript-estree` 8.72.2 já é a versão mais recente e exige `minimatch ^10.2.2`, cuja versão mais nova (10.2.6) ainda é vulnerável. O `eslint-config-next` 16.4.6 também já é o mais recente.
- **`npm audit fix --dry-run`** (sem gravar): não resolveu nenhuma das 7. O lockfile ficou com o mesmo hash antes e depois. **Não executei `--force`.**
- **Impacto real:** baixo. O código afetado só roda no lint, em desenvolvimento e na CI; ele não vai para o bundle de produção (0 vulnerabilidades em produção). A exploração exige padrões *glob* maliciosos, e os padrões vêm da configuração do próprio projeto, não de entrada externa.
- **Risco de atualização:** forçar `minimatch@11` via `overrides` numa dependência que declara `^10` contraria o contrato do pacote e pode quebrar o parser do lint (mudança de versão maior).
- **Proposta (não aplicada):** aguardar uma versão do `typescript-eslint` compatível com `minimatch` 11 e reavaliar a cada atualização do `eslint-config-next`. Se for preciso zerar o alerta antes disso, testar um `overrides` isolado num branch, com lint e build, **só com autorização**.

## 7. Lint

`npm run lint`: **código de saída 0**, sem erros nem avisos. Executado depois das alterações de código e de novo ao final, depois das alterações de documentação.

## 8. Build

`npm run build` (Next.js 16.4.6, Turbopack): **código de saída 0**. TypeScript sem erros. Rotas:

```
┌ ○ /
├ ○ /_not-found
├ ○ /acesso
├ ○ /explorar
├ ○ /icon.svg
├ ○ /robots.txt
└ ○ /sitemap.xml
```

## 9. Testes

- **O projeto não tem testes automatizados versionados.** Não criei testes no repositório nem adicionei dependências (fora do escopo).
- A validação foi feita com scripts próprios fora do repositório, controlando o Edge sem interface pelo DevTools Protocol, sem dependências, contra o build local (`next start`, `127.0.0.1:3100`).

| Verificação (local) | Resultado |
|---|---|
| `/`, `/explorar`, `/acesso` | 200; 0 exceções JS, 0 erros de console, 0 falhas de rede |
| Rota inexistente | **404**; título "Página não encontrada · Bem-te-vi"; uma única meta `robots` (`noindex`) |
| Navegação por clique (cabeçalho, hero, âncoras, rodapé, páginas internas, 404) | **13/13** |
| `/robots.txt` | 200 `text/plain`: `User-Agent: *`, `Allow: /`, `Sitemap: https://bem-te-vi-zeta.vercel.app/sitemap.xml` |
| `/sitemap.xml` | 200 `application/xml`: só `https://bem-te-vi-zeta.vercel.app` e `…/explorar` |
| `/acesso` | Meta `noindex, nofollow` + cabeçalho `X-Robots-Tag: noindex, nofollow` |
| Metadados de `/` | Título, descrição, `og:title`, `og:description`, `og:site_name`, `og:locale=pt_BR`, `og:type=website`, `lang=pt-BR`, `theme-color`, ícone |
| Cabeçalhos | `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` e COOP presentes, inclusive em `robots.txt` e nos SVG |
| Arquivos sensíveis | `.env*`, `.git/*`, `package*.json`, `next.config.ts`, `tsconfig.json`, `AGENTS.md`, `README.md`, `docs/*`, `.vercel/*`, `BUILD_ID`: todos 404 |
| Mapas de código e credenciais | 9 scripts (589.564 B): sem `.map` (404) e sem padrões de credencial; HTML limpo |
| `npm run decoracao:verificar` | Código 0 (3 arquivos atualizados) |

**Produção:** não houve deploy, então a produção não reflete esta fase. Uma única requisição espaçada às 14:36 recebeu **200** (`X-Vercel-Cache: HIT`): o desafio de segurança registrado na 10D.2 **não estava mais ativo**, o que confirma que foi temporário (cerca de 45 minutos). Não houve nova validação em massa da produção nem tentativa de contornar proteções.

## 10. Validação responsiva (local)

7 larguras × 3 rotas = 21 combinações:

| Largura | `/` | `/explorar` | `/acesso` | Menu |
|---|---|---|---|---|
| 360 | ok | ok | ok | Funcional: 6 destinos, ≥ 44 px, foco volta após Esc |
| 390 | ok | ok | ok | Idem |
| 430 | ok | ok | ok | Idem |
| 768 | ok | ok | ok | Idem |
| 1024 | ok | ok | ok | Navegação no cabeçalho |
| 1366 | ok | ok | ok | Idem |
| 1920 | ok | ok | ok | Idem |

"ok" significa, em todas as 21 combinações:
- 0 rolagem horizontal;
- 0 elementos fora da tela;
- 0 textos cortados;
- 0 sobreposições de texto;
- 0 links ou botões com menos de 44 px.

Capturas revisadas: `/` em 360, 768 e 1366 px; `/explorar` e `/acesso` em 390 px; menu aberto em 360 px.

## 11. Evidências de acessibilidade (local, teclas reais via `Input.dispatchKeyEvent`)

| Cenário | Resultado |
|---|---|
| Celular 390: sequência de Tab | "Ir para o conteúdo" → marca → botão "Menu" (`aria-expanded=false`) → "Explorar biodiversidade" (painel fechado fica fora da ordem). Todos com contorno visível |
| Enter no botão | Rótulo "Fechar", `aria-expanded=true`, painel visível; o foco **permanece no botão** |
| Tab no menu aberto | Entra no painel: "A plataforma" → "Princípios" |
| **Esc** | Painel oculto, `aria-expanded=false`, **foco no botão "Menu"** ✔ (na 10D.2 o resultado era `false`) |
| Shift+Tab a partir do botão | Volta à marca (sem armadilha) |
| Enter em "Princípios" (âncora) | `#principios`, menu fechado, **foco em `section#principios`**; o próximo Tab segue a ordem do documento |
| Enter em "Explorar biodiversidade" (troca de página) | `/explorar`, **foco em `main#conteudo`**; o próximo Tab vai para "Voltar à apresentação" |
| Enter em "Acesso interno" (outro layout) | `/acesso`, **foco em `main#conteudo`** |
| Desktop 1366: Tab | Pular conteúdo → marca → 4 links da navegação → "Acesso interno" → "Explorar biodiversidade" (cabeçalho) → "Explorar biodiversidade" (hero). Todos com contorno |
| Link "Ir para o conteúdo" | `#conteudo`; o próximo Tab vai para o primeiro controle do conteúdo |
| 404 por teclado | Tab chega a "Voltar à apresentação"; Enter leva a `/` |
| Exceções de JavaScript | 0 |

Não houve teste com leitor de tela real nem em dispositivos físicos.

## 12. Proposta de CSP (não ativada)

**Situação atual:**
- Todas as páginas são **estáticas** (`cacheComponents` e `partialPrefetching`, pré-renderizadas).
- O Next injeta **scripts inline**: o payload `self.__next_f.push(…)` e a inicialização do App Router. Os scripts externos vêm só de `/_next/static/`.
- Os estilos são CSS de arquivo, mais atributos `style` inline: o fundo das curvas e estilos gerados pelo React/Next.
- As fontes são **embutidas no build** pelo `next/font` e servidas por `/_next/static/media/`; o navegador não acessa o Google Fonts.
- Imagens: só SVG do próprio domínio.
- Não há `fetch` para outros domínios, nem iframes ou formulários.

**Restrições documentadas pelo Next 16.4** (`node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`):
- **Nonce** exige **renderização dinâmica em todas as páginas**. É incompatível com o *shell* estático e com o pré-render parcial. O custo é desempenho, cache na borda e hospedagem.
- **Sem nonce**, o guia propõe `script-src 'self' 'unsafe-inline'`, o que protege pouco contra XSS em scripts.
- **SRI** (`experimental.sri`) gera hashes dos arquivos JS no build e mantém o site estático. **É experimental.**

**Proposta em etapas:**

1. **Agora (site estático, sem login), em modo de relatório:** cabeçalho `Content-Security-Policy-Report-Only`, para observar violações sem quebrar nada:
   ```
   default-src 'self';
   script-src 'self' 'unsafe-inline';
   style-src 'self' 'unsafe-inline';
   img-src 'self' data:;
   font-src 'self';
   connect-src 'self';
   object-src 'none';
   base-uri 'self';
   form-action 'self';
   frame-ancestors 'none';
   upgrade-insecure-requests
   ```
   - `frame-ancestors 'none'` reforça o `X-Frame-Options: DENY`, que **continua**.
   - Em desenvolvimento, `'unsafe-eval'` é necessário (React).
   - Ativar o modo bloqueante só depois de verificar que não há violações.
2. **Avaliar `experimental.sri`** num branch, para trocar `'unsafe-inline'` em `script-src` por hashes sem perder o site estático. Pontos a medir: compatibilidade com Turbopack e com o pré-render parcial, e o efeito nos scripts inline do payload (o SRI cobre arquivos, não necessariamente o inline).
3. **Quando houver autenticação (Supabase + Google):**
   - `connect-src` deve acrescentar `https://<projeto>.supabase.co` e `wss://<projeto>.supabase.co` (Realtime, se usado).
   - O login Google via Supabase usa **redirecionamento** (`/auth/v1/authorize` → `accounts.google.com` → callback do Supabase → app), não popup nem script do Google. Por isso `script-src` e `frame-src` **não** precisam do Google. `form-action` pode precisar do domínio do Supabase, se o login for iniciado por formulário.
   - Avatares do Google exigiriam `img-src https://lh3.googleusercontent.com`; o mais simples é não exibi-los.
   - **Área interna (`(interno)`)** será dinâmica de qualquer forma (sessão por cookies). Lá cabe uma **CSP com nonce via `proxy.ts`**, restrita a esse grupo, enquanto o observatório público continua estático.
   - Mapas (MapLibre, futura fase) exigirão `worker-src blob:`, `img-src` e `connect-src` do provedor de tiles ou PMTiles, e possivelmente `style-src` específico.
4. **Reavaliar quando houver autenticação:** nonce × SRI × `'unsafe-inline'` por grupo de rotas; COOP compatível com o fluxo OAuth por redirecionamento (o `same-origin` atual não afeta redirecionamentos, mas precisa ser revalidado se um dia houver popup); `Referrer-Policy` nas chamadas ao Supabase; e um destino para relatórios de violação (`report-to`).

**Cabeçalhos revisados (sem enfraquecer nenhum):** HTTPS e HSTS vêm da Vercel em produção (`max-age=63072000; includeSubDomains; preload`, confirmado na 10D.2); `nosniff`; `Referrer-Policy: strict-origin-when-cross-origin`; `X-Frame-Options: DENY`; `Permissions-Policy` desligando câmera, microfone, geolocalização, pagamento e USB; COOP `same-origin`; sem `X-Powered-By`. Acréscimo: `X-Robots-Tag` em `/acesso`.

## 13. Limitações e pendências

1. **Produção não validada com esta versão:** não houve deploy. A validação em produção depende de commit, push e deploy autorizados.
2. **Sem testes automatizados versionados:** a validação foi feita com scripts externos ao repositório.
3. **CSP não ativada** (proposta na seção 12).
4. **7 vulnerabilidades moderadas de desenvolvimento** sem correção compatível disponível (seção 6).
5. **Cache dos SVG decorativos:** em `next start` local, o cabeçalho é `Cache-Control: public, max-age=0`, ou seja, revalidação com ETag. Em produção, depende da política da Vercel para `public/`. Não verificado nesta fase.
6. **Sem imagem de compartilhamento (Open Graph):** não há imagem aprovada.
7. **Acessibilidade:** sem teste com leitor de tela real nem em dispositivos físicos.
8. **Comparação visual:** feita em capturas do Edge sem interface, num único motor de renderização (Chromium).

## 14. Recomendações para a Fase 10D.4

1. **Com autorização:** commit desta fase, push e deploy; em seguida, validar a produção com requisições espaçadas (o desafio da Vercel já tinha cessado às 14:36) e repetir a comparação de tamanhos.
2. **Testes versionados:** adicionar Playwright como dependência de desenvolvimento, com testes de rotas, 404, `robots`/`sitemap`, metadados, responsividade nas 7 larguras e foco do menu (Esc, âncora, troca de página). Mais uma CI no GitHub Actions com lint, build, `decoracao:verificar` e testes.
3. **CSP etapa 1:** `Content-Security-Policy-Report-Only` com a política da seção 12 e observação das violações.
4. **Avaliar `experimental.sri`** num branch separado.
5. **Dependências:** reexecutar o `npm audit` a cada atualização do `eslint-config-next`.
6. Conferir na Vercel o `Cache-Control` servido para `public/decoracao/` e, se for o caso, configurar cache longo com nomes versionados.
7. Depois disso, seguir para a modelagem de dados e as ADRs.
