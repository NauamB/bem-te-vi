import { expect, test } from "../support/fixtures";

// O ambiente interno ainda não existe: a página explica o que virá, sem simular login.
// A suíte roda sem variáveis do Supabase (como na CI), por isso o estado esperado é "Não configurada".
test.describe("acesso interno", () => {
  test("informa que está em construção, sem formulário nem senha simulada", async ({ page }) => {
    await page.goto("/acesso");
    await expect(page).toHaveTitle("Acesso interno · Bem-te-vi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Em construção");
    await expect(page.getByText("Não há login nesta versão, e nenhuma tela de acesso é simulada.", { exact: false })).toBeVisible();
    await expect(page.locator("form, input, textarea, select, button")).toHaveCount(0);
    await expect(page.locator("[type='password'], [autocomplete*='password']")).toHaveCount(0);
  });

  test("mostra a infraestrutura de autenticação como não configurada", async ({ page }) => {
    await page.goto("/acesso");
    const linha = page.locator("dl").filter({ hasText: "Infraestrutura de autenticação" });
    await expect(linha.locator("dd")).toHaveText("Não configurada");
  });

  test("não faz requisições a serviços externos", async ({ page }) => {
    const externas: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:")) externas.push(r.url());
    });
    await page.goto("/acesso");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(externas).toEqual([]);
  });

  test("não deve ser indexado (meta robots e X-Robots-Tag)", async ({ page }) => {
    const resposta = await page.goto("/acesso");
    expect(resposta?.status()).toBe(200);
    expect(resposta?.headers()["x-robots-tag"]).toBe("noindex, nofollow");
    await expect(page.locator("meta[name='robots']")).toHaveAttribute("content", "noindex, nofollow");
  });
});
