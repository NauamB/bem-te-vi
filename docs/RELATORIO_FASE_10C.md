# Relatório da Fase 10C — Fundação do Bem-te-vi

Data: 13/11/2026, das 13:15 às 13:45 aproximadamente (horário local, −04:00).

## 1. Caminho do novo projeto

`~/Downloads/bem-te-vi`. A pasta não existia antes da fase. O projeto é independente do SEMA LabFlow e tem histórico Git próprio.

## 2. Versões

| Item | Versão |
|---|---|
| Node.js / npm | 26.13.0 / 11.20.0 (o Next exige Node ≥ 20.9.0) |
| create-next-app | 16.4.6 (`latest` em 13/11/2026) |
| Next.js | 16.4.6 (App Router, Turbopack, Cache Components, Partial Prefetching) |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS / `@tailwindcss/turbopack` | 4.3.3 |
| ESLint / `eslint-config-next` | 9.39.5 / 16.4.6 |
| Git | 2.56.0.windows.4 |
| GitHub CLI | **Não instalado** |

Dependências de runtime: só `next`, `react` e `react-dom`. Não foi instalada nenhuma biblioteca de Supabase, mapas, gráficos, ícones ou autenticação.

Comando de criação:

```bash
create-next-app@16.4.6 bem-te-vi --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --disable-git --no-react-compiler --empty --yes
```

O `--disable-git` evitou o commit inicial automático do create-next-app.

## 3. Estrutura criada

```
.env.example  .gitignore  AGENTS.md  README.md  eslint.config.mjs  next.config.ts  package.json  package-lock.json  tsconfig.json
app/  layout.tsx  globals.css  icon.svg  not-found.tsx
      (publico)/layout.tsx  (publico)/page.tsx  (publico)/explorar/page.tsx
      (interno)/layout.tsx  (interno)/acesso/page.tsx
components/layout/      cabecalho.tsx  rodape.tsx  marca.tsx
components/navigation/  menu-movel.tsx
components/presentation/ hero.tsx  biodiversidade-integrada.tsx  principios.tsx  mato-grosso.tsx  estado-do-projeto.tsx  curvas-de-nivel.tsx
components/ui/          botao-link.tsx  rotulo.tsx
lib/config/site.ts
lib/supabase/           config.ts  README.md
types/informacao.ts
supabase/migrations/README.md
public/brand/bem-te-vi-marca.svg
docs/produto/VISAO_PRODUTO.md  docs/arquitetura/ARQUITETURA_INICIAL.md  docs/governanca/PRINCIPIOS_DE_GOVERNANCA.md  docs/dados/ESTRATEGIA_DE_DADOS.md  docs/RELATORIO_FASE_10C.md
```

Ajustes em relação à estrutura de referência:
- A página inicial fica em `app/(publico)/page.tsx`, para compartilhar cabeçalho e rodapé com o observatório.
- `lib/utils/` e `public/images/` **não foram criados**: não há utilitários nem imagens com licença verificada, e criar pastas vazias não teria finalidade.

## 4. Funcionalidades realmente implementadas

1. **Página de apresentação** (`/`):
   - cabeçalho com marca, navegação institucional e os botões "Explorar biodiversidade" e "Acesso interno";
   - hero com o título e o subtítulo definidos e os botões "Explorar biodiversidade" (`/explorar`) e "Conhecer a plataforma" (`/#plataforma`);
   - seções Biodiversidade integrada (Flora, Fauna, Território), Inteligência baseada em dados (os 5 princípios e as 6 naturezas da informação, marcadas como modelo previsto), Mato Grosso (três biomas em descrição qualitativa, 142 municípios segundo o IBGE, arquitetura nacional) e Estado do projeto (disponível × em preparação);
   - rodapé com nome, descrição, versão 0.1.0, links e aviso de natureza do projeto.
