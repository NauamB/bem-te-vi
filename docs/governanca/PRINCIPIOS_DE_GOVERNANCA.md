# Princípios de governança — Bem-te-vi

Versão 0.1.0, 13/11/2026, Fase 10C. São princípios e regras propostos. A configuração do GitHub (proteção de branch, revisões, CODEOWNERS) **ainda não foi feita**, porque não existe repositório remoto.

## 1. Natureza do projeto

- Projeto independente, em desenvolvimento, **sem vínculo oficial** com a SEMA-MT, o Governo de Mato Grosso, universidades ou outras instituições. Nenhum texto, marca ou metadado deve sugerir o contrário.
- **Titularidade e licença não definidas.** O repositório do Bem-te-vi é público para permitir acesso e avaliação pela banca da competição. A publicação pública não representa concessão de licença aberta ou autorização irrestrita de reutilização do código. Até que a titularidade e a licença sejam formalmente definidas, aplicam-se os direitos autorais padrão e os termos da plataforma GitHub.
- O projeto não herda código do SEMA LabFlow. Conceitos inspirados nele (proveniência, decisão humana, integridade) foram reescritos. Qualquer reaproveitamento de código depende de autorização dos titulares do LabFlow.

## 2. Princípios

1. **Proveniência obrigatória.** Nenhuma informação é exibida sem fonte, licença e data.
2. **Separação por natureza da informação.** Dado original, tratado, derivado, registro de usuário, interpretação e decisão humana nunca se misturam.
3. **Humano no circuito.** Regras e IA consultam e propõem. Validar, aprovar e publicar cabe a pessoas autorizadas e identificadas.
4. **Sem conclusões indevidas.** Registro de espécie não indica infração, degradação ou responsável.
5. **Lacuna é informação.** Falta de dado é declarada, não preenchida.
6. **Sem dados fictícios.** Nenhum indicador, registro, usuário ou senha inventado em código, interface ou documentação.
7. **Mínimo privilégio.** Chaves, perfis e acessos no menor escopo necessário.
8. **Mudanças rastreáveis.** Toda mudança relevante passa por revisão e fica registrada.

## 3. Estrutura documental

| Pasta ou arquivo | Conteúdo | Situação |
|---|---|---|
| `README.md` | Visão rápida, comandos, aviso de natureza do projeto | Criado |
| `AGENTS.md` | Regras para agentes de código (Next.js e projeto) | Criado |
| `docs/produto/` | Visão, escopo, requisitos | `VISAO_PRODUTO.md` criado |
| `docs/arquitetura/` | Arquitetura, ADRs | `ARQUITETURA_INICIAL.md` criado; ADRs pendentes |
| `docs/governanca/` | Este documento | Criado |
| `docs/dados/` | Estratégia, catálogo de fontes, licenças, sensíveis | `ESTRATEGIA_DE_DADOS.md` criado |
| `CHANGELOG.md`, `CONTRIBUTING.md`, `SECURITY.md`, `LICENSE`, `.github/CODEOWNERS`, modelos de PR | — | Previstos para quando houver repositório remoto e titularidade definida |

## 4. Controle de mudanças (previsto)

- O único caminho para `main` é o pull request. Sem push direto, sem force push, sem exclusão da branch.
- Checks obrigatórios: lint, tipos, build e, quando houver, testes e verificação de RLS.
- Revisão humana obrigatória. Migrações, RLS e autenticação exigem atenção redobrada. Com uma única pessoa desenvolvedora, a revisão por outra pessoa não é possível no GitHub; a alternativa será registrada antes da configuração.
- Commits no padrão Conventional Commits. Versionamento SemVer com CHANGELOG.
- Decisões de arquitetura e de dados em ADR: contexto, decisão, alternativas e consequências.
- Contribuições assistidas por IA identificadas no commit.

## 5. Segurança

- Repositório público, para acesso e avaliação pela banca da competição (ver §1). A publicação não concede licença.
- Secret scanning, push protection, Dependabot e 2FA ativados ao criar o remoto.
- `.env*` ignorado. Só `.env.example`, sem valores, é versionado.
- Chave secreta do Supabase só em variáveis de servidor e secrets de CI.
- Vulnerabilidades reavaliadas a cada atualização de dependências. As 7 de severidade moderada na cadeia de lint, que é só de desenvolvimento, estão registradas no relatório da fase.

## 6. Pendências que dependem de decisão humana

1. Titulares e licença do projeto.
2. Pessoas e papéis: responsáveis, revisores e administração.
3. Controlador e encarregado de dados pessoais (LGPD).
4. Conta ou organização definitiva do GitHub. Hoje o repositório é `NauamB/bem-te-vi`, público por decisão do proprietário.
5. Política de espécies sensíveis e de uso de licenças CC BY-NC.
