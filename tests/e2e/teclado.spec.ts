import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";

// Nome acessível simplificado do elemento em foco (aria-label ou texto visível) e se o foco é perceptível.
async function emFoco(page: Page) {
  return page.evaluate(() => {
    const e = document.activeElement as HTMLElement | null;
    if (!e || e === document.body) return { nome: "(body)", contornoVisivel: false, naTela: false };
    const cs = getComputedStyle(e);
    const r = e.getBoundingClientRect();
    return {
      nome: (e.getAttribute("aria-label") || e.innerText || "").trim().split("\n")[0],
      contornoVisivel: cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0,
      naTela: r.width > 1 && r.height > 1 && r.bottom > 0 && r.top < innerHeight,
    };
  });
}

test.describe("teclado no computador (1366 px)", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("ordem de Tab no cabeçalho e no início do conteúdo, sempre com foco visível", async ({ page }) => {
    await page.goto("/");
    const esperado = [
      "Ir para o conteúdo",
      "Bem-te-vi — página inicial",
      "A plataforma",
      "Princípios",
      "Mato Grosso",
      "Estado do projeto",
      "Acesso interno",
      "Explorar biodiversidade",
      "Explorar biodiversidade",
      "Conhecer a plataforma",
    ];
    for (const nome of esperado) {
      await page.keyboard.press("Tab");
      const foco = await emFoco(page);
      expect(foco.nome).toBe(nome);
      expect(foco.contornoVisivel, `contorno de foco em "${nome}"`).toBe(true);
      expect(foco.naTela, `"${nome}" visível ao receber foco`).toBe(true);
    }
  });

  test("link para o conteúdo aparece ao receber foco e pula o cabeçalho", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const pular = page.getByRole("link", { name: "Ir para o conteúdo" });
    await expect(pular).toBeFocused();
    await expect(pular).toBeInViewport();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#conteudo$/);
    await page.keyboard.press("Tab");
    await expect(page.locator("section[aria-labelledby='hero-titulo']").getByRole("link", { name: "Explorar biodiversidade" })).toBeFocused();
  });

  test("Enter em um link navega e Shift+Tab volta pela mesma ordem", async ({ page }) => {
    await page.goto("/");
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
    expect((await emFoco(page)).nome).toBe("Explorar biodiversidade");
    await page.keyboard.press("Shift+Tab");
    expect((await emFoco(page)).nome).toBe("Acesso interno");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/explorar$/);
  });
});

test.describe("teclado no celular (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("ordem de Tab com o menu fechado ignora o painel oculto", async ({ page }) => {
    await page.goto("/");
    const esperado = ["Ir para o conteúdo", "Bem-te-vi — página inicial", "Menu", "Explorar biodiversidade"];
    for (const nome of esperado) {
      await page.keyboard.press("Tab");
      const foco = await emFoco(page);
      expect(foco.nome).toBe(nome);
      expect(foco.contornoVisivel, `contorno de foco em "${nome}"`).toBe(true);
    }
  });

  test("menu por teclado: Enter abre, foco permanece no botão e não há armadilha de foco", async ({ page }) => {
    await page.goto("/");
    const botao = page.getByRole("banner").locator("button[aria-expanded]");
    await botao.focus();
    await page.keyboard.press("Enter");
    await expect(botao).toHaveAttribute("aria-expanded", "true");
    await expect(botao).toBeFocused();
    // Tab percorre os 6 destinos do painel e depois sai para o conteúdo da página.
    for (const nome of ["A plataforma", "Princípios", "Mato Grosso", "Estado do projeto", "Explorar biodiversidade", "Acesso interno"]) {
      await page.keyboard.press("Tab");
      expect((await emFoco(page)).nome).toBe(nome);
    }
    await page.keyboard.press("Tab");
    await expect(page.locator("section[aria-labelledby='hero-titulo']").getByRole("link", { name: "Explorar biodiversidade" })).toBeFocused();
    // A partir do botão, Shift+Tab volta para a marca (a ordem reversa também funciona).
    await botao.focus();
    await page.keyboard.press("Shift+Tab");
    expect((await emFoco(page)).nome).toBe("Bem-te-vi — página inicial");
  });
});

test.describe("teclado na página 404", () => {
  test.use({ respostasPermitidas: [/\/inexistente-teclado$/] });

  test("Tab chega ao retorno e Enter leva ao início", async ({ page }) => {
    await page.goto("/inexistente-teclado");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Tab");
    expect((await emFoco(page)).nome).toBe("Voltar à apresentação");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conhecer a biodiversidade é compreender o território.");
  });
});
