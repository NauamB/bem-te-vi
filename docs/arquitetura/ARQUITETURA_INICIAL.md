# Arquitetura inicial — Bem-te-vi

Versão 0.1.0, 13/11/2026, Fase 10C. A seção 1 descreve o que **existe**. As demais descrevem a arquitetura **prevista**, ainda não implementada.

## 1. O que existe (v0.1.0)

| Camada | Tecnologia | Situação |
|---|---|---|
| Aplicação web | Next.js 16.4.6 (App Router, Turbopack), React 19.3, TypeScript 5 | Implementada: 3 rotas estáticas (`/`, `/explorar`, `/acesso`) e página 404 |
| Estilo | Tailwind CSS 4.3, tokens em `app/globals.css` (`@theme`) | Implementado |
| Fontes tipográficas | `next/font/google` (Fraunces, Inter, IBM Plex Mono; SIL OFL), embutidas no build | Implementado |
| Renderização | `cacheComponents: true` e `partialPrefetching: true`, padrões do create-next-app 16.4. As 3 rotas são pré-renderizadas como estáticas | Implementado |
| Cabeçalhos de segurança | `next.config.ts`: `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, COOP; `poweredByHeader: false`; `X-Robots-Tag: noindex, nofollow` em `/acesso` (Fase 10D.3). CSP: proposta em `docs/RELATORIO_FASE_10D_3.md`, ainda não ativada | Implementado |
| SEO técnico (Fase 10D.3) | `app/robots.ts` e `app/sitemap.ts` (só `/` e `/explorar`), `metadataBase` e Open Graph básico; 404 com título próprio | Implementado |
| Decoração (Fase 10D.3) | Curvas de nível como SVG estático em `public/decoracao/`, gerado por `scripts/gerar-decoracao.mjs` e aplicado como fundo CSS (fora do HTML e do payload do React) | Implementado |
| Supabase | `lib/supabase/config.ts` lê só a configuração pública e devolve `null` se ausente; **nenhuma biblioteca instalada** | Preparado |
| Banco | — | Não existe |
| Autenticação | — | Não existe (sem simulação) |
| Hospedagem | — | Não publicado |

### Organização do código

```
app/layout.tsx              raiz: idioma pt-BR, fontes, metadados, link "Ir para o conteúdo"
app/(publico)/layout.tsx    cabeçalho + rodapé do observatório público
app/(publico)/page.tsx      página de apresentação
app/(publico)/explorar/     observatório (estado: dados em preparação)
app/(interno)/layout.tsx    casca do ambiente interno
app/(interno)/acesso/       acesso interno em construção (noindex)
components/layout/          cabeçalho, rodapé, marca
components/navigation/      menu móvel (único Client Component)
components/presentation/    seções da apresentação, curvas de nível
components/ui/              botão-link, rótulo
lib/config/site.ts          identidade, navegação, rotas
lib/supabase/               configuração pública + organização prevista dos clientes
types/informacao.ts         natureza da informação (6 categorias)
```

Os grupos de rota `(publico)` e `(interno)` separam o observatório e o ambiente interno sem mudar as URLs. Quando houver autenticação, a proteção ficará no layout e no `proxy` do grupo interno **e** no banco (RLS).

## 2. Arquitetura prevista

> **16/11/2026:** para o piloto demonstrativo e não comercial, esta seção é detalhada e simplificada pelo [ADR-0001](ADR-0001-arquitetura-do-piloto.md), ainda em proposta. Principais mudanças:
> - Vercel Hobby e Supabase Free;
> - ingestão só por workflow manual;
> - sem autenticação no piloto;
> - Flora e Funga do Brasil como referência taxonômica;
> - lote inicial controlado.

```
Navegador ──► Next.js na Vercel (região gru1, a confirmar)
               ├─ (publico): leitura com chave publicável + RLS do papel anon
               └─ (interno): sessão @supabase/ssr; getClaims() no servidor
                        │
                        ▼
               Supabase (região sa-east-1)
               ├─ Auth: login Google; perfis em tabela própria
               ├─ PostgreSQL + PostGIS: base de consulta
               ├─ RLS em todas as tabelas expostas
               └─ Storage: arquivos de lotes, quando a licença permitir
                        ▲
                        │ chave secreta (só em secrets de CI)
               Ingestão: GitHub Actions agendado ou worker
               (baixar → validar → bruto → normalizar → derivar → relatório do lote)
