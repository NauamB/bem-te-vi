import { site } from "@/lib/config/site";
import { expect, test } from "../support/fixtures";

test.describe("SEO e metadados", () => {
  test("página inicial: título, descrição, idioma, Open Graph e ícone", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(site.titulo);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.locator("meta[name='description']")).toHaveAttribute("content", site.descricao);
    await expect(page.locator("meta[property='og:title']")).toHaveAttribute("content", site.titulo);
    await expect(page.locator("meta[property='og:description']")).toHaveAttribute("content", site.descricao);
    await expect(page.locator("meta[property='og:site_name']")).toHaveAttribute("content", "Bem-te-vi");
    await expect(page.locator("meta[property='og:locale']")).toHaveAttribute("content", "pt_BR");
    await expect(page.locator("meta[property='og:type']")).toHaveAttribute("content", "website");
    await expect(page.locator("meta[name='theme-color']")).toHaveAttribute("content", "#1b4430");
    await expect(page.locator("link[rel~='icon']")).toHaveAttribute("href", /^\/icon\.svg/);
    await expect(page.locator("meta[name='robots']")).toHaveCount(0);
  });

  test("Explorar: título e descrição próprios, indexável", async ({ page }) => {
    await page.goto("/explorar");
    await expect(page).toHaveTitle("Explorar biodiversidade · Bem-te-vi");
    await expect(page.locator("meta[name='description']")).toHaveAttribute("content", "Área de exploração pública do Bem-te-vi. Os dados de biodiversidade ainda estão sendo preparados.");
    await expect(page.locator("meta[name='robots']")).toHaveCount(0);
  });

  test("robots.txt permite indexação e aponta o sitemap do domínio oficial", async ({ request }) => {
    const resposta = await request.get("/robots.txt");
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()["content-type"]).toContain("text/plain");
    const linhas = (await resposta.text()).split("\n").map((l) => l.trim()).filter(Boolean);
    expect(linhas).toEqual(["User-Agent: *", "Allow: /", `Sitemap: ${site.url}/sitemap.xml`]);
  });

  test("sitemap.xml lista só as páginas públicas existentes", async ({ request }) => {
    const resposta = await request.get("/sitemap.xml");
    expect(resposta.status()).toBe(200);
    expect(resposta.headers()["content-type"]).toContain("application/xml");
    const xml = await resposta.text();
    const enderecos = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(enderecos).toEqual([site.url, `${site.url}/explorar`]);
    expect(site.url).toBe("https://bem-te-vi-zeta.vercel.app");
    expect(xml).not.toContain("/acesso");
    // Cada página do sitemap existe localmente.
    for (const endereco of enderecos) {
      const caminho = endereco.replace(site.url, "") || "/";
      expect((await request.get(caminho)).status(), caminho).toBe(200);
    }
  });
});
