# Relatório de validação da produção — Fase 10D.2

Validação técnica da primeira implantação pública do Bem-te-vi. É uma fase **só de verificação**: nenhum código, configuração, commit, push ou deploy foi feito. Este relatório **não foi commitado**.

## 1. Identificação

| Item | Valor |
|---|---|
| Data e horário | 13/11/2026, das 13:49 às 14:06 (horário local, −04:00) |
| URL testada | `https://bem-te-vi-zeta.vercel.app` |
| Repositório | `https://github.com/NauamB/bem-te-vi` |
| HEAD local = `origin/main` = remoto | `5389a0fd5b2f33788a52562f22e9d9b0c33bf99b` |
| Comparação local | Build de produção (`next build` + `next start`, porta 3100, `127.0.0.1`) do mesmo HEAD. Arquivos da aplicação idênticos ao commit (`git diff --quiet HEAD`) |

## 2. Versão publicada

| Verificação | Resultado | Evidência |
|---|---|---|
| Implantação do commit `5389a0f` | **Concluída com sucesso** | Status de commit "Vercel / success / Deployment has completed", 2026-11-13T17:48:24Z (13:48 local), na API pública do GitHub |
| Implantação do commit `e0bf27e` | Concluída com sucesso | Mesmo status, 17:46:08Z |
| `5389a0f` na história publicada | **Sim**: é o `main` remoto, filho de `e0bf27e` | `git ls-remote`, API pública |
| Produção serve o `5389a0f`? | **Não verificável diretamente** | Ver abaixo |
| Branch de produção configurada | **Não verificável** | Exige acesso ao painel da Vercel |
| Domínio de produção | `bem-te-vi-zeta.vercel.app` responde como produção (`Server: Vercel`, `X-Vercel-Cache: PRERENDER`, borda `gru1`) | Cabeçalhos HTTP |
| Implantações na API do GitHub (`/deployments`) | Nenhuma registrada | A integração só publicou status de commit |

Por que o vínculo produção ↔ commit não é verificável:
- Os dois commits têm a **mesma aplicação** (o segundo só acrescenta um `.md`), então o conteúdo servido não permite distinguir qual deles está no ar.
- Os links de detalhe da Vercel exigem login.

Evidências indiretas:
- A primeira resposta de produção (17:49:54 UTC) veio depois da conclusão da implantação de `5389a0f`.
- O HTML de produção tem tamanho igual ao do build local mais uma diferença constante de 210 a 263 bytes por página. A causa mais provável é o identificador de implantação que a Vercel acrescenta às URLs dos recursos (hipótese, não confirmada).
- `icon.svg` e a marca têm o mesmo tamanho (1.090 bytes) em produção e no local.

## 3. Ocorrência que limitou a validação: desafio da Vercel

- **Até cerca de 17:50 UTC**, as requisições anônimas (`curl`) foram respondidas normalmente.
- **Depois de uma rajada de cerca de 45 requisições** em pouco mais de um minuto, todas originadas desta validação, a Vercel passou a responder `HTTP 403` com `X-Vercel-Mitigated: challenge` e a página "Vercel Security Checkpoint".
- O **navegador sem interface** (Edge headless, via DevTools Protocol) também ficou preso no desafio em todas as rotas. Esperei 25 s por rota.
- **Às 14:02 local** o desafio continuava ativo para requisições automatizadas.
- **Não houve tentativa de contornar a proteção:** nenhuma troca de User-Agent, nenhum navegador disfarçado, nenhuma reutilização de token. O token do desafio aparece nos cabeçalhos e **não foi registrado** aqui.

Consequências:
- A validação em navegador real da produção (JavaScript, cliques, larguras, menu, metadados) **não foi possível**.
- Essas verificações foram feitas no build local do mesmo código, e a produção ficou validada só no nível HTTP, com as respostas obtidas antes do desafio.
- Os resultados de `curl` obtidos **depois** do início do desafio foram descartados como evidência. Entre eles estão os 403 de `/AGENTS.md`, `/README.md` e `/.vercel/project.json`, e a ausência aparente de `meta robots`.

**Causa provável (não confirmada):** a mitigação automática ou a proteção contra bots do Firewall da Vercel, acionada pelo volume da própria validação. O painel da Vercel não foi consultado (sem acesso).

