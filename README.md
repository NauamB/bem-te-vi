# Bem-te-vi — Plataforma de Inteligência da Biodiversidade

*Mato Grosso · Flora · Fauna · Território*

Plataforma de inteligência da biodiversidade que conectará informações sobre espécies, ocorrências e territórios, com origem identificada para cada informação. Território inicial: Mato Grosso; arquitetura preparada para expansão nacional.

> **Estado: v0.1.0 — fundação (Fase 10C).** Existe apenas a página de apresentação, duas páginas informativas e a documentação. **Nenhum dado de biodiversidade, autenticação ou banco está implementado.**
>
> Projeto independente em desenvolvimento. Não é serviço oficial da SEMA-MT, do Governo de Mato Grosso, de universidade ou de qualquer instituição.

## O que existe

| Rota | Conteúdo |
|---|---|
| `/` | Página de apresentação (hero, biodiversidade integrada, princípios, Mato Grosso, estado do projeto) |
| `/explorar` | Observatório público: estado "dados em preparação" e módulos previstos |
| `/acesso` | Acesso interno em construção (sem login e sem simulação), `noindex` |

## Requisitos e comandos

Node.js ≥ 20.9 (testado com 26.13.0) e npm.

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:3000
npm run lint     # ESLint
npm run build    # build de produção
npm run start    # serve o build
npm run decoracao:gerar      # regenera as curvas de nível decorativas (public/decoracao/)
npm run decoracao:verificar  # confere se os SVGs decorativos estão atualizados (código 1 se não)
```

Variáveis de ambiente: ver `.env.example` (nenhuma é obrigatória nesta fase; nunca versione `.env.local`).

## Tecnologia

Next.js 16.4 (App Router, Turbopack, Cache Components) · React 19.3 · TypeScript 5 · Tailwind CSS 4.3 · ESLint 9. Previstos: Supabase (Auth com Google, PostgreSQL + PostGIS, RLS) e hospedagem na Vercel.

## Estrutura

```
app/                  rotas (App Router)
  (publico)/          apresentação e observatório público (com cabeçalho e rodapé)
  (interno)/          ambiente interno (futuro: autenticação e perfis)
components/           layout/, navigation/, presentation/, ui/
lib/config/           identidade e navegação
lib/supabase/         configuração pública e organização prevista dos clientes
types/                tipos de domínio (natureza da informação)
supabase/migrations/  reservado; sem migrações nesta fase
public/brand/         marca (SVG próprio)
public/decoracao/     curvas de nível decorativas (SVG gerado por scripts/gerar-decoracao.mjs)
scripts/              utilitários de desenvolvimento (sem dependências)
app/robots.ts, app/sitemap.ts   robots.txt e sitemap.xml (só páginas públicas existentes)
docs/                 produto/, arquitetura/, governanca/, dados/, RELATORIO_FASE_10C.md
```

## Documentação

- [Visão do produto](docs/produto/VISAO_PRODUTO.md)
- [Arquitetura inicial](docs/arquitetura/ARQUITETURA_INICIAL.md)
- [Princípios de governança](docs/governanca/PRINCIPIOS_DE_GOVERNANCA.md)
- [Estratégia de dados](docs/dados/ESTRATEGIA_DE_DADOS.md)
- [Relatório da Fase 10C](docs/RELATORIO_FASE_10C.md)

## Licença

**Não definida.** Até a decisão dos titulares, nenhum direito de uso é concedido a terceiros.
