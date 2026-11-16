import { site } from "@/lib/config/site";
import { expect, extrairNumeros, NUMEROS_PERMITIDOS, test } from "../support/fixtures";

test.describe("página de apresentação", () => {
  test("título, H1, assinatura e subtítulo", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle("Bem-te-vi — Plataforma de Inteligência da Biodiversidade");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Conhecer a biodiversidade é compreender o território.");
    await expect(page.getByRole("main").getByText(site.assinatura, { exact: true })).toBeVisible();
    await expect(page.getByRole("main").getByText(site.descricao, { exact: true })).toBeVisible();
  });

  test("seções e conteúdo essencial", async ({ page }) => {
    await page.goto("/");
    const main = page.getByRole("main");
    for (const titulo of ["Biodiversidade integrada", "Inteligência baseada em dados", "Mato Grosso, onde três biomas se encontram", "Em que ponto estamos"]) {
      await expect(main.getByRole("heading", { level: 2, name: titulo })).toBeVisible();
    }
    for (const dimensao of ["Flora", "Fauna", "Território"]) await expect(main.locator("#plataforma").getByRole("heading", { level: 3, name: dimensao })).toBeVisible();
    for (const principio of ["Fontes identificadas", "Rastreabilidade", "Informação geográfica", "Transparência metodológica", "Atualização controlada"]) {
      await expect(main.locator("#principios").getByRole("heading", { level: 3, name: principio })).toBeVisible();
    }
    for (const bioma of ["Amazônia", "Cerrado", "Pantanal"]) await expect(main.locator("#mato-grosso").getByRole("heading", { level: 3, name: bioma })).toBeVisible();
  });

  test("botões principais apontam para os destinos corretos", async ({ page }) => {
    await page.goto("/");
    const hero = page.locator("section[aria-labelledby='hero-titulo']");
    await expect(hero.getByRole("link", { name: "Explorar biodiversidade" })).toHaveAttribute("href", "/explorar");
    await expect(hero.getByRole("link", { name: "Conhecer a plataforma" })).toHaveAttribute("href", "/#plataforma");
    const cabecalho = page.getByRole("banner");
    await expect(cabecalho.getByRole("link", { name: "Explorar biodiversidade" })).toHaveAttribute("href", "/explorar");
    await expect(cabecalho.getByRole("link", { name: "Acesso interno" })).toHaveAttribute("href", "/acesso");
  });

  test("avisos institucionais e de estado do projeto estão visíveis", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Fase de fundação: os dados de biodiversidade ainda estão sendo preparados.")).toBeVisible();
    await expect(page.getByText("Composição gráfica com curvas de nível. Não é mapa e não representa dados.")).toBeVisible();
    // O aviso de natureza do projeto (não oficial, sem dados publicados) aparece na seção de estado e no rodapé.
    await expect(page.getByText(site.aviso, { exact: true })).toHaveCount(2);
    await expect(page.getByRole("contentinfo").getByText(`v${site.versao} · ${site.fase}`)).toBeVisible();
  });

  test("não apresenta números ambientais inventados", async ({ page }) => {
    await page.goto("/");
    const texto = await page.locator("body").innerText();
    const numeros = extrairNumeros(texto);
    expect(numeros.filter((n) => !NUMEROS_PERMITIDOS.has(n)), `números fora da lista permitida: ${numeros.join(", ")}`).toEqual([]);
    // Nenhuma contagem ou medida associada a dados ambientais.
    expect(texto).not.toMatch(/\d[\d.,]*\s*(%|km²|km2|hectares?|ha\b|espécies|registros|ocorrências|focos)/i);
  });

  test("decoração é puramente visual e carregada do próprio site", async ({ page }) => {
    const externas: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:")) externas.push(r.url());
    });
    await page.goto("/");
    const decoracoes = page.locator("[aria-hidden='true'][style*='/decoracao/']");
    await expect(decoracoes).toHaveCount(3);
    for (const arquivo of ["curvas-hero", "curvas-painel", "curvas-mato-grosso"]) {
      const resposta = await page.request.get(`/decoracao/${arquivo}.svg`);
      expect(resposta.status()).toBe(200);
      expect(resposta.headers()["content-type"]).toContain("image/svg+xml");
    }
    // Sem imagens raster e sem requisições a outros domínios (fontes são servidas pelo próprio app).
    await expect(page.locator("img")).toHaveCount(0);
    expect(externas).toEqual([]);
  });
});