## 4. Resultado por rota

### 4.1 Produção (HTTP, antes do desafio)

| Rota | Status | Tamanho | Observação |
|---|---|---|---|
| `/` | 200 | 218.175 B | `X-Matched-Path: /`, pré-renderizada |
| `/explorar` | 200 | 36.898 B | |
| `/acesso` | 200 | 18.924 B | |
| `/rota-inexistente-validacao` | **404** | 9.186 B | Página 404 da aplicação |
| `/icon.svg`, `/brand/bem-te-vi-marca.svg` | 200 | 1.090 B | `image/svg+xml` |
| `/robots.txt`, `/sitemap.xml`, `/favicon.ico` | 404 | 9.186 B | Não existem no projeto |
| `http://…/` | **308** → `https://…/` | | HTTPS forçado |
| `/explorar/` | **308** → `/explorar` | | Barra final normalizada |

### 4.2 Navegador (build local do mesmo código, 1366 px)

| Rota | Carga | Título | H1 | Robots | Erros JS / console / rede |
|---|---|---|---|---|---|
| `/` | ok, 200 | Bem-te-vi — Plataforma de Inteligência da Biodiversidade | "Conhecer a biodiversidade é compreender o território." | (indexável) | 0 / 0 / 0 |
| `/explorar` | ok, 200 | Explorar biodiversidade · Bem-te-vi | "Explorar biodiversidade" | (indexável) | 0 / 0 / 0 |
| `/acesso` | ok, 200 | Acesso interno · Bem-te-vi | "Em construção" | `noindex, nofollow` | 0 / 0 / 0 |
| 404 | ok, **404** | (título padrão do site) | "Página não encontrada" | `noindex` | Só o próprio 404 do documento |

O que vale para todas as páginas:
- `lang="pt-BR"`, meta `description` presente, `theme-color #1b4430` e favicon `/icon.svg`.
- As 3 fontes (Fraunces, Inter, IBM Plex Mono) carregadas pelo próprio domínio.
- Nenhuma imagem raster; só SVG próprios (5 em `/`).
- Nenhum formulário ou campo de senha. `/acesso` continua **sem autenticação fictícia** e mostra "Não configurada".

**Conteúdo fictício:** os únicos números em `/` são os ordinais 01 a 05, "142" (municípios, IBGE) e a versão "0.1.0". Não há indicador, contagem ou dado científico inventado. O aviso de que o projeto não é oficial está presente em `/` e `/explorar`.

### 4.3 Navegação por cliques (local): 13 de 13 corretas

Testes feitos:
- Cabeçalho: "Explorar biodiversidade" → `/explorar`; "Acesso interno" → `/acesso`.
- Hero: "Explorar biodiversidade" → `/explorar`; "Conhecer a plataforma" → `/#plataforma`.
- Navegação: Princípios, Mato Grosso e Estado do projeto.
- Rodapé: "Acesso interno".
- `/explorar`: "Voltar à apresentação" e "Conhecer os princípios".
- `/acesso`: "Voltar à apresentação" e a marca.
- 404: "Voltar à apresentação".

Nas âncoras, a seção ficou a 96 px do topo, ou seja, não fica escondida sob o cabeçalho fixo. Nenhum erro de JavaScript durante as navegações.

## 5. Resultado por largura (local; produção não verificável pelo desafio)

| Largura | `/` | `/explorar` | `/acesso` | Menu móvel |
|---|---|---|---|---|
| 360 | ok | ok | ok | Visível, funcional |
| 390 | ok | ok | ok | Visível, funcional |
| 430 | ok | ok | ok | Visível, funcional |
| 768 | ok | ok | ok | Visível, funcional |
| 1024 | ok | ok | ok | Navegação completa no cabeçalho |
| 1366 | ok | ok | ok | Idem |
| 1920 | ok | ok | ok | Idem |

O que "ok" significa em cada uma das 21 combinações:
- sem rolagem horizontal (`scrollWidth = clientWidth`);
- nenhum elemento fora da tela;
- nenhum texto cortado (`overflow` oculto com conteúdo maior);
- nenhuma sobreposição de blocos de texto;
- nenhum link ou botão com menos de 44 px de altura.

