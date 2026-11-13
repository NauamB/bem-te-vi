<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Regras do projeto Bem-te-vi

- Textos de interface e documentação em português do Brasil.
- Não criar dados científicos, indicadores, usuários ou senhas fictícios. Sem fonte verificada, a interface diz que o dado não existe.
- Não afirmar vínculo com SEMA-MT, Governo de Mato Grosso, universidades ou qualquer instituição.
- Não afirmar que funcionalidades futuras existem.
- Toda informação exibida deverá indicar fonte, licença e natureza (`types/informacao.ts`); dados originais, tratados, derivados, registros de usuário, interpretações e decisões humanas nunca se misturam.
- Chave secreta do Supabase nunca no navegador nem com prefixo `NEXT_PUBLIC_`. Não criar autenticação simulada.
- Imagens só com licença e origem registradas.
- Não fazer commit, push ou publicação sem pedido explícito.
