# Plano da Fase 11 — Piloto demonstrativo com dados reais

Versão 0.2, 16/11/2026. **Situação:** a direção arquitetural foi aprovada pelo proprietário, condicionada aos ajustes incorporados nesta versão. Aguarda aprovação final para implementação. **Nada foi implementado:** nenhum serviço contratado, conta ou projeto externo criado, banco de dados, credencial, migração ou código.

Arquitetura e modelo de dados: `docs/arquitetura/ADR-0001-arquitetura-do-piloto.md` (revisão 2).

## 1. Finalidade

O Bem-te-vi é **exclusivamente um projeto piloto, sem finalidade comercial**, para entrega e apresentação demonstrativa.

A Fase 11 deve demonstrar, com dados reais de Mato Grosso e proveniência verificável, o fluxo:

> fonte → ingestão → validação → armazenamento → consulta geográfica → mapa

Isso não inclui funcionalidades de plataforma empresarial.

## 2. Fontes e papéis

Os detalhes estão no ADR-0001, seções 2 e 3.

| Papel | Fonte | Unidade | Quantidade |
|---|---|---|---|
| Referência taxonômica | Flora e Funga do Brasil — Lista Oficial (CC BY 4.0, DOI `10.15468/1mtkaw`, v. 393.433) | Nomes | 169.230 nomes no checklist |
| Ocorrências georreferenciadas | GBIF, **lote 1**: plantas de MT, exemplares de herbário, coleta de 2000 em diante | Ocorrências | ~85.843 (contagem prévia na API em 16/11/2026, **sem DOI**; o DOI nasce no download) |
| Referência territorial | IBGE — malha municipal | Municípios | 142 em MT |

## 3. Classificação das funcionalidades

### 3.1 Essencial para o piloto

| # | Funcionalidade | Critério de pronto |
|---|---|---|
| E1 | Modelo de dados do ADR-0001, seção 5: proveniência, original, taxonomia, território, ocorrências, proteção e público, com migrações versionadas | Banco reconstruível do zero pelas migrações |
| E2 | RLS em toda tabela e papel só de leitura restrito a `publico` | Teste automatizado comprova que o papel não lê `original` nem `ocorrencias` |
| E3 | Ingestão da Flora e Funga (referência taxonômica) | Nomes, sinônimos e versão carregados; arquivo original com SHA-256 |
| E4 | Ingestão da malha do IBGE (referência territorial) | 142 municípios e limite da UF em EPSG:4674, com a edição da malha |
| E5 | **Lote 1 do GBIF** (ocorrências), com os filtros do ADR-0001, seção 3.2 | Download com DOI; `ocorrencia_recebida` completa, incluindo rejeitados; relatório do lote |
| E6 | Critérios de qualidade do ADR-0001, seção 3.4 | Rejeições com motivo; alertas sinalizados; nada apagado |
| E7 | Conciliação de nomes com a Flora e Funga | Nome recebido preservado; resultado e método por ocorrência; "não conciliado" visível |
| E8 | Município atribuído pela malha do IBGE | Dado derivado, com método e edição |
| E9 | **Revisão humana dos conjuntos de dados** (ADR-0001, seção 7), obrigatória para todo conjunto com CC BY-NC (6 no lote 1) ou com termos adicionais | Revisão registrada; conjunto sem aprovação fora das views públicas |
| E10 | **Proteção de coordenadas** (ADR-0001, seção 6): generalização conservadora (grade de 0,1°) para **todas** as ocorrências até a política ser validada | Testes de bloqueio em verde. **Sem eles, não há publicação** |
| E11 | Consulta geográfica por município, por recorte do mapa e por espécie | Só a partir de `publico` |
| E12 | Mapa MapLibre com células e, depois da validação da política, a precisão que ela permitir | Mapa base OpenFreeMap com atribuição OSM; tiles por `ST_AsMVT` |
| E13 | Páginas de espécie, município, "fontes e licenças" e "sobre os dados" | Fonte, licença e natureza visíveis; recorte e limitações declarados |
| E14 | Testes de ponta a ponta das novas páginas e testes de banco na CI, com banco local, sem acesso à produção | CI verde |
| E15 | **Backup e teste de restauração** antes da apresentação (ADR-0001, seção 8) | Dump com SHA-256; restauração local conferida; testes de proteção sobre o banco restaurado |

