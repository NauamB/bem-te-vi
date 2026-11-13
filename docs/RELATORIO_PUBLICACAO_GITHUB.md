# Relatório de publicação no GitHub — Fase 10D.1

## 1. Data e hora

13/11/2026: auditoria inicial às 13:34; publicação concluída e verificada às 13:40 (horário local, −04:00).

## 2. Caminho do repositório

`~/Downloads/bem-te-vi`. Repositório Git próprio, independente do SEMA LabFlow.

## 3. Remoto

- URL: `https://github.com/NauamB/bem-te-vi.git` (`origin`, para leitura e envio).
- O remoto não existia localmente e foi adicionado nesta fase.

## 4. Visibilidade

**Pública, confirmada** por consulta anônima à API do GitHub: `visibility: public`, `private: false`. A página `https://github.com/NauamB/bem-te-vi` e o `README.md` bruto (`raw.githubusercontent.com`) responderam HTTP 200 sem autenticação.

A visibilidade pública é intencional, por decisão do proprietário, para a avaliação pela banca da competição. Ela **não** concede licença de uso (ver `docs/governanca/PRINCIPIOS_DE_GOVERNANCA.md`). A visibilidade não foi alterada.

## 5. Identidade usada no commit

- **Nome:** `NauamB`.
- **E-mail:** o autorizado pelo proprietário (mascarado aqui como `n*****1@gmail.com`). Ele fica público nos metadados do commit.
- **Escopo:** a identidade foi configurada **somente neste repositório** (`git config --local`). A configuração global do Git estava vazia e assim permaneceu: o hash da listagem global antes e depois é idêntico.

## 6. Auditoria de segurança

Feita antes do staging (duas vezes: antes e depois das correções) e de novo sobre o diff completo do staging, com 8.701 linhas.

| Verificação | Resultado |
|---|---|
| Senhas, tokens, chaves de API (Supabase, GitHub, AWS, Google, Slack, chave privada, `password=`/`token=`/`secret=`) | **Nenhum.** Único alerta: um hash de integridade `sha512` do `package-lock.json`, um falso positivo descartado |
| Credenciais Supabase | Nenhuma. `.env.example` só com nomes de variáveis, sem valores; `.env` e `.env.local` não existem |
| E-mails em arquivos | Nenhum |
| Caminhos locais com dados pessoais | Nenhum, depois da correção A (seção 7) |
| Informações institucionais restritas | Nenhuma. As menções à SEMA-MT e ao Governo de Mato Grosso são só avisos de que **não há** vínculo; o SEMA LabFlow é citado apenas como origem conceitual, sem código |
| Conteúdo de terceiros | Estrutura gerada pelo `create-next-app` 16.4.6 (incluindo o bloco do `AGENTS.md` gerado pelo Next.js). O `package-lock.json` tem 431 pacotes, todos resolvidos em `registry.npmjs.org`. Nenhuma imagem, fonte ou código copiado de terceiros. A marca e as curvas de nível são SVG próprios |
| `LICENSE` | Não existe; não foi criada (titularidade pendente) |

## 7. Correções documentais realizadas (autorizadas)

**A. `docs/RELATORIO_FASE_10C.md`**
- O caminho pessoal foi substituído por `~/Downloads/bem-te-vi`.
- Na seção 11, a linha que tratava a visibilidade pública como "conflito" virou a atualização: "o proprietário confirmou... pública é intencional".
- A seção 12, item 7, e a seção 13, item 1, foram atualizadas para tratar a visibilidade pública como decisão do proprietário.

**B. `docs/governanca/PRINCIPIOS_DE_GOVERNANCA.md`**
- Seção 1: aplicada a redação autorizada ("O repositório do Bem-te-vi é público para permitir acesso e avaliação pela banca da competição…").
- Seção 5: "Repositório privado." passou a "Repositório público, para acesso e avaliação pela banca da competição (ver §1). A publicação não concede licença."
- Seção 6, item 4: pendência atualizada, porque o repositório atual é `NauamB/bem-te-vi`, público.

Nenhum outro arquivo foi alterado. A aplicação ficou igual ao estado validado na Fase 10C (lint e build com código 0).

## 8. Arquivos incluídos e excluídos

**Incluídos: 41 arquivos, 8.455 linhas.**
- **Configuração:** `.env.example`, `.gitignore`, `AGENTS.md`, `README.md`, `eslint.config.mjs`, `next.config.ts`, `package.json`, `package-lock.json`, `tsconfig.json`.
- **`app/` (9):** `layout.tsx`, `globals.css`, `icon.svg`, `not-found.tsx`, `(publico)/layout.tsx`, `(publico)/page.tsx`, `(publico)/explorar/page.tsx`, `(interno)/layout.tsx`, `(interno)/acesso/page.tsx`.
- **`components/` (12):**
  - `layout/`: cabecalho, rodape, marca;
  - `navigation/`: menu-movel;
  - `presentation/`: hero, biodiversidade-integrada, principios, mato-grosso, estado-do-projeto, curvas-de-nivel;
  - `ui/`: botao-link, rotulo.
