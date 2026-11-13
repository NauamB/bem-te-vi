// Gera as curvas de nível decorativas do Bem-te-vi como SVGs estáticos em public/decoracao/.
// Composição gráfica determinística (mesmo resultado a cada execução): não representa relevo, território ou dado real.
//
// Uso:
//   node scripts/gerar-decoracao.mjs              grava os arquivos
//   node scripts/gerar-decoracao.mjs --verificar  só confere se os arquivos estão atualizados (código 1 se não estiverem)
//
// Antes (Fase 10C) as curvas eram SVG inline: cerca de 135 KB repetidos no HTML e no payload do React a cada
// visita à página inicial. Como arquivos estáticos, saem do documento e ficam em cache no navegador.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), "..");
const DESTINO = join(RAIZ, "public", "decoracao");

// Mesmos parâmetros e cores da versão inline aprovada na Fase 10C (cor = token do tema, opacidade = alfa usado antes).
const COMPOSICOES = [
  {
    arquivo: "curvas-hero.svg",
    largura: 1400, altura: 800, cor: "#1b4430", opacidade: 0.07, casas: 0,
    centros: [{ x: 1180, y: 330, raioInicial: 40, passo: 34, niveis: 16, fase: 0.6 }],
  },
  {
    arquivo: "curvas-painel.svg",
    largura: 500, altura: 400, cor: "#8fbd9f", opacidade: 0.35, casas: 1,
    centros: [
      { x: 150, y: 120, raioInicial: 10, passo: 15, niveis: 9, fase: 0.2 },
      { x: 380, y: 300, raioInicial: 14, passo: 17, niveis: 8, fase: 1.9 },
    ],
  },
  {
    arquivo: "curvas-mato-grosso.svg",
    largura: 1400, altura: 700, cor: "#8fbd9f", opacidade: 0.12, casas: 0,
    centros: [
      { x: 200, y: 560, raioInicial: 30, passo: 30, niveis: 14, fase: 2.4 },
      { x: 1250, y: 120, raioInicial: 20, passo: 28, niveis: 10, fase: 0.9 },
    ],
  },
];

const AMOSTRAS = 40; // pontos por curva; a interpolação Catmull-Rom → Bézier mantém o traço suave

function pontos(c, nivel) {
  const r = c.raioInicial + nivel * c.passo;
  return Array.from({ length: AMOSTRAS }, (_, i) => {
    const t = (i / AMOSTRAS) * Math.PI * 2;
    const ondulacao = 1 + 0.11 * Math.sin(3 * t + c.fase + nivel * 0.35) + 0.06 * Math.sin(5 * t - nivel * 0.5) + 0.03 * Math.cos(7 * t + c.fase);
    return [c.x + Math.cos(t) * r * ondulacao * 1.25, c.y + Math.sin(t) * r * ondulacao];
  });
}

// Curva fechada Catmull-Rom (tensão 0,5) convertida em segmentos cúbicos de Bézier.
function caminho(p, casas) {
  const f = (v) => {
    const s = v.toFixed(casas);
    return s === "-0" || s === "-0.0" ? "0" : s;
  };
  const n = p.length;
  let d = `M${f(p[0][0])} ${f(p[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = p[(i - 1 + n) % n], p1 = p[i], p2 = p[(i + 1) % n], p3 = p[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return `${d}Z`;
}

function svg(comp) {
  const finos = [], grossos = [];
  for (const c of comp.centros) for (let n = 0; n < c.niveis; n++) (n % 4 === 3 ? grossos : finos).push(caminho(pontos(c, n), comp.casas));
  // vector-effect não é herdado: precisa estar em cada <path> para o traço manter a espessura em qualquer escala.
  const grupo = (lista, espessura) => `<path d="${lista.join("")}" stroke-width="${espessura}" vector-effect="non-scaling-stroke"/>`;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${comp.largura} ${comp.altura}" preserveAspectRatio="xMidYMid slice">`,
    `<g fill="none" stroke="${comp.cor}" stroke-opacity="${comp.opacidade}">`,
    grupo(finos, 0.8),
    grossos.length ? grupo(grossos, 1.4) : "",
    `</g></svg>`,
    "",
  ].join("");
}

const verificar = process.argv.includes("--verificar");
let desatualizados = 0;
mkdirSync(DESTINO, { recursive: true });
for (const comp of COMPOSICOES) {
  const alvo = join(DESTINO, comp.arquivo);
  const conteudo = svg(comp);
  if (verificar) {
    let atual = null;
    try { atual = readFileSync(alvo, "utf8"); } catch { /* ausente */ }
    const ok = atual === conteudo;
    if (!ok) desatualizados++;
    console.log(`${ok ? "ok" : "DESATUALIZADO"}  public/decoracao/${comp.arquivo}`);
  } else {
    writeFileSync(alvo, conteudo);
    console.log(`gerado  public/decoracao/${comp.arquivo}  ${Buffer.byteLength(conteudo)} bytes`);
  }
}
process.exit(desatualizados ? 1 : 0);
