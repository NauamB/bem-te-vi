// API pública v1 (Fase 11.5.1), testada pelas mesmas funções que os route handlers chamam (lib/api/v1.ts), sobre
// os dados SINTÉTICOS de tests/banco/fixtures/sinteticos.sql. Cada consulta roda como bemtevi_leitura, numa
// transação READ ONLY, como em produção. Nenhum dado real, nenhuma rede.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import * as v1 from "../../lib/api/v1.ts";
import { ErroBancoIndisponivel } from "../../lib/banco/tipos.ts";
import { criarBanco } from "./apoio.mjs";

let db;
let conjunto; // chave_externa → id
const sqlExecutado = [];
const consultar = async (texto, parametros = []) => {
  sqlExecutado.push(texto);
  await db.exec("begin read only; set local role bemtevi_leitura");
  try {
    return (await db.query(texto, parametros)).rows;
  } finally {
    await db.exec("rollback");
  }
};
const u = (s = "") => new URLSearchParams(s);
const corpos = [];
async function obter(resposta, status = 200) {
  const texto = await resposta.text();
  assert.equal(resposta.status, status, texto);
  assert.equal(resposta.headers.get("content-type"), "application/json; charset=utf-8");
  corpos.push(texto);
  return JSON.parse(texto);
}
const todas = async (rota, consulta, chave) => {
  const vistos = [];
  let apos = null;
  for (let i = 0; i < 20; i++) {
    const c = await obter(await rota(u(`${consulta}${apos ? `&apos=${apos}` : ""}`), consultar));
    vistos.push(...c.dados[chave]);
    apos = c.paginacao.proximo;
    if (!apos) return vistos;
  }
  throw new Error("paginação não terminou");
};

before(async () => {
  db = await criarBanco({ sinteticos: true });
  conjunto = Object.fromEntries((await db.query("select chave_externa, id from protegido.conjunto_dados")).rows.map((r) => [r.chave_externa, r.id]));
});
after(() => db?.close());

describe("API v1 — respostas e metadados", () => {
  const rotas = {
    especies: () => v1.rotaEspecies(u("q=sint"), consultar),
    especie: () => v1.rotaEspecie("1", u(), consultar),
    ocorrencias: () => v1.rotaOcorrencias(u(), consultar),
    celulas: () => v1.rotaCelulas(u(), consultar),
    municipios: () => v1.rotaMunicipios(u(), consultar),
    malha: () => v1.rotaMalha(u(), consultar),
    indicadores: () => v1.rotaIndicadores(u(), consultar),
    fontes: () => v1.rotaFontes(u(), consultar),
  };
  for (const [nome, chamar] of Object.entries(rotas)) {
    test(`${nome}: 200, cache público e metadados de natureza, fonte e licença`, async () => {
      const r = await chamar();
      assert.match(r.headers.get("cache-control"), /^public, s-maxage=\d+/);
      const c = await obter(r);
      const m = c.metadados;
      assert.ok(m.natureza.length > 0 && m.natureza.every((n) => ["original", "normalizado", "derivado"].includes(n)), nome);
      assert.ok(m.descricao && m.aviso && !Number.isNaN(Date.parse(m.gerado_em)), nome);
      assert.ok(Array.isArray(m.fontes) && Array.isArray(m.licencas), nome);
    });
  }

  test("ocorrências citam os conjuntos e as licenças efetivas da página", async () => {
    const c = await obter(await v1.rotaOcorrencias(u(), consultar));
    assert.deepEqual(c.metadados.licencas, ["CC-BY-4.0", "CC-BY-NC-4.0"]);
    assert.deepEqual(c.metadados.fontes.filter((f) => f.tipo === "conjunto-de-dados").map((f) => f.titulo).sort(), ["[SINTÉTICO] Conjunto 1", "[SINTÉTICO] Conjunto 2"]);
  });
});

