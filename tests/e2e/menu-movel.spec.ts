import type { Page } from "@playwright/test";
import { expect, test } from "../support/fixtures";

const DESTINOS = ["A plataforma", "Princípios", "Mato Grosso", "Estado do projeto", "Explorar biodiversidade", "Acesso interno"];

const botaoMenu = (page: Page) => page.getByRole("banner").locator("button[aria-expanded]");
async function painel(page: Page) {
  const id = await botaoMenu(page).getAttribute("aria-controls");
  expect(id, "o botão deve apontar o painel em aria-controls").toBeTruthy();
  return page.locator(`[id="${id}"]`);
}

test.describe("menu móvel (390 px)", () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  test("começa fechado e a navegação completa fica oculta", async ({ page }) => {
    await page.goto("/");
    await expect(botaoMenu(page)).toBeVisible();
    await expect(botaoMenu(page)).toHaveText("Menu");
    await expect(botaoMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect(await painel(page)).toBeHidden();
    await expect(page.getByRole("navigation", { name: "Navegação institucional" })).toBeHidden();
  });

  test("abre e fecha pelo botão, informando o estado em aria-expanded", async ({ page }) => {
    await page.goto("/");
    await botaoMenu(page).click();
    await expect(botaoMenu(page)).toHaveAttribute("aria-expanded", "true");
    await expect(botaoMenu(page)).toHaveText("Fechar");
    const p = await painel(page);
    await expect(p).toBeVisible();
    await expect(p.getByRole("link")).toHaveText(DESTINOS);
    await botaoMenu(page).click();
    await expect(botaoMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect(p).toBeHidden();
  });

  test("Escape fecha o menu e devolve o foco ao botão", async ({ page }) => {
    await page.goto("/");
    await botaoMenu(page).click();
    const p = await painel(page);
    await page.keyboard.press("Tab");
    await expect(p.getByRole("link", { name: "A plataforma" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(p).toBeHidden();
    await expect(botaoMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect(botaoMenu(page)).toBeFocused();
  });

  test("âncora fecha o menu e leva o foco à seção de destino", async ({ page }) => {
    await page.goto("/");
    await botaoMenu(page).click();
    await (await painel(page)).getByRole("link", { name: "Princípios" }).click();
    await expect(page).toHaveURL(/#principios$/);
    await expect(botaoMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("#principios")).toBeFocused();
    await expect(page.locator("#principios")).toBeInViewport();
  });

  test("troca de página fecha o menu e leva o foco ao conteúdo principal", async ({ page }) => {
    await page.goto("/");
    await botaoMenu(page).click();
    await (await painel(page)).getByRole("link", { name: "Explorar biodiversidade" }).click();
    await expect(page).toHaveURL(/\/explorar$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explorar biodiversidade");
    await expect(botaoMenu(page)).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator("main#conteudo")).toBeFocused();
  });

  test("ir ao acesso interno (outro layout) leva o foco ao conteúdo principal", async ({ page }) => {
    await page.goto("/");
    await botaoMenu(page).click();
    await (await painel(page)).getByRole("link", { name: "Acesso interno" }).click();
    await expect(page).toHaveURL(/\/acesso$/);
    // O Next.js 16 mantém a rota anterior no DOM, oculta (display: none), com o seu próprio main#conteudo.
    // O alvo é o main visível, que é também o primeiro no documento (o que getElementById devolve).
    await expect(page.locator("main#conteudo:visible")).toBeFocused();
    await expect(page.locator("main#conteudo").first()).toBeVisible();
  });
});
