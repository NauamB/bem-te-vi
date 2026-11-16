import { expect, test } from "../support/fixtures";

// Cabeçalhos definidos em next.config.ts. O HSTS é aplicado pela Vercel em produção e não é testado aqui
// (o servidor local usa http).
const CABECALHOS = {
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "cross-origin-opener-policy": "same-origin",
};

const PADRAO_CREDENCIAL = /(sb_secret_[A-Za-z0-9]|sb_publishable_[A-Za-z0-9]{6}|eyJhbGci[A-Za-z0-9_-]{10}|gh[pousr]_[A-Za-z0-9]{15}|github_pat_|AKIA[0-9A-Z]{12}|AIza[0-9A-Za-z_-]{20}|-----BEGIN [A-Z ]*PRIVATE KEY)/;

test.describe("segurança", () => {
  test("cabeçalhos de segurança em páginas, metadados, recursos e 404", async ({ request }) => {
    const caminhos = ["/", "/explorar", "/acesso", "/robots.txt", "/sitemap.xml", "/icon.svg", "/decoracao/curvas-hero.svg", "/inexistente-seguranca"];
    for (const caminho of caminhos) {
      const cabecalhos = (await request.get(caminho)).headers();
      for (const [nome, valor] of Object.entries(CABECALHOS)) expect(cabecalhos[nome], `${nome} em ${caminho}`).toBe(valor);
      expect(cabecalhos["x-powered-by"], `x-powered-by em ${caminho}`).toBeUndefined();
    }
  });

  test("arquivos sensíveis e código-fonte não são servidos", async ({ request }) => {
    const caminhos = [
      "/.env", "/.env.local", "/.env.example", "/.git/config", "/.git/HEAD",
      "/package.json", "/package-lock.json", "/next.config.ts", "/tsconfig.json", "/playwright.config.ts",
      "/AGENTS.md", "/README.md", "/docs/RELATORIO_FASE_10D_3.md",
      "/app/sitemap.ts", "/scripts/gerar-decoracao.mjs", "/tests/support/fixtures.ts",
      "/.next/BUILD_ID", "/_next/BUILD_ID",
    ];
    for (const caminho of caminhos) expect((await request.get(caminho)).status(), caminho).toBe(404);
  });

  test("scripts públicos sem mapas de código e sem credenciais", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).not.toMatch(PADRAO_CREDENCIAL);
    const scripts = await page.locator("script[src]").evaluateAll((els) => els.map((e) => (e as HTMLScriptElement).src));
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) {
      const resposta = await page.request.get(src);
      expect(resposta.status(), src).toBe(200);
      const codigo = await resposta.text();
      expect(codigo, src).not.toMatch(PADRAO_CREDENCIAL);
      expect(codigo, src).not.toMatch(/SUPABASE_SECRET_KEY|service_role/);
      expect(codigo, src).not.toMatch(/sourceMappingURL=/);
      expect((await page.request.get(`${src}.map`)).status(), `${src}.map`).toBe(404);
    }
  });
});
