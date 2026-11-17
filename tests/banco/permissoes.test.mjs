// Permissões: o papel do site só lê `publico`; os papéis da API do Supabase não leem nada;
// e o RLS segura mesmo um GRANT concedido por engano.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoPapel, criarBanco, erroDe } from "./apoio.mjs";

let db;
let tabelasProtegidas;
let viewsPublicas;
before(async () => {
  db = await criarBanco({ sinteticos: true });
  const t = await db.query("select table_name from information_schema.tables where table_schema = 'protegido' order by 1");
  tabelasProtegidas = t.rows.map((r) => r.table_name);
  const v = await db.query("select table_name from information_schema.views where table_schema = 'publico' order by 1");
  viewsPublicas = v.rows.map((r) => r.table_name);
});
after(() => db?.close());

describe("papel bemtevi_leitura (site)", () => {
  test("lê todas as views públicas", async () => {
    assert.deepEqual(viewsPublicas, ["busca", "conjunto_dados", "distribuicao", "especie", "fonte", "lote", "municipio", "nome_cientifico", "nome_popular", "ocorrencia", "perfil"]);
    for (const view of viewsPublicas) {
      const { rows } = await comoPapel(db, "bemtevi_leitura", `select count(*)::int as n from publico.${view}`);
      assert.ok(rows[0].n > 0, `publico.${view} deveria ter linhas sintéticas`);
    }
  });

  test("não lê nenhuma tabela nem view do schema protegido", async () => {
    assert.ok(tabelasProtegidas.includes("ocorrencia"));
    for (const tabela of tabelasProtegidas) {
      const erro = await erroDe(() => comoPapel(db, "bemtevi_leitura", `select * from protegido.${tabela} limit 1`));
      assert.match(erro ?? "", /permission denied/, `protegido.${tabela} deveria ser negada`);
    }
  });

  test("não escreve nas views públicas", async () => {
    const erro = await erroDe(() => comoPapel(db, "bemtevi_leitura", "delete from publico.fonte"));
    assert.match(erro ?? "", /permission denied/);
  });

  test("não executa funções internas nem cria objetos em publico", async () => {
    assert.match(await erroDe(() => comoPapel(db, "bemtevi_leitura", "select protegido.impedir_alteracao()")) ?? "", /permission denied/);
    assert.match(await erroDe(() => comoPapel(db, "bemtevi_leitura", "create view publico.x as select 1")) ?? "", /permission denied/);
  });
});

describe("papéis da API do Supabase (anon, authenticated)", () => {
  for (const papel of ["anon", "authenticated"]) {
    test(`${papel} não lê publico nem protegido`, async () => {
      for (const alvo of ["publico.ocorrencia", "publico.especie", "protegido.ocorrencia", "protegido.ocorrencia_recebida"]) {
        const erro = await erroDe(() => comoPapel(db, papel, `select * from ${alvo} limit 1`));
        assert.match(erro ?? "", /permission denied/, `${papel} em ${alvo}`);
      }
    });
  }
});

describe("defesa em profundidade", () => {
  test("GRANT indevido numa tabela protegida não expõe linhas, porque o RLS não tem políticas", async () => {
    await db.exec("grant usage on schema protegido to bemtevi_leitura; grant select on protegido.ocorrencia to bemtevi_leitura;");
    try {
      const { rows } = await comoPapel(db, "bemtevi_leitura", "select count(*)::int as n from protegido.ocorrencia");
      assert.equal(rows[0].n, 0);
    } finally {
      await db.exec("revoke select on protegido.ocorrencia from bemtevi_leitura; revoke usage on schema protegido from bemtevi_leitura;");
    }
  });
});
