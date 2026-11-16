import { expect, test } from "../support/fixtures";

test.describe("página não encontrada", () => {
  // O 404 do documento é o próprio objeto do teste.
  test.use({ respostasPermitidas: [/\/rota-inexistente-e2e$/] });

  test("responde 404 real, com título próprio e uma única meta robots", async ({ page }) => {
    const resposta = await page.goto("/rota-inexistente-e2e");
    expect(resposta?.status()).toBe(404);
    await expect(page).toHaveTitle("Página não encontrada · Bem-te-vi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
    await expect(page.locator("meta[name='robots']")).toHaveCount(1);
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", "noindex");
    await expect(page.locator("meta[name='description']")).toHaveAttribute("content", "O endereço solicitado não corresponde a nenhuma página do Bem-te-vi.");
  });

  test("oferece retorno à página inicial", async ({ page }) => {
    await page.goto("/rota-inexistente-e2e");
    await page.getByRole("link", { name: "Voltar à apresentação" }).click();
    await expect(page).toHaveURL(/127\.0\.0\.1:\d+\/$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conhecer a biodiversidade é compreender o território.");
  });

  test("outros caminhos inexistentes também respondem 404", async ({ request }) => {
    for (const caminho of ["/explorar/inexistente", "/acesso/painel", "/especies"]) {
      expect((await request.get(caminho)).status(), caminho).toBe(404);
    }
  });
});