### 3.2 Importante para evolução posterior
- **Lote 2:** plantas de todos os anos e fungos.
- **Lote 3:** fauna, com o Catálogo Taxonômico da Fauna do Brasil.
- Política de sensíveis definitiva, com revisão periódica.
- Biomas do IBGE e unidades de conservação (CNUC).
- speciesLink.
- Exibição do status de ameaça como informação.
- Agrupamento de duplicatas prováveis entre instituições.
- Atualização periódica dos lotes.
- Login, perfis, registros de usuário e fluxo de revisão.
- Exportação de dados, indicadores e busca avançada.
- CSP.

### 3.3 Fora do escopo inicial
- Microsserviços, filas, workers e agendamentos.
- Planos pagos.
- IA generativa.
- Aplicativo móvel.
- Modelos de distribuição.
- Integração com sistemas de órgãos públicos.
- Envio de fotos.
- API para terceiros.
- Recursos empresariais.
- Dados ativos de outros estados (a arquitetura já fica preparada).

## 4. Etapas e estimativa

### 4.1 Desenvolvimento (trabalho técnico efetivo)

Em dias úteis de trabalho técnico, com implementação assistida e revisão. Cada etapa termina com relatório próprio.

| Etapa | Conteúdo | Dias úteis |
|---|---|---|
| 11.1 | Modelo de dados, RLS, papel só de leitura, migrações, banco local de teste e CI | 3–4 |
| 11.2 | Referência territorial: malha do IBGE | 1–2 |
| 11.3 | Referência taxonômica: Flora e Funga | 2–3 |
| 11.4 | Lote 1 do GBIF: download, arquivamento, qualidade, carga, conciliação, relatório, lista de conjuntos para revisão | 4–5 |
| 11.5 | Proteção: grade conservadora, lista de referência (se disponível), views públicas, testes de bloqueio | 2–3 |
| 11.6 | Consultas e tiles vetoriais | 2–4 |
| 11.7 | Mapa e páginas | 4–6 |
| 11.8 | Testes de ponta a ponta, desempenho, publicação, backup e teste de restauração, relatório final | 2–3 |
| **Total de desenvolvimento** | | **20–30 dias úteis** |

### 4.2 Ações do proprietário

Não são desenvolvimento, mas entram no prazo. Cada uma **bloqueia** a etapa indicada.

| Ação | Bloqueia | Esforço estimado do proprietário |
|---|---|---|
| A1. Aprovar o ADR-0001 (revisão 2) e este plano | Início | — |
| A2. Criar a conta GBIF | 11.4 | Menos de 1 hora |
| A3. Criar o projeto Supabase Free (`sa-east-1`) e conferir os limites atuais | 11.1, para aplicar no projeto real (o desenvolvimento começa no banco local) | Menos de 1 hora |
| A4. Registrar as credenciais em GitHub Secrets e na Vercel, com orientação, sem expor valores na conversa | 11.4 e 11.6 | Menos de 1 hora |
| A5. Revisar os conjuntos de dados: os 6 com CC BY-NC e os que tiverem termos adicionais | Publicação dos registros desses conjuntos | 2 a 4 horas, conforme o número de conjuntos sinalizados |
| A6. Validar a política de sensíveis: grade, lista de referência e responsável | Passagem de células para pontos. **Sem a validação, o piloto é publicado só com células** | Variável |
| A7. Confirmar que a forma de publicação atende ao Vercel Hobby, e consultar a Vercel se for institucional | Publicação (11.8) | Menos de 1 hora; a consulta à Vercel, se necessária, depende do prazo de resposta |
| A8. Aprovar o relatório de cada etapa | A etapa seguinte | Cerca de 30 minutos por etapa |
| A9. Guardar o backup em local próprio | Conclusão (11.8) | Menos de 1 hora |

### 4.3 Prazo de calendário