describe("API v1 — só conjuntos aprovados, nunca coordenada precisa", () => {
  test("ocorrências: só S1 e S2 (aprovados); sem pendente, rejeitado, removido na fonte ou rejeitado na carga", async () => {
    const todasOcorrencias = await todas(v1.rotaOcorrencias, "limite=2", "ocorrencias");
    assert.equal(todasOcorrencias.length, 6, "G1, G2, G3, G8, G9 e G10");
    assert.deepEqual([...new Set(todasOcorrencias.map((o) => o.conjunto.id))].sort(), [conjunto.S1, conjunto.S2].sort());
    for (const chave of ["S3", "S4", "S5"]) {
      const c = await obter(await v1.rotaOcorrencias(u(`conjunto=${conjunto[chave]}`), consultar));
      assert.equal(c.dados.ocorrencias.length, 0, chave);
    }
    const f = await obter(await v1.rotaFontes(u(), consultar));
    assert.deepEqual(f.dados.conjuntos.map((x) => x.chave_externa).sort(), ["S1", "S2"]);
  });

  test("sensíveis e generalizados na fonte: só município, sem célula, data ou link", async () => {
    const lista = await todas(v1.rotaOcorrencias, "limite=100", "ocorrencias");
    const protegidas = lista.filter((o) => o.protecao === "municipio");
    assert.equal(protegidas.length, 3, "G2 (espécie sensível), G8 e G9 (generalizados na fonte)");
    for (const o of protegidas) assert.deepEqual([o.celula, o.data_evento, o.url_origem], [null, null, null]);
    const rarus = await obter(await v1.rotaOcorrencias(u("especie=2"), consultar));
    assert.deepEqual(rarus.dados.ocorrencias.map((o) => o.protecao), ["municipio"]);
  });

  test("células: só registros não sensíveis, cantos múltiplos de 0,1 e lado 0,1", async () => {
    const c = await obter(await v1.rotaCelulas(u(), consultar));
    assert.equal(c.dados.features.reduce((s, f) => s + f.properties.registros, 0), 3);
    assert.equal(c.dados.registros_so_por_municipio, 3);
    for (const f of c.dados.features) {
      const anel = f.geometry.coordinates[0];
      for (const [x, y] of anel) for (const v of [x, y]) assert.ok(Math.abs(v * 10 - Math.round(v * 10)) < 1e-9, `${v} não é múltiplo de 0,1`);
      assert.ok(Math.abs(anel[1][0] - anel[0][0] - 0.1) < 1e-9 && Math.abs(anel[2][1] - anel[1][1] - 0.1) < 1e-9);
    }
    const rarus = await obter(await v1.rotaCelulas(u("especie=2"), consultar));
    assert.deepEqual([rarus.dados.features.length, rarus.dados.registros_so_por_municipio], [0, 1]);
  });

  test("municípios contam todos os registros, inclusive os sensíveis", async () => {
    const c = await obter(await v1.rotaMunicipios(u(), consultar));
    assert.deepEqual(c.dados.municipios.map((m) => [m.codigo, m.registros, m.registros_so_por_municipio]), [["9900001", 2, 0], ["9900002", 3, 3]]);
    assert.equal(c.dados.registros_sem_municipio, 1, "G10 fica fora dos municípios sintéticos");
  });

  test("nenhuma resposta contém coordenada precisa, localidade ou campo de coordenada", () => {
    const texto = corpos.join("\n");
    for (const c of ["0.456", "0.123", "0.567", "1.234", "0.111", "0.987", "0.818", "1.919", "0.313", "1.414", "0.0577", "0.0399"]) {
      assert.ok(!texto.includes(c), `coordenada ${c} vazou`);
    }
    assert.doesNotMatch(texto, /localidade precisa|"(lat|lon|lng|latitude|longitude|decimal_latitude|decimal_longitude|verbatim_locality|geom)"/i);
  });

  test("toda consulta da API lê só views de publico (nunca protegido)", () => {
    assert.ok(sqlExecutado.length > 20);
    for (const s of sqlExecutado) {
      assert.doesNotMatch(s, /protegido\./, s);
      assert.match(s, /publico\./, s);
      assert.doesNotMatch(s, /\b(insert|update|delete|copy|create|alter|drop|grant|set\s+role)\b/i, s);
    }
  });
});

