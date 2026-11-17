import { expect, test } from "../support/fixtures";

// API pública v1 no servidor de produção local, SEM banco configurado (BANCO_LEITURA_URL vazio em playwright.config.ts).
// O conteúdo das respostas com dados é testado em tests/banco/api.test.mjs, contra um banco sintético; aqui se confere
// o que depende do Next.js: roteamento, validação antes do banco, falha segura, métodos e cabeçalhos.

const PADRAO_CREDENCIAL = /(sb_secret_|sb_publishable_|eyJhbGci|postgres(ql)?:\/\/|pooler\.supabase\.com|BANCO_LEITURA_URL|SUPABASE_DB_URL)/i;

const VALIDAS = [
  "/api/v1/especies?q=jatoba",
  "/api/v1/especies/1",
  "/api/v1/ocorrencias?grupo=flora&limite=10",
  "/api/v1/distribuicao/celulas?grupo=fauna",
  "/api/v1/distribuicao/municipios?municipio=5103403",
  "/api/v1/territorio/municipios",
  "/api/v1/indicadores",
  "/api/v1/fontes",
];

test.describe("API pública v1 (sem banco)", () => {
  test("consultas válidas: 503 em JSON, sem cache e sem detalhes internos", async ({ request }) => {
    for (const caminho of VALIDAS) {
      const r = await request.get(caminho);
      expect(r.status(), caminho).toBe(503);
      expect(r.headers()["content-type"], caminho).toBe("application/json; charset=utf-8");
      expect(r.headers()["cache-control"], caminho).toBe("no-store");
      const texto = await r.text();
      expect(JSON.parse(texto).erro.codigo, caminho).toBe("banco_indisponivel");
      expect(texto, caminho).not.toMatch(PADRAO_CREDENCIAL);
    }
  });

  test("parâmetros inválidos: 400 antes de consultar o banco", async ({ request }) => {
    const casos: [string, string][] = [
      ["/api/v1/especies?q=ja", "q"],
      ["/api/v1/especies?q=jatoba&limite=500", "limite"],
      ["/api/v1/especies/abc", "id"],
      ["/api/v1/ocorrencias?lat=-15.6", "lat"],
      ["/api/v1/ocorrencias?apos=nao-e-cursor", "apos"],
      ["/api/v1/distribuicao/celulas?grupo=plantas", "grupo"],
      ["/api/v1/distribuicao/municipios?municipio=51", "municipio"],
      ["/api/v1/indicadores?x=1", "x"],
    ];
    for (const [caminho, parametro] of casos) {
      const r = await request.get(caminho);
      expect(r.status(), caminho).toBe(400);
      expect((await r.json()).erro.parametro, caminho).toBe(parametro);
    }
  });

  test("só GET: escrita é recusada (405)", async ({ request }) => {
    for (const caminho of ["/api/v1/ocorrencias", "/api/v1/especies/1"]) {
      expect((await request.post(caminho, { data: {} })).status(), caminho).toBe(405);
      expect((await request.delete(caminho)).status(), caminho).toBe(405);
    }
  });

  test("cabeçalhos de segurança também na API", async ({ request }) => {
    const cabecalhos = (await request.get("/api/v1/indicadores")).headers();
    expect(cabecalhos["x-content-type-options"]).toBe("nosniff");
    expect(cabecalhos["x-frame-options"]).toBe("DENY");
    expect(cabecalhos["x-powered-by"]).toBeUndefined();
  });

  test("rota inexistente da API: 404", async ({ request }) => {
    expect((await request.get("/api/v1/inexistente")).status()).toBe(404);
  });
});
