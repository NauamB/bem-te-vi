import { expect, test } from "../support/fixtures";

test.describe("navegação entre páginas (computador)", () => {
  test.use({ viewport: { width: 1366, height: 900 } });

  test("cabeçalho leva a Explorar e volta ao início pela marca", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Explorar biodiversidade" }).click();
    await expect(page).toHaveURL(/\/explorar$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explorar biodiversidade");
    await page.getByRole("link", { name: "Bem-te-vi — página inicial" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conhecer a biodiversidade é compreender o território.");
  });

  test("hero leva a Explorar e o histórico do navegador volta ao início", async ({ page }) => {
    await page.goto("/");
    await page.locator("section[aria-labelledby='hero-titulo']").getByRole("link", { name: "Explorar biodiversidade" }).click();
    await expect(page).toHaveURL(/\/explorar$/);
    await page.goBack();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conhecer a biodiversidade é compreender o território.");
  });

  test("cabeçalho leva ao acesso interno", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: "Acesso interno" }).click();
    await expect(page).toHaveURL(/\/acesso$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Em construção");
  });

  test("âncoras da navegação institucional levam às seções", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("navigation", { name: "Navegação institucional" });
    for (const [rotulo, id] of [["A plataforma", "plataforma"], ["Princípios", "principios"], ["Mato Grosso", "mato-grosso"], ["Estado do projeto", "estado"]]) {
      await nav.getByRole("link", { name: rotulo }).click();
      await expect(page).toHaveURL(new RegExp(`#${id}$`));
      await expect(page.locator(`#${id}`)).toBeInViewport();
    }
  });

  test("Conhecer a plataforma leva à seção correspondente", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Conhecer a plataforma" }).click();
    await expect(page).toHaveURL(/#plataforma$/);
    await expect(page.getByRole("heading", { level: 2, name: "Biodiversidade integrada" })).toBeInViewport();
  });

  test("rodapé leva a Explorar e ao acesso interno", async ({ page }) => {
    await page.goto("/");
    const rodape = page.getByRole("navigation", { name: "Links do rodapé" });
    await rodape.getByRole("link", { name: "Explorar biodiversidade" }).click();
    await expect(page).toHaveURL(/\/explorar$/);
    await page.goto("/");
    await page.getByRole("navigation", { name: "Links do rodapé" }).getByRole("link", { name: "Acesso interno" }).click();
    await expect(page).toHaveURL(/\/acesso$/);
  });

  test("Explorar: estado de dados em preparação e retorno", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page.getByRole("status")).toContainText("Os dados ainda estão sendo preparados.");
    await expect(page.getByText("Previsto", { exact: true })).toHaveCount(5);
    await page.getByRole("main").getByRole("link", { name: "Conhecer os princípios" }).click();
    await expect(page).toHaveURL(/\/#principios$/);
    await page.goto("/explorar");
    await page.getByRole("main").getByRole("link", { name: "Voltar à apresentação" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conhecer a biodiversidade é compreender o território.");
  });

  test("Acesso: marca e botão voltam ao início", async ({ page }) => {
    await page.goto("/acesso");
    await page.getByRole("main").getByRole("link", { name: "Voltar à apresentação" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await page.goto("/acesso");
    await page.getByRole("link", { name: "Bem-te-vi — página inicial" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
  });
});
