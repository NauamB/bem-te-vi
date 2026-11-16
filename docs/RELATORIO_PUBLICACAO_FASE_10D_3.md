# Relatório de publicação — Fase 10D.3 (execução 10D.3.2)

Publicação autorizada das correções da Fase 10D.3: commit, push e deploy automático pela Vercel, seguidos de validação espaçada da produção.

**Este relatório não foi commitado.** Fica local até nova autorização.

## 1. Data e horário

13/11/2026, das 14:50 às 14:53 (horário local, −04:00).

| Evento | Horário |
|---|---|
| Push | 14:50:59 |
| Implantação concluída na Vercel | 18:51:19 UTC (14:51:19 local) |
| Validação da produção | 14:51:58 a 14:53:08 |

## 2. Auditoria antes do staging

| Item | Resultado |
|---|---|
| Caminho | `~/Downloads/bem-te-vi` |
| Branch / HEAD inicial | `main` / `5389a0f`, igual a `origin/main` e ao `main` remoto (`git ls-remote`) |
| Identidade | `user.name = NauamB`. E-mail: o mesmo já autorizado, configurado só neste repositório. A configuração global não tem e-mail e **não foi alterada** |
| Remoto | `origin` → `https://github.com/NauamB/bem-te-vi.git` |
| Arquivos autorizados | **21 de 21 existentes**; nenhum arquivo modificado ou não rastreado fora da lista |
| Hash `RELATORIO_VALIDACAO_PRODUCAO.md` (10D.2) | `3d87a38815a09bf1…`, inalterado desde a 10D.2 |
| Hash `RELATORIO_FASE_10D_3.md` | `4f7571b1cdda74c0…` |
| Hash `RELATORIO_AUDITORIA_10D_3_1.md` | `72ecdf5cc0332917…` |
| SVG reproduzíveis | `npm run decoracao:verificar`: ok, código 0 |
| Credenciais nos 21 arquivos | **0** (padrões Supabase, JWT, GitHub, AWS, Google, Slack, chave privada, `password`/`token`/`secret`). Sem e-mail, caminho pessoal ou token de desafio |
| LabFlow | Não acessado |

## 3. Staging, revisão e commit

**Staging explícito** dos 21 arquivos, sem `git add .`. Ficaram 21 no staging e 0 fora dele.

| Grupo | Arquivos |
|---|---|
| Modificados (12) | `README.md`, `app/globals.css`, `app/layout.tsx`, `app/not-found.tsx`, `components/navigation/menu-movel.tsx`, `components/presentation/curvas-de-nivel.tsx`, `components/presentation/hero.tsx`, `components/presentation/mato-grosso.tsx`, `docs/arquitetura/ARQUITETURA_INICIAL.md`, `lib/config/site.ts`, `next.config.ts`, `package.json` |
| Código e recursos novos (6) | `app/robots.ts`, `app/sitemap.ts`, `scripts/gerar-decoracao.mjs`, `public/decoracao/curvas-hero.svg`, `public/decoracao/curvas-painel.svg`, `public/decoracao/curvas-mato-grosso.svg` |
| Relatórios (3) | `docs/RELATORIO_VALIDACAO_PRODUCAO.md`, `docs/RELATORIO_FASE_10D_3.md`, `docs/RELATORIO_AUDITORIA_10D_3_1.md` |

**Revisão:**
- O diff dos arquivos de código e documentação foi lido na íntegra e corresponde ao que foi auditado na 10D.3.1.
- Os 3 SVG e os 3 relatórios foram conferidos por hash: o conteúdo no staging é idêntico ao arquivo auditado.
- O relatório da 10D.2 entrou **sem alteração**.
- Nenhuma credencial e nenhuma alteração fora do escopo.

**Commit:**

| Campo | Valor |
|---|---|
| Hash | **`2874341fb634ecf5cb765681762db48ed980ed12`** |
| Mensagem | `feat: aprimora acessibilidade, desempenho e SEO do Bem-te-vi` (mais a linha de coautoria da IA) |
| Autor | `NauamB` |
| Pai | `5389a0fd5b2f33788a52562f22e9d9b0c33bf99b` |
| Conteúdo | 21 arquivos, +875/−68 |
| Código de saída | 0 |

## 4. Push

`git push origin main` (normal, sem force):

```
To https://github.com/NauamB/bem-te-vi.git
   5389a0f..2874341  main -> main
```

**Código de saída 0.** HEAD local, `origin/main` e `main` remoto (`git ls-remote`) = `2874341fb634ecf5cb765681762db48ed980ed12`.

## 5. Implantação na Vercel

- **Mecanismo:** a integração Git/Vercel que já estava configurada, que publica status de commit no GitHub (contexto `Vercel`). Não usei CLI, token nem configuração nova. O Firewall não foi alterado.
- **Acompanhamento** pela API pública do GitHub (`/commits/2874341…/status`), com consultas a cada 20 s:
  - 14:51:07 e 14:51:27: `pending — Vercel is deploying your app` (criado às 18:51:01Z);
  - 14:51:47: **`success — Deployment has completed`** (18:51:19Z).