- **Desenvolvimento:** 20 a 30 dias úteis.
- **Com as ações do proprietário feitas sem espera:** cerca de **5 a 7 semanas** até o piloto funcional publicado, com as ocorrências em células de grade.
- **Demonstrações intermediárias:**
  - depois da 11.5: dados, contagens e proveniência;
  - depois da 11.7: mapa.

### 4.4 Fatores que podem alterar o prazo

| Fator | Efeito possível |
|---|---|
| Tempo de resposta às ações A1 a A9 | Cada dia de espera numa ação que bloqueia se soma ao prazo |
| Lista oficial de flora ameaçada indisponível em formato verificável | Não atrasa a publicação: vale a generalização conservadora. Adia a exibição de pontos |
| Proporção de nomes não conciliados com a Flora e Funga | Mais regras de conciliação: +1 a 3 dias |
| Número de conjuntos com termos adicionais | Mais revisão humana (A5) |
| Tamanho real no banco acima do estimado | Reduzir o lote 1 (por exemplo, coletas a partir de 2010: 65.001 na medição) ou rever o plano: +1 a 2 dias |
| Fila de downloads do GBIF | De minutos a algumas horas |
| Termos do OpenFreeMap ou do IBGE incompatíveis | Trocar o mapa base ou a fonte territorial: +1 a 2 dias |
| Consulta à Vercel, se a publicação for institucional | Depende do suporte |
| Mudanças de escopo durante a fase | Reestimativa obrigatória |

## 5. Custos

| Item | Custo |
|---|---|
| Vercel Hobby (condicionado à ação A7) | US$ 0 |
| Supabase Free | US$ 0 |
| GitHub Actions (repositório público) | US$ 0 |
| GBIF, Flora e Funga, IBGE, MapLibre, OpenFreeMap | US$ 0 |
| **Total** | **US$ 0/mês** |

Novas dependências previstas, a confirmar na implementação:
- `maplibre-gl`;
- um cliente Postgres de servidor (`postgres`);
- a CLI do Supabase (desenvolvimento e CI).

## 6. Critérios de conclusão do piloto

1. Lote 1 carregado, com DOI, SHA-256, contagens e rejeições por motivo. `ocorrencia_recebida` completa.
2. Flora e Funga e malha do IBGE carregadas com versão e hash. Espécies, nomes e ocorrências separados, como no ADR-0001, seção 5.
3. Mapa público de MT e consultas por município e por espécie. Coordenadas **generalizadas**, e precisão maior só depois da política validada.
4. Testes de proteção e de permissões em verde na CI.
5. Todo conjunto publicado com revisão registrada. Todo CC BY-NC com revisão humana.
6. Fonte, conjunto de dados, licença e link de origem em cada registro exibido. Página de fontes com citação e DOI.
7. Página "sobre os dados" com o recorte e as limitações científicas.
8. Backup feito e restauração testada.
9. Forma de publicação confirmada perante os termos do Vercel Hobby.
10. Publicação com validação da produção registrada em relatório.

## 7. Pendências

| # | Pendência | Responsável |
|---|---|---|
| P1 | Aprovar o ADR-0001 (revisão 2) e este plano | Proprietário (A1) |
| P2 | Conta GBIF | Proprietário (A2) |
| P3 | Projeto Supabase Free e conferência dos limites | Proprietário (A3) |
| P4 | Lista oficial de flora ameaçada em formato verificável (Portaria MMA nº 148/2022 e atualizações) | Pesquisa na 11.5. Se não houver, vale a generalização conservadora |
| P5 | Validar a política de sensíveis e definir o responsável | Proprietário (A6) |
| P6 | Licença e termos de uso da malha do IBGE | Etapa 11.2 |
| P7 | Revisão dos conjuntos de dados | Proprietário (A5) |
| P8 | Enquadramento no Vercel Hobby e consulta à Vercel, se a publicação for institucional | Proprietário (A7) |
| P9 | Versão do Node.js usada pela Vercel (pendência da 10D.4) | Revisão de infraestrutura |
| P10 | Termos de uso do OpenFreeMap para o volume da demonstração | Etapa 11.7 |
| P11 | Tamanho real do lote 1 no banco | Etapa 11.4 |
