// Regras de acesso ao banco conferidas no CÓDIGO da aplicação (Fase 11.5.1). Complementam as permissões do banco:
// mesmo que alguém escreva uma consulta errada, ela não passa por aqui.
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, test } from "node:test";

const RAIZ = join(import.meta.dirname, "..", "..");
const arquivos = (pasta) =>
  readdirSync(join(RAIZ, pasta)).flatMap((nome) => {
    const caminho = join(pasta, nome);
    return statSync(join(RAIZ, caminho)).isDirectory() ? arquivos(caminho) : /\.(ts|tsx|mjs|js)$/.test(nome) ? [caminho.split(sep).join("/")] : [];
  });
const codigoDoSite = ["app", "components", "lib", "types"].flatMap(arquivos);
const ler = (arquivo) => readFileSync(join(RAIZ, arquivo), "utf8");

describe("código do site e acesso ao banco", () => {
  test("nenhum arquivo do site cita o schema protegido", () => {
    for (const a of codigoDoSite) assert.doesNotMatch(ler(a), /\bprotegido\./, a);
  });

  test("SQL só nos módulos de dados (lib/modulos) e só leitura", () => {
    for (const a of codigoDoSite) {
      const texto = ler(a);
      if (/\bfrom\s+publico\./i.test(texto)) assert.ok(a.startsWith("lib/modulos/"), `${a} tem SQL fora de lib/modulos`);
      if (a.startsWith("lib/modulos/")) assert.doesNotMatch(texto, /\b(insert\s+into|update\s+\w+(\.\w+)?\s+set|delete\s+from|copy\s|create\s|alter\s|drop\s|truncate|grant\s|set\s+role)/i, a);
    }
  });

  test("credencial do banco só no servidor: BANCO_LEITURA_URL só em lib/banco/leitura.ts, que importa server-only", () => {
    const leitura = ler("lib/banco/leitura.ts");
    // \r?\n: o checkout no Windows (core.autocrlf) usa CRLF.
    assert.match(leitura.replace(/^\/\/.*\r?\n/gm, ""), /^import "server-only";/);
    for (const a of codigoDoSite) {
      if (a !== "lib/banco/leitura.ts") assert.doesNotMatch(ler(a), /BANCO_LEITURA_URL|SUPABASE_DB_URL|SUPABASE_SECRET_KEY/, a);
    }
  });

  test("variáveis NEXT_PUBLIC_ só para a configuração pública do Supabase", () => {
    for (const a of codigoDoSite) {
      for (const [nome] of ler(a).matchAll(/NEXT_PUBLIC_[A-Z0-9_]+/g)) {
        assert.ok(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"].includes(nome), `${a}: ${nome}`);
      }
    }
  });

  test("componentes de cliente não importam banco, módulos de dados nem a API", () => {
    for (const a of codigoDoSite) {
      const texto = ler(a);
      if (/^\s*["']use client["']/m.test(texto)) assert.doesNotMatch(texto, /lib\/(banco|modulos|api)\b/, a);
    }
  });

  test("rotas da API: só GET, finas, com a consulta de produção", () => {
    const rotas = arquivos("app/api");
    assert.equal(rotas.length, 8, rotas.join(", "));
    for (const a of rotas) {
      const texto = ler(a);
      assert.ok(a.endsWith("/route.ts"), a);
      assert.deepEqual([...texto.matchAll(/export\s+(?:async\s+)?(?:function|const)\s+(\w+)/g)].map((m) => m[1]), ["GET"], a);
      assert.deepEqual([...texto.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]).sort(), ["@/lib/api/v1", "@/lib/banco/leitura"], a);
    }
  });

  test("os módulos de dados não abrem conexão: recebem a função de consulta", () => {
    for (const a of codigoDoSite.filter((x) => x.startsWith("lib/modulos/") || x.startsWith("lib/api/"))) {
      assert.doesNotMatch(ler(a), /from\s+["'](postgres|@electric-sql\/pglite[^"']*|[^"']*banco\/leitura(\.ts)?)["']/, a);
    }
  });
});

test("lista de arquivos verificados não está vazia", () => {
  assert.ok(codigoDoSite.length > 20, relative(RAIZ, RAIZ));
});