describe("API v1 — busca, perfil, paginação e filtros", () => {
  test("busca por prefixo em nome científico, sinônimo e nome popular (sem acento nem caixa)", async () => {
    const c = await obter(await v1.rotaEspecies(u("q=SINTETICUS"), consultar));
    assert.deepEqual(c.dados.especies.map((e) => e.nome), ["Sinteticus communis", "Sinteticus rarus"]);
    const sinonimo = await obter(await v1.rotaEspecies(u("q=sinteticus vet"), consultar));
    assert.deepEqual(sinonimo.dados.especies.map((e) => [e.nome, e.tipo_encontrado, e.nome_encontrado]), [["Sinteticus communis", "sinonimo", "Sinteticus vetus"]]);
    const popular = await obter(await v1.rotaEspecies(u("q=[SINTÉTICO] Árvore"), consultar));
    assert.deepEqual(popular.dados.especies.map((e) => [e.nome, e.tipo_encontrado]), [["Sinteticus communis", "popular"]]);
    const curinga = await obter(await v1.rotaEspecies(u("q=sin%25"), consultar));
    assert.equal(curinga.dados.especies.length, 0, "% é literal, não curinga");
  });

  test("busca paginada por cursor, sem repetição", async () => {
    const pagina1 = await obter(await v1.rotaEspecies(u("q=sint&limite=1"), consultar));
    assert.equal(pagina1.dados.especies.length, 1);
    assert.ok(pagina1.paginacao.proximo);
    const pagina2 = await obter(await v1.rotaEspecies(u(`q=sint&limite=1&apos=${pagina1.paginacao.proximo}`), consultar));
    assert.deepEqual([pagina1.dados.especies[0].nome, pagina2.dados.especies[0].nome], ["Sinteticus communis", "Sinteticus rarus"]);
    assert.equal(pagina2.paginacao.proximo, null);
  });

  test("perfil: nomes, distribuição, perfil, referência e aviso de espécie sensível", async () => {
    const c = await obter(await v1.rotaEspecie("1", u(), consultar));
    assert.deepEqual(c.dados.especie.nomes_cientificos.map((n) => [n.nome, n.status]), [["Sinteticus communis", "aceito"], ["Sinteticus vetus", "sinonimo"]]);
    assert.equal(c.dados.especie.nomes_populares[0].nome, "[SINTÉTICO] árvore-de-teste");
    assert.equal(c.dados.especie.distribuicao[0].local, "BR-ZZ");
    assert.deepEqual(c.dados.especie.perfil.formas_de_vida, ["[SINTÉTICO] Forma"]);
    assert.equal(c.dados.referencia.codigo, "teste-sintetico-taxonomia");
    const rarus = await obter(await v1.rotaEspecie("2", u(), consultar));
    assert.equal(rarus.dados.especie.sensivel, true);
    assert.match(rarus.metadados.aviso, /Espécie sensível/);
  });

  test("ocorrências: filtros por espécie, município, conjunto, grupo e ano", async () => {
    const n = async (q) => (await obter(await v1.rotaOcorrencias(u(q), consultar))).dados.ocorrencias.length;
    assert.equal(await n("especie=1"), 4);
    assert.equal(await n("municipio=9900002"), 3);
    assert.equal(await n(`conjunto=${conjunto.S2}`), 1);
    assert.equal(await n("grupo=outros"), 6);
    assert.equal(await n("grupo=fauna"), 0);
    assert.equal(await n("ano_de=2020&ano_ate=2020"), 6);
    assert.equal(await n("ano_de=2021"), 0);
  });

  test("malha municipal: GeoJSON simplificado, sem crs, com a fonte territorial", async () => {
    const c = await obter(await v1.rotaMalha(u(), consultar));
    assert.deepEqual(c.dados.features.map((f) => [f.id, f.geometry.type]), [["9900001", "Polygon"], ["9900002", "Polygon"]]);
    assert.ok(!("crs" in c.dados.features[0].geometry));
    assert.equal(c.metadados.fontes[0].titulo, "[SINTÉTICO] Território de teste");
  });

  test("indicadores", async () => {
    const c = await obter(await v1.rotaIndicadores(u(), consultar));
    assert.deepEqual(
      [c.dados.registros, c.dados.especies, c.dados.conjuntos, c.dados.registros_so_por_municipio, c.dados.por_licenca],
      [6, 2, 2, 3, [{ licenca: "CC-BY-4.0", registros: 5 }, { licenca: "CC-BY-NC-4.0", registros: 1 }]],
    );
  });
});