2. **`/explorar`:** estado informativo "Os dados ainda estão sendo preparados" (`role="status"`) e lista dos módulos previstos, cada um marcado "Previsto".
3. **`/acesso`:** acesso interno em construção, **sem formulário e sem simulação de login**. Mostra se a configuração pública do Supabase existe (hoje: "Não configurada"). Tem `noindex`.
4. **Página 404** em português.
5. **Menu móvel** acessível (`aria-expanded`/`aria-controls`), que fecha com Esc e ao escolher um destino.
6. **Identidade visual:**
   - verde-floresta institucional, ocre do Cerrado, azul-esverdeado do Pantanal e amarelo-sol como acento;
   - fontes Fraunces, Inter e IBM Plex Mono;
   - marca própria em SVG: lente com três faixas de relevo e um ponto de observação, **sem pássaro**;
   - curvas de nível geradas de forma determinística, com legenda explícita "não é mapa e não representa dados".
   - Sem fotografias, porque não há imagens com licença e origem verificáveis.
7. **Acessibilidade:** link "Ir para o conteúdo", foco visível, `lang="pt-BR"`, movimento reduzido respeitado e alvos de toque ≥ 44 px.
8. **Cabeçalhos de segurança:** `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` e COOP; sem `X-Powered-By`.
9. **Preparação para o Supabase:** `.env.example` sem valores e `lib/supabase/config.ts`, que lê só a configuração pública e nunca a chave secreta. A organização prevista dos clientes está em `lib/supabase/README.md`.

**Não implementado** (por escopo): dados científicos, banco, tabelas, migrações, autenticação, OAuth, perfis, mapas, painel interno, CSP, testes automatizados e publicação.

## 5. Documentos criados

`README.md`, `AGENTS.md` (bloco do Next.js gerado mais as regras do projeto), `docs/produto/VISAO_PRODUTO.md`, `docs/arquitetura/ARQUITETURA_INICIAL.md`, `docs/governanca/PRINCIPIOS_DE_GOVERNANCA.md`, `docs/dados/ESTRATEGIA_DE_DADOS.md`, `lib/supabase/README.md`, `supabase/migrations/README.md` e este relatório.

## 6. Lint

`npm run lint` (ESLint 9, `eslint-config-next` core-web-vitals + typescript): **código de saída 0**, sem avisos. Executado após a primeira versão e de novo no estado final.

## 7. Build

`npm run build`: **código de saída 0**. Compilação concluída e TypeScript sem erros. Saída final:

```
Route (app)
┌ ○ /
├ ○ /_not-found
├ ○ /acesso
├ ○ /explorar
└ ○ /icon.svg
○  (Static)  prerendered as static content
```

## 8. Validação em execução

Servidor de produção (`next start`, porta 3100, só em 127.0.0.1), encerrado ao final:

