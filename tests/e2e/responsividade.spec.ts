import { ALTURA_PADRAO, ALVO_MINIMO_ALTURA, ALVO_MINIMO_LARGURA, LARGURA_MENU_COMPLETO, LARGURA_TABLET, LARGURAS, ROTAS_PUBLICAS } from "../support/larguras";
import { expect, test } from "../support/fixtures";

// Medições feitas no próprio navegador. Elementos decorativos (SVG, sr-only, ocultos) ficam de fora.
type Medicao = {
  rolagem: number;
  largura: number;
  fora: string[];
  cortados: string[];
  pequenos: string[];
  sobreposicoes: string[];
};

for (const largura of LARGURAS) {
  test.describe(`${largura} px`, () => {
    const celular = largura < LARGURA_TABLET;
    test.use({ viewport: { width: largura, height: ALTURA_PADRAO }, isMobile: celular, hasTouch: celular });

    for (const rota of ROTAS_PUBLICAS) {
      test(`${rota}: sem rolagem horizontal, sem elementos fora da tela, sem sobreposição e com alvos utilizáveis`, async ({ page }) => {
        await page.goto(rota);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        const m: Medicao = await page.evaluate(
          ({ alvoAltura, alvoLargura }) => {
            const d = document.documentElement;
            const W = d.clientWidth;
            const visivel = (e: Element) => {
              const r = e.getBoundingClientRect();
              const cs = getComputedStyle(e);
              return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && !e.closest("[hidden]");
            };
            const elementos = [...document.querySelectorAll("body *")].filter((e) => !e.closest("svg") && !e.classList.contains("sr-only") && visivel(e));
            const descrever = (e: Element) => `${e.tagName.toLowerCase()} "${((e as HTMLElement).innerText || "").trim().slice(0, 30)}"`;
            const fora = elementos.filter((e) => {
              const r = e.getBoundingClientRect();
              return (r.right > W + 1 || r.left < -1) && getComputedStyle(e).position !== "fixed";
            }).map(descrever);
            const cortados = elementos.filter((e) => {
              const h = e as HTMLElement;
              return e.children.length === 0 && h.innerText?.trim() && h.scrollWidth > h.clientWidth + 1 && ["hidden", "clip"].includes(getComputedStyle(e).overflowX);
            }).map(descrever);
            const alvos = [...document.querySelectorAll("a, button, summary, input, select, textarea")].filter((e) => visivel(e) && !e.classList.contains("sr-only"));
            const pequenos = alvos.filter((e) => {
              const r = e.getBoundingClientRect();
              return r.height < alvoAltura || r.width < alvoLargura;
            }).map((e) => `${descrever(e)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
            const blocos = [...document.querySelectorAll("h1, h2, h3, p, li, dt, dd, a, button")].filter(visivel).map((e) => ({ e, r: e.getBoundingClientRect() }));
            const sobreposicoes: string[] = [];
            for (let i = 0; i < blocos.length; i++) {
              for (let j = i + 1; j < blocos.length; j++) {
                const a = blocos[i], b = blocos[j];
                if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
                const ix = Math.min(a.r.right, b.r.right) - Math.max(a.r.left, b.r.left);
                const iy = Math.min(a.r.bottom, b.r.bottom) - Math.max(a.r.top, b.r.top);
                if (ix > 4 && iy > 4) sobreposicoes.push(`${descrever(a.e)} × ${descrever(b.e)}`);
              }
            }
            return { rolagem: d.scrollWidth, largura: W, fora, cortados, pequenos, sobreposicoes };
          },
          { alvoAltura: ALVO_MINIMO_ALTURA, alvoLargura: ALVO_MINIMO_LARGURA },
        );
        expect(m.rolagem, "rolagem horizontal").toBeLessThanOrEqual(m.largura);
        expect(m.fora, "elementos fora da tela").toEqual([]);
        expect(m.cortados, "textos cortados").toEqual([]);
        expect(m.sobreposicoes, "blocos de texto sobrepostos").toEqual([]);
        expect(m.pequenos, "controles menores que o mínimo").toEqual([]);

        // O cabeçalho do observatório alterna entre menu móvel e navegação completa em 1024 px.
        if (rota !== "/acesso") {
          const menu = page.getByRole("banner").locator("button[aria-expanded]");
          const navegacao = page.getByRole("navigation", { name: "Navegação institucional" });
          if (largura < LARGURA_MENU_COMPLETO) {
            await expect(menu).toBeVisible();
            await expect(navegacao).toBeHidden();
          } else {
            await expect(menu).toBeHidden();
            await expect(navegacao).toBeVisible();
          }
        }
      });
    }
  });
}