- **O commit implantado é o `2874341`.** Antes, o vínculo era indireto; desta vez a correspondência é demonstrada pelo próprio conteúdo:
  - `/robots.txt` e `/sitemap.xml` passaram de 404 (versão `5389a0f`) para 200, com o conteúdo novo;
  - `/` agora tem 69.983 B, contra 218.175 B antes; é o tamanho local (69.733 B) mais a diferença constante da Vercel (~250 B);
  - a 404 passou a ter o título "Página não encontrada · Bem-te-vi";
  - os 3 SVG são servidos com conteúdo **byte a byte idêntico** aos do repositório.

## 6. Validação da produção

Foram 11 requisições `curl`, com 4 s ou mais entre elas. **Nenhuma resposta teve `X-Vercel-Mitigated`.** Todos os resultados abaixo foram **efetivamente observados**. Não houve automação de navegador em produção, para não acionar de novo a proteção da Vercel, e nenhuma tentativa de contornar o Security Checkpoint.

| Rota | Status | Tamanho | Cache Vercel | Conteúdo verificado |
|---|---|---|---|---|
| `/` | **200** | 69.983 B | PRERENDER | Título e H1 corretos; fundos `url(/decoracao/…)` dos 3 SVG; caminhos SVG inline só da marca (674 B); `og:site_name` e `og:locale=pt_BR` |
| `/explorar` | **200** | 38.741 B | PRERENDER | "Explorar biodiversidade · Bem-te-vi"; aviso "Os dados ainda estão sendo preparados" |
| `/acesso` | **200** | 20.768 B | PRERENDER | Meta `noindex, nofollow` **e** cabeçalho `X-Robots-Tag: noindex, nofollow`; "Não configurada"; sem formulário de login |
| `/robots.txt` | **200** `text/plain` | 79 B | MISS | `User-Agent: *` / `Allow: /` / `Sitemap: https://bem-te-vi-zeta.vercel.app/sitemap.xml` |
| `/sitemap.xml` | **200** `application/xml` | 235 B | MISS | Só `https://bem-te-vi-zeta.vercel.app` e `…/explorar`; `/acesso` ausente |
| `/pagina-inexistente-10d32` | **404** | 10.793 B | MISS | "Página não encontrada · Bem-te-vi"; **uma** meta `robots` (`noindex`); link "Voltar à apresentação" |
| `http://…/robots.txt` | **308** → `https://…/robots.txt` | — | — | HTTPS forçado |

**Cache dos SVG:**

| Arquivo | Status | Tamanho | `Cache-Control` | ETag | Conteúdo × repositório |
|---|---|---|---|---|---|
| `curvas-hero.svg` | 200 `image/svg+xml` | 17.156 B | `public, max-age=0, must-revalidate` | `"381adb3b…"` | Idêntico |
| `curvas-painel.svg` | 200 `image/svg+xml` | 24.353 B | idem | `"f10b50ec…"` | Idêntico |
| `curvas-mato-grosso.svg` | 200 `image/svg+xml` | 24.382 B | idem | `"4977ef7d…"` | Idêntico |

A revalidação condicional (`If-None-Match` com o ETag do hero) respondeu **304 Not Modified** (`X-Vercel-Cache: HIT`). Na prática, o SVG é baixado uma vez e, nas visitas seguintes, o navegador só confirma que não mudou, sem baixar de novo. **Não** há cache longo (`immutable`), que é o padrão da Vercel para `public/` (ver pendências).

**Cabeçalhos de segurança:** presentes nas **9 respostas** (6 de 6 em cada: páginas, 404, `robots.txt`, `sitemap.xml` e os 3 SVG).
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (Vercel);
- `X-Content-Type-Options: nosniff`;
- `X-Frame-Options: DENY`;
- `Referrer-Policy: strict-origin-when-cross-origin`;
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`;
- `Cross-Origin-Opener-Policy: same-origin`;
- sem `X-Powered-By`;
- CSP ausente (não implementada, como decidido);
- `Access-Control-Allow-Origin: *` continua (padrão da Vercel, já registrado na 10D.2).

**Credenciais nas respostas de produção:** 0 ocorrências.

## 7. Limitações e pendências

1. **Interatividade não testada em produção.** JavaScript em execução, foco do menu, teclado e larguras foram validados na 10D.3 sobre o build local idêntico (capturas iguais pixel a pixel na 10D.3.1). Em produção, a verificação foi por HTTP e conteúdo, sem navegador automatizado, por causa do risco documentado de acionar a proteção da Vercel. Recomenda-se uma conferência manual num navegador comum, no celular e no computador.
2. **Cache dos SVG** com `max-age=0, must-revalidate` (revalidação com 304). Um cache longo exigiria nomes versionados ou cabeçalho próprio para `/decoracao/*`; é decisão para fase futura.
3. **CSP** não implementada (proposta na 10D.3).
4. **7 vulnerabilidades moderadas de desenvolvimento** sem atualização, conforme decidido (caminho vulnerável não executado; ver 10D.3.1).
5. **Este relatório** não foi commitado; depende de autorização.
6. **Testes automatizados versionados** ainda inexistentes.

## 8. Estado final do Git

- Branch `main`, HEAD `2874341fb634ecf5cb765681762db48ed980ed12`, igual a `origin/main` e ao `main` remoto (`## main...origin/main`).
- Nenhum arquivo rastreado modificado.
- Único arquivo não rastreado: `docs/RELATORIO_PUBLICACAO_FASE_10D_3.md` (este).
- Nada foi feito no SEMA LabFlow, na CSP, nas dependências, no Supabase ou no banco de dados.