Menu nas 4 larguras em que aparece:
- abre com os 6 destinos, todos dentro da tela e com altura mínima de 44 px;
- `aria-expanded` muda de `false` para `true` e o rótulo de "Menu" para "Fechar";
- **Esc** fecha o menu;
- escolher um destino fecha o menu e navega.

As capturas em 360, 768 e 1366 px e a do menu aberto foram revisadas visualmente.

## 6. Segurança e configuração pública

| Verificação | Produção | Local |
|---|---|---|
| HTTPS | 308 de http para https; **HSTS** `max-age=63072000; includeSubDomains; preload` (Vercel) | — (local em http) |
| `X-Content-Type-Options: nosniff` | ✔ | ✔ |
| `X-Frame-Options: DENY` | ✔ | ✔ |
| `Referrer-Policy: strict-origin-when-cross-origin` | ✔ | ✔ |
| `Permissions-Policy` (câmera, microfone, geolocalização, pagamento, USB desligados) | ✔ | ✔ |
| `Cross-Origin-Opener-Policy: same-origin` | ✔ | ✔ |
| `X-Powered-By` | Ausente ✔ | Ausente ✔ |
| `Content-Security-Policy` | **Ausente** (conhecido, Fase 10C) | Ausente |
| `Access-Control-Allow-Origin: *` no HTML | Presente (padrão da Vercel para conteúdo estático) | — |
| `.env`, `.env.local`, `.env.example`, `.env.production`, `.git/config`, `.git/HEAD`, `package.json`, `package-lock.json`, `next.config.ts`, `tsconfig.json`, `BUILD_ID` | **404** (antes do desafio) | 404 |
| `AGENTS.md`, `README.md`, `docs/…`, `.vercel/project.json` | Não verificável (desafio) | 404 |
| Mapas de código (`.js.map`) | Não verificável | 404 nos 9 scripts, sem `sourceMappingURL` |
| Credenciais nos 9 scripts (589 KB) e no HTML | Não verificável | **Nenhuma** (padrões Supabase, JWT, GitHub, AWS, Google, chave privada, e-mail e caminho pessoal) |
| Indexação | Não verificável (desafio) | `/` e `/explorar` indexáveis; `/acesso` `noindex, nofollow`; 404 `noindex`; sem `robots.txt` |

Nenhum teste invasivo foi feito: só GET de caminhos públicos comuns e navegação normal.

## 7. Local × produção: origem dos problemas

| Tipo | Itens |
|---|---|
| **Código** | CSP ausente; HTML de `/` pesado (seção 8, item B3); foco não volta ao botão após Esc; título genérico no 404; sem `robots.txt`, `sitemap.xml` e `favicon.ico` |
| **Infraestrutura Vercel** | Desafio de segurança bloqueando clientes automatizados (403); `Access-Control-Allow-Origin: *` padrão; HSTS e redirecionamento 308 corretos |
| **Cache e domínio** | Nada de anormal: `X-Vercel-Cache: PRERENDER`, `Cache-Control: public, max-age=0, must-revalidate` e `Age: 0` na primeira resposta. O domínio `*.vercel.app` é o padrão; não há domínio próprio |
| **Ambiente de teste** | O Edge sem interface é identificado pela Vercel. A validação visual e de JavaScript em produção depende de um navegador comum operado por uma pessoa, ou da liberação do desafio |

## 8. Problemas classificados