describe("API v1 — parâmetros inválidos e falhas", () => {
  const invalidos = [
    ["parâmetro desconhecido", () => v1.rotaOcorrencias(u("x=1"), consultar), "x"],
    ["parâmetro repetido", () => v1.rotaOcorrencias(u("grupo=flora&grupo=fauna"), consultar), "grupo"],
    ["limite zero", () => v1.rotaOcorrencias(u("limite=0"), consultar), "limite"],
    ["limite acima do máximo", () => v1.rotaOcorrencias(u("limite=101"), consultar), "limite"],
    ["limite não numérico", () => v1.rotaEspecies(u("q=sint&limite=abc"), consultar), "limite"],
    ["termo curto", () => v1.rotaEspecies(u("q=si"), consultar), "q"],
    ["termo ausente", () => v1.rotaEspecies(u(), consultar), "q"],
    ["espécie negativa", () => v1.rotaOcorrencias(u("especie=-1"), consultar), "especie"],
    ["município fora do formato", () => v1.rotaMunicipios(u("municipio=51"), consultar), "municipio"],
    ["grupo desconhecido", () => v1.rotaCelulas(u("grupo=plantas"), consultar), "grupo"],
    ["ano invertido", () => v1.rotaOcorrencias(u("ano_de=2020&ano_ate=2010"), consultar), "ano_de"],
    ["cursor adulterado", () => v1.rotaOcorrencias(u("apos=abc"), consultar), "apos"],
    ["cursor de busca adulterado", () => v1.rotaEspecies(u(`q=sint&apos=${Buffer.from('["x",-1]').toString("base64url")}`), consultar), "apos"],
    ["id não numérico", () => v1.rotaEspecie("abc", u(), consultar), "id"],
    ["id zero", () => v1.rotaEspecie("0", u(), consultar), "id"],
    ["parâmetro em rota sem parâmetros", () => v1.rotaIndicadores(u("a=1"), consultar), "a"],
  ];
  for (const [nome, chamar, parametro] of invalidos) {
    test(`400: ${nome}`, async () => {
      const r = await chamar();
      assert.equal(r.headers.get("cache-control"), "no-store");
      const c = await obter(r, 400);
      assert.deepEqual([c.erro.codigo, c.erro.parametro], ["parametro_invalido", parametro]);
    });
  }

  test("404: espécie inexistente", async () => {
    const c = await obter(await v1.rotaEspecie("999999", u(), consultar), 404);
    assert.equal(c.erro.codigo, "nao_encontrado");
  });

  test("400 antes de consultar o banco", async () => {
    let chamadas = 0;
    await v1.rotaOcorrencias(u("limite=0"), async () => (chamadas++, []));
    assert.equal(chamadas, 0);
  });

  test("503 com banco indisponível; 500 genérico sem detalhes internos", async () => {
    const indisponivel = await obter(await v1.rotaIndicadores(u(), async () => { throw new ErroBancoIndisponivel("sem conexão"); }), 503);
    assert.equal(indisponivel.erro.codigo, "banco_indisponivel");
    const original = console.error;
    console.error = () => {};
    try {
      const r = await v1.rotaIndicadores(u(), async () => { throw new Error('relation "protegido.segredo" does not exist'); });
      const texto = await r.text();
      assert.equal(r.status, 500);
      assert.doesNotMatch(texto, /protegido|relation|segredo/);
    } finally {
      console.error = original;
    }
  });
});
