# Estratégia de dados — Bem-te-vi

Versão 0.1.0, 13/11/2026, Fase 10C. **Nenhuma fonte está integrada e nenhum dado foi armazenado.** Este documento define regras e direção; a modelagem detalhada é fase própria.

## 1. Estratégia híbrida

| Papel | Onde | Por quê |
|---|---|---|
| **Base de consulta** | Banco próprio (Supabase PostgreSQL + PostGIS) | Consultas rápidas e estáveis, cruzamentos espaciais, controle de licença e de sensíveis, independência de fontes instáveis |
| **Origem** | Fontes externas: agregadores, listas taxonômicas, camadas oficiais | Autoridade científica e atualização; o Bem-te-vi não substitui as fontes |
| **Ligação** | Ingestão controlada por lotes | Cada atualização é registrada, validada e reversível; falha da fonte não apaga dado anterior |

O navegador **nunca** consulta fontes externas diretamente para montar a experiência principal. Ele consulta a base própria, que guarda a referência à origem.

## 2. Natureza da informação

Toda informação pertence a uma única categoria, definida em `types/informacao.ts`. As categorias serão separadas no banco por schemas ou tabelas distintas:

| Natureza | Conteúdo | Quem produz | Pública? |
|---|---|---|---|
| Dado original | Registro como recebido + metadados de coleta (fonte, conjunto, licença, URL, hash, data de obtenção, versão do conector) | Ingestão | Não diretamente |
| Dado tratado (normalizado) | Nome aceito, coordenada validada, município atribuído pela malha oficial, data padronizada | Regras versionadas | Sim, conforme licença e sensibilidade |
| Dado derivado | Contagens, sobreposições, indicadores, sempre com método, versão e data | Rotinas | Sim |
| Registro de usuário | Registros complementares cadastrados por pessoas | Pessoas autorizadas | Só após revisão |
| Interpretação | Leitura por regras, com o que permite e não permite concluir | Regras (sem IA generativa na V1.0) | Parcial |
| Decisão humana | Validação ou rejeição com justificativa e instantâneo do contexto | Revisores | Não |

## 3. Proveniência e licenciamento

- Chave natural de registro externo: `(fonte, identificador externo)`. Exemplo: `gbifID`, ou `occurrenceID` + conjunto de dados.
- Cada registro carrega a licença do conjunto de origem. A área pública filtra por licença compatível com o uso.
- Citações exigidas pela fonte (por exemplo, DOI de download) são registradas no lote e exibidas.
- Nada é "desduplicado" por exclusão. Duplicatas prováveis são agrupadas, e os originais são preservados.

## 4. Proteção de coordenadas de espécies sensíveis

- Uma política escrita, com responsável, critérios e revisão periódica, define quais táxons são sensíveis e o nível de generalização (grade, município ou ocultação).
- A coordenada precisa fica em tabela sem acesso `anon`. A área pública lê **apenas** *views* com geometria generalizada.
- Generalizações já aplicadas pela fonte são respeitadas e nunca revertidas.
- Exportações públicas usam as mesmas *views*.
- **Pendente:** quais listas de referência usar (a lista nacional vigente precisa ser consolidada) e quem aprova a política.

## 5. Atualização controlada

- Cada execução de conector gera um lote com início, fim, filtros, contagens, hash do arquivo e situação (`ok`, `parcial` ou `falha`).
- Registros têm `primeira_vez_visto`, `ultima_vez_visto` e `removido_na_fonte`.
- A interface mostra a situação de cada fonte (`atualizado`, `desatualizado`, `sem dados` ou `falha`) e a data do último sucesso. "Sem coleta" nunca é exibido como zero.
- Os dados são validados antes de serem gravados: esquema, cobertura, licença e hash.

## 6. Fontes candidatas (a confirmar em prova de conceito)

As fontes vêm da avaliação documental de 13/11/2026, feita fora deste repositório. **Nenhuma foi integrada.** Contagens e limites precisam ser reconfirmados.

| Fonte | Uso previsto | Observação |
|---|---|---|
| Flora e Funga do Brasil (JBRJ, IPT) | Lista taxonômica de flora, distribuição por UF | CC BY 4.0, segundo a página do recurso |
| Catálogo Taxonômico da Fauna do Brasil (JBRJ, IPT) | Lista taxonômica de fauna | CC BY 4.0, segundo a página do recurso |
| IBGE: malha municipal e biomas | Território | Licença dos biomas a confirmar |
| CNUC / MMA | Áreas protegidas | CC BY, segundo a página de dados abertos |
| GBIF | Registros de ocorrência | Download exige conta e citação de DOI; licença por conjunto de dados |
| speciesLink | Registros de coleções | Exige chave; licença por coleção |

## 7. Limitações científicas

Viés de amostragem; incerteza de coordenadas; mudanças taxonômicas; registros históricos que não são monitoramento; ausência de registro que não é ausência da espécie; cobertura desigual entre grupos (por exemplo, predominância de aves observadas em agregadores).

## 8. Expansão nacional

- Município é chave de 7 dígitos do IBGE. A UF é atributo, nunca premissa.
- Geometrias em SIRGAS 2000 (EPSG:4674), com reprojeção apenas para cálculos de área e distância.
- Conectores parametrizados por recorte territorial, não fixos em Mato Grosso.
