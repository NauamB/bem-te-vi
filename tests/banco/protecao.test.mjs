// Proteção de coordenadas (ADR-0001, seção 6): estes testes bloqueiam a publicação se falharem.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { comoPapel, criarBanco } from "./apoio.mjs";

const GRADE = 0.1;
const EPS = 1e-9;

let db;
let publicas;
before(async () => {
  db = await criarBanco({ sinteticos: true });
  // Ligação interna (como dono) entre a linha pública e a ocorrência protegida, só para conferência.
  const { rows } = await db.query(`
    select p.*, o.id_externo, st_x(o.geom) as x, st_y(o.geom) as y, r.decimal_latitude, r.decimal_longitude,
           st_xmin(p.celula) as xmin, st_ymin(p.celula) as ymin, st_xmax(p.celula) as xmax, st_ymax(p.celula) as ymax,
           st_area(p.celula) as area, st_npoints(p.celula) as pontos, st_srid(p.celula) as srid,
           st_covers(p.celula, o.geom) as contem
    from publico.ocorrencia p
    join protegido.ocorrencia o on o.id = p.id
    join protegido.ocorrencia_recebida r on r.id = o.recebida_id`);
  publicas = new Map(rows.map((r) => [r.id_externo, r]));
});
after(() => db?.close());

const multiploDaGrade = (v) => Math.abs(v / GRADE - Math.round(v / GRADE)) < 1e-6;

describe("estrutura da camada pública", () => {
  test("nenhuma coluna pública é ponto, latitude, longitude ou texto verbatim de localização", async () => {
    const { rows } = await db.query(`
      select table_name, column_name, udt_name from information_schema.columns
      where table_schema = 'publico' order by 1, 2`);
    for (const c of rows) {
      assert.doesNotMatch(
        c.column_name,
        /(^|_)(lat|latitude|lon|lng|long|longitude)(_|$)|coord|verbatim|localidade|locality|^x$|^y$|geom_precis/i,
        `${c.table_name}.${c.column_name}`,
      );
    }
    const geometrias = rows.filter((c) => c.udt_name === "geometry").map((c) => `${c.table_name}.${c.column_name}`);
    assert.deepEqual(geometrias, ["municipio.geom", "ocorrencia.celula"], "só limites municipais e células têm geometria");
  });

  test("a célula pública é sempre polígono (nunca ponto) em SIRGAS 2000", async () => {
    const { rows } = await db.query("select distinct geometrytype(celula) as tipo, st_srid(celula) as srid from publico.ocorrencia where celula is not null");
    assert.deepEqual(rows, [{ tipo: "POLYGON", srid: 4674 }]);
  });
});

describe("generalização conservadora para todas as ocorrências", () => {
  test("toda ocorrência não sensível vira a célula de 0,1° que contém o ponto", () => {
    const comCelula = [...publicas.values()].filter((p) => p.celula !== null);
    assert.ok(comCelula.length >= 3, "há ocorrências não sensíveis para conferir");
    for (const p of comCelula) {
      assert.equal(p.protecao, "celula_0_1_grau", p.id_externo);
      assert.equal(p.contem, true, `${p.id_externo}: célula contém o ponto`);
      assert.ok(Math.abs(p.area - GRADE * GRADE) < EPS, `${p.id_externo}: área de uma célula`);
      assert.equal(p.pontos, 5, `${p.id_externo}: retângulo`);
      for (const v of [p.xmin, p.ymin, p.xmax, p.ymax]) assert.ok(multiploDaGrade(v), `${p.id_externo}: vértice ${v} na grade`);
    }
  });

  test("coordenadas negativas (caso de Mato Grosso) caem na célula correta", () => {
    const p = publicas.get("G10");
    assert.deepEqual([p.xmin, p.ymin, p.xmax, p.ymax].map((v) => Math.round(v * 10) / 10), [-0.1, -0.1, 0, 0]);
  });

  test("nenhum valor público contém a coordenada precisa", async () => {
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select *, st_astext(celula) as celula_wkt from publico.ocorrencia");
    const texto = JSON.stringify(rows);
    for (const p of publicas.values()) {
      for (const c of [p.decimal_latitude, p.decimal_longitude]) {
        assert.ok(!texto.includes(c), `coordenada ${c} (${p.id_externo}) vazou`);
      }
    }
    assert.ok(!texto.includes("localidade precisa"), "localidade verbatim vazou");
  });

  test("a generalização continua mesmo com uma política marcada como validada", async () => {
    await db.exec("insert into protegido.politica_protecao (versao, estado, grade_graus, descricao, validada_por, validada_em) values (99, 'validada', 0.01, '[SINTÉTICO] teste', 'teste', now())");
    try {
      const { rows } = await db.query("select count(*)::int as n from publico.ocorrencia where celula is not null and abs(st_area(celula) - 0.01) > 1e-9");
      assert.equal(rows[0].n, 0, "a precisão só muda por nova migração, depois da validação");
    } finally {
      await db.exec("delete from protegido.politica_protecao where versao = 99");
    }
  });
});

describe("espécies sensíveis e generalização na fonte", () => {
  for (const [gbif, motivo] of [
    ["G2", "espécie na lista de referência"],
    ["G8", "generalizada na fonte"],
    ["G9", "dataGeneralizations informado pela fonte"],
  ]) {
    test(`${gbif} (${motivo}): sem geometria, só município, sem link do registro`, () => {
      const p = publicas.get(gbif);
      assert.ok(p, `${gbif} deveria estar publicada`);
      assert.equal(p.celula, null);
      assert.equal(p.protecao, "municipio");
      assert.equal(p.url_origem, null);
      assert.match(p.municipio_codigo, /^\d{7}$/);
    });
  }

  test("a página de espécie indica a sensibilidade", async () => {
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select nome, sensivel from publico.especie order by nome");
    assert.deepEqual(rows, [
      { nome: "Sinteticus communis", sensivel: false },
      { nome: "Sinteticus rarus", sensivel: true },
    ]);
  });
});

describe("só publica o que foi aprovado e continua na fonte", () => {
  test("ficam de fora: sem revisão, rejeitado, revisão mais recente rejeitada, removido na fonte e rejeitado na carga", () => {
    for (const gbif of ["G4", "G5", "G11", "G6", "G7"]) assert.equal(publicas.has(gbif), false, gbif);
  });

  test("CC BY-NC aprovado em revisão humana aparece, com a licença", () => {
    assert.equal(publicas.get("G3").licenca_efetiva, "CC-BY-NC-4.0");
  });

  test("conjuntos publicados são exatamente os aprovados", async () => {
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select chave_externa from publico.conjunto_dados order by 1");
    assert.deepEqual(rows.map((r) => r.chave_externa), ["S1", "S2"]);
  });
});