- **`lib/` (3):** `config/site.ts`, `supabase/config.ts`, `supabase/README.md`.
- **Outros:** `types/informacao.ts`, `public/brand/bem-te-vi-marca.svg`, `supabase/migrations/README.md`.
- **`docs/` (5):** `RELATORIO_FASE_10C.md`, `produto/VISAO_PRODUTO.md`, `arquitetura/ARQUITETURA_INICIAL.md`, `governanca/PRINCIPIOS_DE_GOVERNANCA.md`, `dados/ESTRATEGIA_DE_DADOS.md`.

**Excluídos:**

| Item | Motivo |
|---|---|
| `node_modules/` | Dependências instaladas; reproduzíveis por `npm install` (ignorado) |
| `.next/` | Saída de build (ignorado) |
| `next-env.d.ts` | Gerado pelo Next.js (ignorado por padrão) |
| `.env`, `.env.local` | Não existem; ignorados por `.env*` |
| Logs, temporários, backups, resultados de ferramentas | Não existem na pasta; capturas e scripts de verificação ficaram fora do projeto |
| `docs/RELATORIO_PUBLICACAO_GITHUB.md` (este arquivo) | Criado **depois** do push, porque registra o hash do primeiro commit. Foi publicado depois, num **segundo commit** autorizado só para ele (ver seção 14) |

## 9. Commit

- **Hash:** `e0bf27e6fbd286afa103f53c37f48199e0383678`.
- **Mensagem:** `feat: cria fundação inicial da plataforma Bem-te-vi`. O corpo tem a linha de coautoria `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, que identifica a assistência de IA, conforme o princípio de contribuições assistidas registrado na governança.
- **Resultado:** `git commit`, código de saída 0; 41 arquivos, 8.455 inserções.

## 10. Push

Comando: `git push -u origin main`. É um push normal: sem `--force`, sem `--force-with-lease`, sem reset e sem rebase.

```
To https://github.com/NauamB/bem-te-vi.git
 * [new branch]      main -> main
branch 'main' set up to track 'origin/main'.
```

**Código de saída: 0.** A autenticação usou o Git Credential Manager já configurado no sistema; nenhuma credencial foi exibida nem gravada pelo projeto.

## 11. Commit local × remoto

| Referência | Hash |
|---|---|
| `HEAD` local | `e0bf27e6fbd286afa103f53c37f48199e0383678` |
| `refs/heads/main` remoto (`git ls-remote`) | `e0bf27e6fbd286afa103f53c37f48199e0383678` |
| `origin/main` (referência local) | `e0bf27e6fbd286afa103f53c37f48199e0383678` |
| Último commit de `main` na API pública | `e0bf27e6fbd286afa103f53c37f48199e0383678` |

**Correspondem.** A árvore pública de `main` tem 41 arquivos, não truncada, e é **idêntica** à lista de arquivos rastreados localmente (`git ls-files`).

## 12. Estado final do Git

Estado ao final do primeiro push:
- Branch `main`, acompanhando `origin/main` (`## main...origin/main`, sem divergência).
- Um commit; nenhum arquivo rastreado modificado.
- Único arquivo não rastreado: este relatório.
- Remoto `origin` apontando para `https://github.com/NauamB/bem-te-vi.git`.

## 13. Limitações e pendências

1. **Publicação deste relatório:** resolvida no segundo commit (seção 14).
2. **Licença e titularidade não definidas.** O repositório é público, mas não concede licença. Não foram criados `LICENSE`, `SECURITY.md` nem `CONTRIBUTING.md`.
3. **E-mail do autor visível.** O e-mail pessoal autorizado aparece publicamente nos metadados do commit. Para os próximos commits, existe a alternativa do e-mail noreply do GitHub.
4. **Proteção da branch.** A proteção de `main` e os recursos de segurança do GitHub (secret scanning, push protection, Dependabot) não foram configurados; isso depende das configurações do repositório.
5. **Vulnerabilidades de desenvolvimento.** As 7 vulnerabilidades moderadas nas dependências de desenvolvimento continuam; não há nenhuma em produção.
6. **Metadado de tamanho.** Logo após o push, a API ainda mostrava `size: 0`. É um dado agregado com atualização assíncrona, que não afeta o conteúdo: o commit e os 41 arquivos já estão visíveis.
7. **Sem deploy e sem integrações.** Não houve deploy (Vercel) nem configuração de Supabase, autenticação ou banco.
8. **Legado intocado.** Nesta fase não houve nenhum acesso, comando ou alteração no repositório `sema-piloto-ia07` nem em seus backups.

## 14. Segundo commit (publicação deste relatório)

- **Autorização:** o proprietário aprovou a Fase 10D.1 e autorizou um segundo commit exclusivamente com este arquivo, com push normal e sem alterar o primeiro commit.
- **E-mail noreply:** **não configurado.** O endereço não foi informado nem confirmado pelo proprietário, e essa era a condição para a troca. A consulta pública ao ID da conta indica o formato candidato `88955122+NauamB@users.noreply.github.com`. Ele só deve ser usado depois de confirmado nas configurações de e-mail da conta no GitHub. O segundo commit mantém a mesma identidade autorizada do primeiro.
- **Conteúdo:** só este relatório, revisado para não afirmar que continua fora do GitHub.
- **Resultado:** o hash do segundo commit não pode constar deste arquivo, porque ele próprio faz parte do commit. A conferência do HEAD local com o remoto foi apresentada ao proprietário no relatório da conversa e pode ser refeita com `git log -1` e `git ls-remote origin refs/heads/main`.
