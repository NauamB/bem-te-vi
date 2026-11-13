# lib/supabase

Organização prevista dos clientes Supabase. **Nesta fase (10C) nenhum cliente existe e nenhuma biblioteca do Supabase está instalada.**

| Arquivo | Situação | Papel |
|---|---|---|
| `config.ts` | Existe | Lê só a configuração **pública** (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`); devolve `null` se ausente |
| `client.ts` | Previsto (fase de autenticação) | `createBrowserClient` do `@supabase/ssr`, para Client Components, com a chave publicável |
| `server.ts` | Previsto (fase de autenticação) | `createServerClient` do `@supabase/ssr`, um por requisição, com cookies; proteção de páginas por `getClaims()` (não `getSession()`) |
| `proxy.ts` (raiz do app) | Previsto | Renovação de sessão (convenção `proxy` do Next.js 16) |
| `admin.ts` | Previsto, **somente servidor** | Cliente com a chave secreta, apenas para rotinas internas; nunca importado por componente cliente |

Regras:
1. A chave secreta (`service_role` / `sb_secret_…`) ignora o RLS: nunca no navegador, nunca com prefixo `NEXT_PUBLIC_`.
2. Toda tabela exposta terá RLS habilitado; regras críticas ficam no banco, não só no Next.js.
3. Autenticar não autoriza: perfis vêm de tabela própria, não de `user_metadata` (editável pelo usuário).

Detalhes em `docs/arquitetura/ARQUITETURA_INICIAL.md`.
