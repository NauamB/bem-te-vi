# Visão do produto — Bem-te-vi

**Bem-te-vi — Plataforma de Inteligência da Biodiversidade**
*Mato Grosso · Flora · Fauna · Território*

Versão do documento: 0.1.0, de 13/11/2026, Fase 10C. É um documento de visão: descreve intenção e hipóteses, não funcionalidades existentes. O que existe hoje está em `docs/RELATORIO_FASE_10C.md`.

> Projeto independente. Não é produto oficial da SEMA-MT, do Governo de Mato Grosso, de universidade ou de qualquer instituição. Não há vínculo institucional, aprovação ou parceria formalizada.

## 1. Proposta de valor

Informações sobre espécies, registros de ocorrência e território existem em muitas fontes: herbários, coleções, listas taxonômicas, agregadores internacionais e camadas geográficas oficiais. Elas são publicadas em formatos, licenças e escalas diferentes.

O Bem-te-vi vai **reunir, contextualizar e explicar** essas informações em uma leitura territorial única. Para cada informação, mostrará:
- **de onde veio:** fonte, conjunto de dados, licença e data;
- **como foi tratada:** regras de normalização e cruzamentos;
- **o que permite e o que não permite concluir:** incerteza, lacunas e viés de amostragem.

O diferencial não é ter "mais dados", e sim a **rastreabilidade e a honestidade metodológica**. Ausência de registro não será apresentada como ausência da espécie, e registro histórico não será apresentado como monitoramento em tempo real.

## 2. Público-alvo inicial e hipóteses a validar

| Público | Necessidade presumida | Hipótese a validar |
|---|---|---|
| Pesquisadores e estudantes | Consultar espécies e distribuição com fontes citáveis | Valorizam a origem e a licença por registro mais que o volume |
| Técnicos e analistas ambientais | Ler o território: espécies por município, bioma e área protegida | Um dossiê com lacunas explícitas é mais útil que um mapa de pontos |
| Educadores e público interessado | Conhecer a biodiversidade de MT | Uma apresentação clara dos três biomas gera interesse para a consulta |
| Curadores e revisores | Validar registros complementares | Fluxo de revisão humana com justificativa é aceito como prática |

**Nenhuma hipótese foi validada com usuários.** A validação é etapa do roadmap.

## 3. Escopo da V1.0 (proposto)

**Dentro**
- Página de apresentação (já existe na v0.1.0).
- Observatório público:
  - busca e ficha de espécie (taxonomia, distribuição por UF ou município, fontes);
  - registros de ocorrência com origem, licença e incerteza;
  - mapa com municípios, biomas e áreas protegidas;
  - página de fontes.
- Base própria em PostgreSQL/PostGIS, alimentada por ingestão controlada das primeiras fontes abertas: listas taxonômicas, camadas territoriais oficiais e ocorrências de um agregador.
- Proteção de coordenadas de espécies sensíveis.
- Ambiente interno mínimo: login Google, perfis e revisão humana de registros complementares.

**Fora da V1.0**
- Fiscalização, denúncia, autuação, licenciamento ou gestão de incêndios.
- Monitoramento em tempo real.
- Identificação automática de espécies.
- Conclusões automáticas sobre infração, degradação ou responsabilidade.
- Redistribuição de dados cuja licença não permita.

## 4. Observatório público × ambiente interno

| | Observatório público | Ambiente interno |
|---|---|---|
| Acesso | Sem login | Login Google (Supabase Auth) **e** perfil concedido |
| Conteúdo | Dados com licença compatível; coordenadas sensíveis generalizadas | Dados completos conforme perfil; registros complementares; revisão; auditoria |
| Escrita | Nenhuma | Apenas por pessoas autorizadas, com trilha de auditoria |
| Estado na v0.1.0 | Apresentação e `/explorar` informativa | `/acesso` informativa; **sem login** |

A página de apresentação é a porta de entrada. Dela, "Explorar biodiversidade" leva ao observatório e "Acesso interno" leva ao ambiente interno.

## 5. Território e expansão

- **Inicial:** Mato Grosso. O estado reúne Amazônia, Cerrado e Pantanal e tem 142 municípios (IBGE).
- **Expansão:** outras unidades da federação, sem refazer a base. Códigos IBGE de 7 dígitos, geometrias em SIRGAS 2000 e UF como atributo, não como premissa do modelo.

## 6. Limitações científicas (a comunicar sempre)

1. Os registros de ocorrência têm viés de amostragem: concentram-se perto de estradas, cidades e instituições.
2. As coordenadas têm incerteza variável; muitas são generalizadas ou ausentes.
3. A taxonomia muda. Nomes podem ser sinônimos ou estar desatualizados.
4. As licenças variam por conjunto de dados. Parte dos dados pode não ser exibível publicamente.
5. A plataforma não substitui inventário de campo, laudo técnico ou decisão de órgão competente.

## 7. Pendências de produto

Titularidade e licença; validação com usuários; política de espécies sensíveis; política de privacidade (LGPD) antes de qualquer login real; seleção final das fontes da V1.0.
