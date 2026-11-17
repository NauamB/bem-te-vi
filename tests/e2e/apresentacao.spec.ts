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
    for (const titulo of ["Biodiversidade integrada", "Inteligência baseada em dados", "Mato Grosso, onde três biomas se encontram", "De onde vêm os dados", "Em que ponto estamos"]) {
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
    await expect(page.getByText("Composição gráfica com curvas de nível ao fundo. Não é mapa e não representa dados.")).toBeVisible();
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

  test("imagens e decoração vêm do próprio site, com descrição e crédito de licença", async ({ page }) => {
    const externas: string[] = [];
    page.on("request", (r) => {
      if (!r.url().startsWith("http://127.0.0.1:")) externas.push(r.url());
    });
    await page.goto("/");
    // Curvas de nível: composição gráfica, puramente decorativa.
    await expect(page.locator("[aria-hidden='true'][style*='/decoracao/']")).toHaveCount(1);
    expect((await page.request.get("/decoracao/curvas-hero.svg")).headers()["content-type"]).toContain("image/svg+xml");
    // Fotografias: só de /imagens/paisagens (servidas pelo otimizador do próprio Next.js), todas com texto alternativo.
    const imagens = page.locator("main img");
    await expect(imagens).toHaveCount(4);
    for (const img of await imagens.all()) {
      expect(await img.getAttribute("alt")).toBeTruthy();
      expect(decodeURIComponent((await img.getAttribute("src")) ?? "")).toContain("/imagens/paisagens/");
    }
    // Cada fotografia é identificada como ilustrativa e traz autor (fonte) e licença.
    await expect(page.getByText(/^Imagem ilustrativa de paisagem/)).toHaveCount(4);
    // Atribuição CC BY-SA: obra (link para a fonte original no Commons), autor, licença (link) e alterações.
    await expect(page.locator("main a[href^='https://commons.wikimedia.org/wiki/File:']")).toHaveCount(4);
    for (const obra of ["PARNA da Chapada dos Guimarães", "Parque Estadual do Cristalino", "PE Serra Ricardo Franco", "Cambara (Vochysia divergens Pohl)"]) {
      await expect(page.locator("main a[href^='https://commons.wikimedia.org/wiki/File:']", { hasText: obra })).toHaveCount(1);
    }
    for (const autor of ["RodrigoDZ", "Aline Gama Baptista", "Jean Taques Explorador Aventureiro", "Gabyschuck"]) {
      await expect(page.getByText(`de ${autor}, via Wikimedia Commons, licença`)).toHaveCount(1);
    }
    await expect(page.getByText(/^Alterações: redimensionada, convertida de JPEG para WebP e recortada/)).toHaveCount(4);
    await expect(page.getByRole("link", { name: "CC BY-SA 4.0" })).toHaveCount(4);
    expect(externas).toEqual([]);
  });
});

test.describe("busca do início", () => {
  // Sem banco nos testes, o explorador recebe 503 da API ao chegar com o termo: resposta esperada.
  test.use({ respostasPermitidas: [/\/api\/v1\/especies/] });

  test("busca de espécies do início leva ao explorador com o termo", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("searchbox", { name: "Buscar espécie" }).fill("jatoba");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/\/explorar\?q=jatoba$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Explorar biodiversidade");
    await expect(page.getByText("A base pública ainda não está disponível.")).toBeVisible();
  });
});