- **HTTP:** `/` 200, `/explorar` 200, `/acesso` 200, `/icon.svg` 200, `/nao-existe` 404.
- **Cabeçalhos de segurança** presentes na resposta.
- **Textos obrigatórios** encontrados no HTML: título, subtítulo, os três botões, âncora `#plataforma`, princípios e `lang="pt-BR"`.
- **Responsividade:** medida com emulação exata de largura via DevTools Protocol do Edge sem interface gráfica, em 7 larguras (360, 390, 430, 768, 1024, 1366 e 1920) e nas 3 páginas, num total de 21 combinações. **Nenhuma rolagem horizontal** (`scrollWidth` = `clientWidth` em todas). Nenhum alvo de toque abaixo de 44 px depois do ajuste dos links do desktop.
- **Menu móvel em 360 px:** começa fechado; abre com os 6 destinos; fecha com Esc; ao escolher "Princípios", fecha e navega para `#principios`.
- **Revisão visual** por capturas em 360, 768 e 1366 px (desktop e celular conferidos).
- **Observação:** a primeira captura simples com `--window-size=360` saiu cortada. O motivo é que o Chromium sem interface gráfica não reduz a janela abaixo de ~500 px. A medição por emulação confirmou que a página não transborda.
- **Onde estão os artefatos:** capturas e script de verificação ficam no diretório temporário da sessão do Claude Code, fora do projeto (`scratchpad\responsivo-10c\`, `scratchpad\capturas-10c\`, `scratchpad\verificar-responsivo.mjs`).

**Ainda não há testes automatizados versionados no projeto.** Essa validação foi manual e assistida por script.

## 9. Segurança e dependências

- `npm audit --omit=dev`: **0 vulnerabilidades** em produção.
- `npm audit` completo: **7 moderadas**, todas em ferramentas de desenvolvimento (`minimatch` via `typescript-eslint`, que vem com `eslint-config-next`). O `npm audit fix` sem `--force` não as resolve, e não usei `--force` para não quebrar a compatibilidade com o `eslint-config-next`. Reavaliar em próxima atualização.
- O npm avisa que o ESLint 9.39.5 está descontinuado (*deprecated*). É a versão exigida pelo `eslint-config-next` 16.4.6.
- **Credenciais:** a busca por padrões de chave (Supabase, JWT, GitHub, AWS, chave privada, `password=`) nos 40 arquivos que serão versionados não encontrou nada. O `.env.example` está sem valores e não existe `.env.local`.
- `.gitignore` ignora `.env*` (com exceção de `!.env.example`), `.next/`, `node_modules/` e `next-env.d.ts`.
- **Telemetria:** o Next.js coleta telemetria anônima por padrão. Não desativei, porque isso altera a configuração do usuário (`next telemetry disable`). Fica para decisão.

## 10. Git

- `git init -b main` executado só na nova pasta. Branch `main`, **sem commits**, sem remoto e sem push.
- 40 arquivos não rastreados, prontos para o primeiro commit (que depende de autorização).
- **LabFlow:** nenhum comando Git foi executado nele e nenhum arquivo foi copiado dele. Os hashes de `data/`, dos 17 arquivos pendentes e do `.git/index` foram conferidos ao final e estão inalterados. O backup da Fase 10B não foi tocado.

## 11. GitHub CLI e disponibilidade do nome

- **GitHub CLI:** não instalado (`gh` ausente do PATH e dos caminhos padrão). Não foi possível verificar autenticação. Não instalei.
- **Nome `bem-te-vi`:** consultei a API pública do GitHub, de forma anônima e só para leitura, assumindo o mesmo dono do LabFlow (`NauamB`). Resultado:
  - **`NauamB/bem-te-vi` já existe e é PÚBLICO**: criado em 13/11/2026 às 17:28 UTC (13:28 no horário local, durante esta fase), vazio (0 KB), branch padrão `main`, descrição "Projeto Piloto Versão Final".
  - Não foi criado por esta sessão: o `gh` não está instalado e não houve push. Não alterei esse repositório.
  - **Atualização (Fase 10D.1):** o proprietário confirmou que o repositório foi criado por ele e que a visibilidade **pública é intencional**, para permitir o acesso e a avaliação pela banca da competição. O ponto deixou de ser conflito ou pendência. A publicação pública não concede licença de uso (ver `docs/governanca/PRINCIPIOS_DE_GOVERNANCA.md`).
  - A consulta anônima não enxerga repositórios privados de outras contas ou organizações.

## 12. Dependências e limitações

1. Os textos da página têm um único fato numérico: 142 municípios, segundo o IBGE. Os biomas aparecem só em descrição qualitativa. Nenhum indicador.
2. CSP ainda não definida (decisão junto com a autenticação).
3. Sem testes automatizados no repositório.
4. As fontes tipográficas são baixadas do Google Fonts **durante o build** (o `next/font` as embute). O build precisa de rede, mas o navegador não acessa o Google.
5. A marca é uma proposta inicial, ainda não validada.
6. Titularidade e licença do projeto continuam indefinidas.
7. O repositório `NauamB/bem-te-vi` é público por decisão do proprietário (item 11). Não há licença definida; a publicação não autoriza reutilização.

## 13. Próxima fase recomendada

**Fase 10D — consolidação do repositório e da qualidade**, mediante autorização:
1. Publicar no repositório remoto `NauamB/bem-te-vi`, público por decisão do proprietário, confirmada na Fase 10D.1.
2. Revisar a apresentação e a marca.
3. Fazer o primeiro commit.
4. Adicionar testes automatizados (Playwright para as rotas, responsividade e acessibilidade) e CI.
5. Adicionar `LICENSE`, `SECURITY.md` e `CONTRIBUTING.md` quando a titularidade estiver definida.
6. Registrar os ADRs 0001 a 0004 (pilha, repositório, natureza da informação, ingestão fora do serverless).

Depois disso vêm a modelagem do banco e a primeira prova de conceito com fonte aberta (Flora e Funga do Brasil).
