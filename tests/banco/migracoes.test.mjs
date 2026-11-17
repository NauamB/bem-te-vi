// Migrações: aplicam-se do zero, não contêm dados e deixam o banco na forma esperada.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { criarBanco, listarMigracoes } from "./apoio.mjs";

let db;
before(async () => {
  db = await criarBanco();
});
after(() => db?.close());

describe("migrações", () => {
  test("aplicam-se num banco vazio e habilitam o PostGIS", async () => {
    const { rows } = await db.query("select extversion from pg_extension where extname = 'postgis'");
    assert.equal(rows.length, 1, "PostGIS instalado");
    assert.match(rows[0].extversion, /^3\./);
    const srid = await db.query("select 1 from extensions.spatial_ref_sys where srid = 4674");
    assert.equal(srid.rows.length, 1, "SIRGAS 2000 (EPSG:4674) disponível");
  });

  test("criam apenas os schemas protegido e publico", async () => {
    const { rows } = await db.query(
      "select nspname from pg_namespace where nspname in ('protegido', 'publico') order by 1",
    );
    assert.deepEqual(rows.map((r) => r.nspname), ["protegido", "publico"]);
  });

  test("não inserem, alteram nem copiam dados (só estrutura)", async () => {
    for (const { nome, sql } of await listarMigracoes()) {
      const semComentarios = sql.replace(/--.*$/gm, "");
      assert.doesNotMatch(semComentarios, /\b(insert\s+into|update\s+\w+\.\w+\s+set|copy\s+\w)/i, nome);
    }
  });

  test("schema publico contém só views", async () => {
    const { rows } = await db.query(
      "select relname, relkind from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'publico' and relkind in ('r', 'p', 'm', 'f')",
    );
    assert.deepEqual(rows, [], "nenhuma tabela no schema publico");
  });

  test("toda tabela protegida tem RLS e declara a natureza da informação", async () => {
    const { rows } = await db.query(`
      select c.relname, c.relrowsecurity, obj_description(c.oid, 'pg_class') as comentario
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'protegido' and c.relkind = 'r' order by 1`);
    assert.ok(rows.length >= 15, `tabelas encontradas: ${rows.length}`);
    for (const t of rows) {
      assert.equal(t.relrowsecurity, true, `RLS em protegido.${t.relname}`);
      assert.match(
        t.comentario ?? "",
        /^(Dado original|Dado tratado|Dado derivado|Proveniência|Decisão humana)/,
        `natureza declarada em protegido.${t.relname}`,
      );
    }
  });
});