| Classe | Id | Problema | Origem |
|---|---|---|---|
| **Crítico** | — | Nenhum encontrado | — |
| **Alto** | A1 | Desafio de segurança da Vercel ativo para clientes automatizados (403 `X-Vercel-Mitigated: challenge`), ainda presente pelo menos 12 minutos depois do acionamento. Impede validar a produção em navegador e pode bloquear robôs de busca, prévias de link e ferramentas de avaliação. Visitantes com navegador comum provavelmente passam pelo desafio JavaScript, mas isso **não foi testado** | Infraestrutura |
| **Médio** | M1 | Ausência de Content-Security-Policy (decisão adiada para a fase de autenticação) | Código |
| **Médio** | M2 | O vínculo implantação de produção ↔ commit e a branch de produção não são verificáveis sem acesso à Vercel; a correspondência é só indireta | Limitação de acesso |
| **Baixo** | B1 | Foco do teclado não volta ao botão "Menu" ao fechar com Esc (acessibilidade) | Código |
| **Baixo** | B2 | Página 404 com o título padrão do site, em vez de "Página não encontrada" | Código |
| **Baixo** | B3 | HTML de `/` com cerca de 218 KB (≈ 74 KB comprimido). Pelo menos 68,5 KB vêm dos 69 contornos SVG decorativos | Código |
| **Baixo** | B4 | Sem `robots.txt` e `sitemap.xml`; `/favicon.ico` responde 404 (o ícone SVG é servido corretamente) | Código |
| **Baixo** | B5 | `Access-Control-Allow-Origin: *` nas páginas (conteúdo público e sem credenciais) | Infraestrutura |
| **Sem problema** | — | Rotas; 404 real; navegação; responsividade nas 7 larguras; menu; ausência de erros de JavaScript; fontes; metadados; ausência de dados fictícios; `/acesso` sem login simulado; HTTPS, HSTS e redirecionamentos; cabeçalhos de segurança; ausência de arquivos sensíveis, de mapas de código e de credenciais (local; produção parcial) | — |

## 9. Evidências e comandos

Comandos principais (sem credenciais):
- `git log`, `git status -sb`, `git ls-remote origin refs/heads/main` (só leitura).
- `curl -s -H 'User-Agent: validacao-bem-te-vi' https://api.github.com/repos/NauamB/bem-te-vi/deployments`, `…/commits/<sha>/status` e `…/check-runs`.
- `curl -sI https://bem-te-vi-zeta.vercel.app/`; `curl -s -o /dev/null -w '%{http_code} %{size_download}'` por rota; `curl -sI http://…` (redirecionamento).
- `npm run build` e `npx next start -p 3100 -H 127.0.0.1` (local, encerrado ao final).
- Script de validação próprio (Node, sem dependências) que controla o Edge sem interface via DevTools Protocol:
  - carga e status do documento;
  - exceções, erros de console e falhas de rede;
  - metadados;
  - 13 cliques de navegação;
  - 7 larguras × 3 rotas;
  - menu em 4 larguras;
  - GETs de caminhos sensíveis;
  - varredura de padrões de credencial nos scripts e no HTML;
  - mapas de código.

Os artefatos ficaram no diretório temporário da sessão do Claude Code, **fora do repositório**:
- `validar-site.mjs`;
- `validacao-local/resultado.json` e as capturas `inicio-360/768/1366.png`, `explorar-390.png`, `acesso-390.png` e `menu-aberto-360.png`;
- `validacao-prod/resultado.json`, com as páginas de desafio.

## 10. Limitações

1. A validação da produção em navegador não foi possível por causa do desafio da Vercel (seção 3); essas verificações valem para o build local do mesmo código.
2. Sem acesso ao painel da Vercel: branch de produção, implantação ativa no domínio e configuração do Firewall não foram verificadas.
3. O próprio volume da validação provavelmente acionou o desafio.
4. Não houve teste em dispositivos físicos nem com leitor de tela. A acessibilidade foi checada só por critérios automáticos (alvos de toque, atributos ARIA, foco do menu).
5. Uma única execução por cenário.

## 11. Recomendações para a próxima fase

1. **Proprietário:** no painel da Vercel (Firewall), verificar por que há mitigação `challenge`: Attack Challenge Mode, regra de bot ou mitigação automática. Conferir se ela atinge visitantes comuns e robôs de busca, e decidir se deve ficar ativa durante a avaliação da banca. Abrir o site num navegador comum, em celular e em computador, para confirmar a experiência real.
2. **Proprietário:** confirmar no painel a **branch de produção (`main`)** e que a implantação ativa no domínio é a de `5389a0f`.
3. Repetir a validação de produção em navegador depois que o desafio for liberado, com requisições espaçadas, ou de forma manual.
4. **Correções de código** (em fase autorizada): B1 (foco), B2 (título 404), B4 (`robots.ts` e `sitemap.ts`, com `/acesso` excluído) e B3 (reduzir o detalhe das curvas de nível ou movê-las para um SVG estático em cache).
5. Planejar a CSP (M1) junto com a autenticação.
6. Automatizar esta validação como testes versionados (Playwright) e integração contínua, rodando contra o build local, sem depender do domínio público.
