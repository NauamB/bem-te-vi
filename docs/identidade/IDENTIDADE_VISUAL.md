# Identidade visual do Bem-te-vi

Fase 11.5A. Referência para quem desenha ou implementa telas. Os tokens vivem em `app/globals.css` e a marca em
`components/layout/marca.tsx`; os arquivos para uso externo estão em `public/brand/`.

## Conceito: o olhar do bem-te-vi

O nome da ave é um verbo de observação: *bem te vi*. O símbolo é um **olho em forma de folha** sob a **listra
(supercílio)** que identifica o bem-te-vi:

- **fauna:** a ave, pela listra e pelo olhar;
- **flora e floresta:** a metade superior verde;
- **água e ecossistemas:** a metade inferior azul-água;
- **território:** a linha de relevo que separa as duas metades e as curvas de nível claras;
- **ciência e inteligência:** a íris é uma lente com anel topográfico, e o **ponto laranja** no centro é o ponto
  de observação, onde espécie, dado e lugar se encontram.

Não é só um pássaro, uma folha ou uma árvore: é a leitura integrada da biodiversidade no território.

## Arquivos da marca

| Arquivo | Uso |
|---|---|
| `public/brand/simbolo.svg` / `simbolo-negativo.svg` | Símbolo isolado, fundo claro / escuro |
| `public/brand/logotipo-horizontal.svg` / `-negativo.svg` | Cabeçalhos, documentos, apresentações |
| `public/brand/logotipo-vertical.svg` / `-negativo.svg` | Capas, cartazes, áreas quadradas |
| `app/icon.svg` | Favicon (quadrado arredondado em verde profundo, legível em 16 px) |
| `app/apple-icon.png` | Ícone de atalho (180 px), gerado do favicon |

No site, a marca é desenhada pelos componentes `Simbolo` e `Logotipo` (`components/layout/marca.tsx`), com o
nome em Manrope. Nos SVGs avulsos o nome é texto com Manrope e fontes de reserva. Para impressão profissional,
converter o texto em curvas numa ferramenta vetorial.

**Uso:** não distorcer, não girar, não trocar as cores do símbolo, não aplicar sombra nem contorno.
Área de proteção mínima: a altura do ponto laranja em volta de toda a marca. Tamanho mínimo: símbolo com 16 px de
altura; logotipo horizontal com 24 px.

## Cores

| Token | Hex | Papel |
|---|---|---|
| `verde-950` | #082F1A | Verde profundo: fundos escuros, texto da marca |
| `verde-800` | #0F4C28 | Verde institucional: botões verdes, ênfase |
| `verde-600` | #1B6B3A | Verde biodiversidade: ícones, destaques |
| `verde-50` | #EAF4EE | Verde claro: superfícies suaves |
| `laranja-500` | #F97316 | Acento único: ação principal e o ponto da marca |
| `laranja-600` | #C2410C | Laranja para texto e foco sobre fundo claro |
| `agua-600` | #247C9B | Azul-água: rios, Pantanal, fontes |
| `terra-400/600` | #C98A4B / #9A5F2A | Cerrado e território |
| `tinta-950/600/500` | #0D1A13 / #46564C / #5F6F65 | Texto principal, secundário e auxiliar |
| `linha` / `papel-50` | #DCE6DF / #F6F9F6 | Bordas e fundos de seção |

**Contraste (WCAG 2.2 AA):**
- branco sobre `verde-600`, `verde-800` e `verde-950`: pelo menos 6,6:1;
- branco sobre `agua-600`: 4,7:1;
- `verde-950` sobre `laranja-500`: 5,2:1;
- `laranja-600` sobre branco: 5,2:1.

**Nunca** usar texto branco sobre `laranja-500` (2,8:1). O botão principal é laranja com texto verde profundo.

## Tipografia

Todas as fontes são servidas pelo próprio site via `next/font`, com licença SIL OFL.

| Família | Uso | Pesos |
|---|---|---|
| **Manrope** (`font-display`) | Títulos, números de destaque, nome da marca | 500–800 |
| **Inter** (`font-sans`) | Texto corrido, interface | 400–600 |
| **IBM Plex Mono** (`font-mono`) | Rótulos de seção, dados, créditos, licenças | 400–500 |

Escala e uso:
- **Abertura (H1):** 2,5 rem no celular e até 4,4 rem no computador, ExtraBold, entrelinha 1,02, espaçamento −0,035 em.
- **Título de seção (H2):** 2,25–3 rem, ExtraBold.
- **Título de cartão (H3):** 1,25–1,5 rem, Bold.
- **Texto:** 1–1,25 rem, entrelinha 1,6.
- **Rótulos:** 0,75 rem, Plex Mono, maiúsculas, espaçamento 0,18 em, precedidos do traço laranja.

## Espaço, formas e profundidade

- **Grade:** largura máxima de 80 rem; margens de 1, 1,5 e 2 rem conforme a tela; seções com 5 a 7 rem de respiro vertical.
- **Raios:**
  - botões e filtros: pílula (`rounded-full`);
  - campos: 0,75 rem;
  - cartões: `rounded-cartao` (1,25 rem);
  - painéis: `rounded-painel` (1,75 rem).
- **Sombras:** `shadow-cartao` em repouso e `shadow-elevado` em destaque ou sobreposição, sempre em verde muito
  transparente. Sem efeito de vidro.
- **Gradientes:** um só uso, o escurecimento da fotografia do hero para garantir a leitura do texto.

## Componentes e estados

- **Botões** (`BotaoLink`):
  - `primario`: laranja, para a ação principal;
  - `verde`: institucional;
  - `secundario`: contorno, em fundo claro;
  - `claro`: contorno, em fundo escuro.

  Altura mínima de 44 px.
- **Foco:** contorno de 3 px em `laranja-600`, ou `laranja-300` dentro de `.superficie-escura`, com 3 px de afastamento.
- **Estados:**
  - passar o mouse escurece o botão laranja ou clareia o verde;
  - os filtros selecionados ficam preenchidos em `verde-800`;
  - os controles desativados ficam em `papel-100`, com texto auxiliar.
- **Ícones** (`components/ui/icones.tsx`): desenho próprio, traço de 1,75 px numa grade de 24 px, cantos arredondados.
  Flora, Fauna e Território repetem os elementos da marca.
- **Cartões:** fundo branco, borda `linha`, faixa superior colorida pela dimensão (verde, água ou terra).

## Fotografia

- Só paisagens reais de Mato Grosso, com licença livre verificada.
- Cada imagem é registrada em `lib/conteudo/imagens.ts` com autor, fonte, licença, data, alterações e SHA-256.
- Junto de cada imagem aparece o crédito, sempre com "Imagem ilustrativa de paisagem".
- Imagens ilustrativas nunca são apresentadas como registro científico.

| Imagem | Bioma | Autor | Licença |
|---|---|---|---|
| Parque Nacional da Chapada dos Guimarães | Cerrado | RodrigoDZ | CC BY-SA 4.0 |
| Parque Estadual do Cristalino (rio Teles Pires) | Amazônia | Aline Gama Baptista | CC BY-SA 4.0 |
| Parque Estadual Serra de Ricardo Franco | Cerrado | Jean Taques Explorador Aventureiro | CC BY-SA 4.0 |
| RPPN Sesc Pantanal, Barão de Melgaço | Pantanal | Gabyschuck | CC BY-SA 4.0 |

Todas vêm do Wikimedia Commons. As versões publicadas foram redimensionadas e convertidas para WebP e continuam
sob CC BY-SA 4.0.