```

### 2.1 Supabase Auth
- Login Google: escopos `openid`, `email` e `profile`. O Client ID e o segredo ficam só no painel do Supabase e no Google Cloud.
- Sessões por cookies via `@supabase/ssr`. No servidor, proteção com `getClaims()`, nunca `getSession()`.
- **Autenticar não autoriza.** Perfis ficam em tabela própria (`user_roles`), entram no JWT por *Custom Access Token Hook* e são reconferidos no banco para ações sensíveis. Nunca usar `user_metadata`, que o próprio usuário pode editar.
- Perfis a avaliar: administração, gestão, análise, revisão e consulta interna. Ninguém revisa o próprio registro.

### 2.2 PostgreSQL / PostGIS
Domínios previstos: espécies e nomes, registros de ocorrência, fontes e conjuntos de dados, municípios, biomas, áreas protegidas, geometrias, importações (lotes) e auditoria. A separação por natureza da informação está em `docs/dados/ESTRATEGIA_DE_DADOS.md`.

**Nenhuma tabela foi criada.** A modelagem é fase própria e começa por ADR.

### 2.3 Segurança e controle de acesso
1. A chave secreta (`service_role` / `sb_secret_…`) ignora o RLS. Ela só existe em variáveis de servidor e em secrets de CI. Nunca no navegador, nunca com `NEXT_PUBLIC_`.
2. RLS habilitado em toda tabela exposta, com teste automatizado que falha se faltar.
3. Regras críticas ficam no banco: transições de estado, auditoria append-only (sem `UPDATE`/`DELETE`) e `auth.uid()` gravado por trigger.
4. A área pública lê apenas *views* com coordenadas generalizadas para táxons sensíveis.
5. **CSP pendente:** com nonce, ela exige renderização dinâmica, o que conflita com páginas estáticas. Será decidida junto com a autenticação, avaliando CSP com hash ou nonce só no grupo interno.
6. LGPD: o login Google trata nome, e-mail e foto. Antes de qualquer login real, é preciso aviso de privacidade, base legal, encarregado e avaliação de transferência internacional.

### 2.4 Ingestão
Coletas longas não cabem em funções serverless, por causa dos limites de tempo e memória da Vercel e das Edge Functions. Elas rodarão em GitHub Actions agendado ou em worker dedicado. Cada execução gera um lote com contagens, hash e situação (`ok`, `parcial` ou `falha`). Falha da fonte não apaga dado anterior. Os testes de conectores usam fonte simulada, nunca a rede.

### 2.5 Mapas (fase própria)
O candidato é MapLibre GL, com vector tiles: `ST_AsMVT` para camadas dinâmicas e PMTiles pré-gerados para camadas estáticas grandes. Os tiles de `tile.openstreetmap.org` não servem para produção com uso intenso. **Nenhuma biblioteca de mapa foi instalada.**

### 2.6 Hospedagem (Vercel)
O plano Hobby é restrito a uso pessoal ou não comercial e só permite cron diário. O enquadramento do projeto ainda precisa ser decidido. A publicação não foi feita.

## 3. Decisões registradas nesta fase

| Decisão | Motivo |
|---|---|
| Manter `cacheComponents` e `partialPrefetching` (padrões do Next 16.4) | Páginas estáticas não precisam de adaptação; evita divergir do padrão do framework |
| Não instalar `@supabase/ssr` nem `@supabase/supabase-js` | Sem uso real nesta fase; evita dependência ociosa |
| Sem biblioteca de mapas, gráficos ou ícones | Fora do escopo da fundação |
| Uma única Client Component (menu móvel) | Mantém a apresentação estática e leve |
| Sem fotografias | Não há imagens com licença e origem verificadas; a identidade usa marca e curvas de nível próprias, em SVG |

## 4. Pendências

CSP; região e plano da Vercel; plano do Supabase (o Free não tem backup automático e pausa por inatividade); biblioteca e base cartográfica; ADR do modelo de dados; política de privacidade.
