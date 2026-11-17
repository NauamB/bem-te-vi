import { expect, test } from "../support/fixtures";

// Explorador de espécies sem banco configurado (playwright.config.ts): a API responde 503 e a interface precisa
// dizer que a base ainda não está disponível, sem simular resultados.
test.describe("explorador de espécies (sem dados publicados)", () => {
  test.use({ respostasPermitidas: [/\/api\/v1\/especies/] });

  test("busca informa que a base pública ainda não está disponível e não mostra resultados", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page.getByText("Os resultados da busca aparecem aqui.")).toBeVisible();
    await page.getByRole("searchbox", { name: "Buscar espécie" }).fill("jatoba");
    await page.getByRole("radio", { name: "Flora" }).check({ force: true });
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page).toHaveURL(/\/explorar\?q=jatoba&grupo=flora$/);
    await expect(page.getByText("A base pública ainda não está disponível.")).toBeVisible();
    await expect(page.locator("main li button")).toHaveCount(0);
  });

  test("termo curto é recusado antes de consultar a API", async ({ page }) => {
    const consultas: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/api/v1/")) consultas.push(r.url());
    });
    await page.goto("/explorar");
    await page.getByRole("searchbox", { name: "Buscar espécie" }).fill("ja");
    await page.getByRole("button", { name: "Buscar", exact: true }).click();
    await expect(page.getByText("Digite pelo menos 3 letras do nome.")).toBeVisible();
    expect(consultas).toEqual([]);
  });

  test("busca vinda da página inicial já consulta a API pelo termo da URL", async ({ page }) => {
    await page.goto("/explorar?q=hymenaea");
    await expect(page.getByRole("searchbox", { name: "Buscar espécie" })).toHaveValue("hymenaea");
    await expect(page.getByText("A base pública ainda não está disponível.")).toBeVisible();
  });

  test("filtro geográfico aparece como em preparação, sem opções inventadas", async ({ page }) => {
    await page.goto("/explorar");
    const filtro = page.getByRole("combobox", { name: "Filtro geográfico" });
    await expect(filtro).toBeDisabled();
    await expect(filtro.locator("option")).toHaveCount(1);
  });
});
