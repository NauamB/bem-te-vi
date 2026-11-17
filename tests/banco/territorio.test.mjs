// Referência territorial (Fase 11.2).
// 1. Leitor de shapefile: arquivos SINTÉTICOS gerados aqui mesmo, só para testar o formato.
// 2. Malha oficial do IBGE (edição 2025, MT): os arquivos REAIS baixados por `npm run territorio:baixar`,
//    conferidos pelo SHA-256 do manifesto, carregados num banco em memória e validados.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { lerDbf, lerShp } from "../../scripts/ingestao/shapefile.mjs";
import { CODIGO_FONTE, carregarMalha, lerMalha, lerManifesto, UF_ESPERADA } from "../../scripts/ingestao/ibge-malha.mjs";
import { comoPapel, criarBanco, criarBancoEmSessaoNova } from "./apoio.mjs";

// --- Gerador mínimo de shapefile/dBASE sintético (apenas para os testes do leitor) ---
function shpSintetico(registros) {
  const conteudos = registros.map((aneis) => {
    if (!aneis) return Buffer.from(new Int32Array([0]).buffer);
    const pontos = aneis.flat();
    const b = Buffer.alloc(44 + aneis.length * 4 + pontos.length * 16);
    b.writeInt32LE(5, 0);
    b.writeInt32LE(aneis.length, 36);
    b.writeInt32LE(pontos.length, 40);
    let inicio = 0;
    aneis.forEach((anel, i) => {
      b.writeInt32LE(inicio, 44 + i * 4);
      inicio += anel.length;
    });
    pontos.forEach(([x, y], i) => {
      b.writeDoubleLE(x, 44 + aneis.length * 4 + i * 16);
      b.writeDoubleLE(y, 44 + aneis.length * 4 + i * 16 + 8);
    });
    return b;
  });
  const total = 100 + conteudos.reduce((s, c) => s + 8 + c.length, 0);
  const b = Buffer.alloc(total);
  b.writeInt32BE(9994, 0);
  b.writeInt32BE(total / 2, 24);
  b.writeInt32LE(1000, 28);
  b.writeInt32LE(5, 32);
  let pos = 100;
  conteudos.forEach((c, i) => {
    b.writeInt32BE(i + 1, pos);
    b.writeInt32BE(c.length / 2, pos + 4);
    c.copy(b, pos + 8);
    pos += 8 + c.length;
  });
  return new Uint8Array(b);
}

function dbfSintetico(campos, linhas) {
  const tamRegistro = 1 + campos.reduce((s, c) => s + c.tamanho, 0);
  const tamCabecalho = 32 + campos.length * 32 + 1;
  const b = Buffer.alloc(tamCabecalho + linhas.length * tamRegistro + 1, 0x20);
  b.fill(0, 0, tamCabecalho);
  b[0] = 3;
  b.writeUInt32LE(linhas.length, 4);
  b.writeUInt16LE(tamCabecalho, 8);
  b.writeUInt16LE(tamRegistro, 10);
  campos.forEach((c, i) => {
    b.write(c.nome, 32 + i * 32, "ascii");
    b[32 + i * 32 + 11] = c.tipo.charCodeAt(0);
    b[32 + i * 32 + 16] = c.tamanho;
  });
  b[tamCabecalho - 1] = 0x0d;
  linhas.forEach((linha, r) => {
    let pos = tamCabecalho + r * tamRegistro;
    b[pos] = linha.apagado ? 0x2a : 0x20;
    pos += 1;
    campos.forEach((c) => {
      const valor = Buffer.from(String(linha[c.nome] ?? ""), "utf8");
      valor.copy(b, pos, 0, c.tamanho);
      pos += c.tamanho;
    });
  });
  b[b.length - 1] = 0x1a;
  return new Uint8Array(b);
}

describe("leitor de shapefile (arquivos sintéticos)", () => {
  const quadrado = (x, y, l) => [[x, y], [x, y + l], [x + l, y + l], [x + l, y], [x, y]];

  test("lê polígono com furo, polígono com duas partes e geometria nula", () => {
    const furo = quadrado(0.25, 0.25, 0.5).reverse();
    const formas = lerShp(shpSintetico([[quadrado(0, 0, 1), furo], [quadrado(2, 0, 1), quadrado(4, 0, 1)], null]));
    assert.equal(formas.length, 3);
    assert.equal(formas[0].aneis.length, 2);
    assert.deepEqual(formas[0].aneis[1][0], [0.25, 0.25].map((v, i) => furo[0][i]));
    assert.equal(formas[1].aneis.length, 2);
    assert.equal(formas[2].aneis, null);
  });

  test("monta furos e partes no PostGIS sem alterar a área", async () => {
    const db = await criarBanco();
    try {
      const furo = quadrado(0.25, 0.25, 0.5).reverse();
      const [comFuro, duasPartes] = lerShp(shpSintetico([[quadrado(0, 0, 1), furo], [quadrado(2, 0, 1), quadrado(4, 0, 1)]]));
      const sql = "select st_area(g) as area, st_numgeometries(g) as partes, st_isvalid(g) as valida from (select st_multi(st_buildarea(st_setsrid(st_geomfromgeojson($1), 4674))) as g) s";
      const a = (await db.query(sql, [JSON.stringify({ type: "MultiLineString", coordinates: comFuro.aneis })])).rows[0];
      assert.deepEqual(a, { area: 0.75, partes: 1, valida: true });
      const b = (await db.query(sql, [JSON.stringify({ type: "MultiLineString", coordinates: duasPartes.aneis })])).rows[0];
      assert.deepEqual(b, { area: 2, partes: 2, valida: true });
    } finally {
      await db.close();
    }
  });

  test("lê dBASE em UTF-8, números e registros apagados", () => {
    const campos = [{ nome: "CD_MUN", tipo: "C", tamanho: 7 }, { nome: "NM_MUN", tipo: "C", tamanho: 40 }, { nome: "AREA_KM2", tipo: "N", tamanho: 12 }];
    const { registros } = lerDbf(dbfSintetico(campos, [
      { CD_MUN: "9900001", NM_MUN: "[SINTÉTICO] São Ação D'Oeste", AREA_KM2: "123.456" },
      { CD_MUN: "9900002", NM_MUN: "[SINTÉTICO] B", AREA_KM2: "", apagado: true },
    ]));
    assert.deepEqual(registros[0], { apagado: false, valores: { CD_MUN: "9900001", NM_MUN: "[SINTÉTICO] São Ação D'Oeste", AREA_KM2: 123.456 } });
    assert.equal(registros[1].apagado, true);
    assert.equal(registros[1].valores.AREA_KM2, null);
  });

  test("recusa arquivo que não é shapefile", () => {
    assert.throws(() => lerShp(new Uint8Array(100)), /inválido/);
  });
});

describe("malha municipal oficial do IBGE (edição 2025, Mato Grosso)", () => {
  let db;
  let relatorio;
  let malha;
  before(async () => {
    try {
      malha = await lerMalha();
    } catch (erro) {
      throw new Error(`malha oficial indisponível ou divergente do manifesto. Rode \`npm run territorio:baixar\`.\n${erro.message}`);
    }
    db = await criarBanco();
    relatorio = await carregarMalha(db, malha);
  });
  after(() => db?.close());

  test("manifesto: arquivos oficiais, SHA-256 registrado e condições de uso explícitas", async () => {
    const m = await lerManifesto();
    assert.equal(m.edicao, "2025");
    for (const a of m.arquivos) {
      assert.match(a.url, /^https:\/\/geoftp\.ibge\.gov\.br\/organizacao_do_territorio\/malhas_territoriais\/malhas_municipais\/municipio_2025\/UFs\/MT\//);
      assert.match(a.sha256, /^[0-9a-f]{64}$/);
    }
    assert.match(m.condicoes_de_uso.resumo, /Nota Metodológica/);
  });

  test("142 municípios, todos de MT, com códigos IBGE de 7 dígitos e únicos", async () => {
    assert.equal(relatorio.municipios, UF_ESPERADA.municipios);
    const { rows } = await db.query("select count(*)::int as n, count(distinct codigo_ibge)::int as distintos, bool_and(codigo_ibge ~ '^51[0-9]{5}$') as codigos, bool_and(uf_codigo = '51') as uf, bool_and(length(trim(nome)) > 0) as nomes from protegido.municipio");
    assert.deepEqual(rows[0], { n: 142, distintos: 142, codigos: true, uf: true, nomes: true });
  });

  test("nomes preservados como no arquivo oficial (UTF-8)", async () => {
    const oficiais = new Map(malha.municipios.map((m) => [m.CD_MUN, m.NM_MUN]));
    const { rows } = await db.query("select codigo_ibge, nome from protegido.municipio");
    for (const r of rows) assert.equal(r.nome, oficiais.get(r.codigo_ibge), r.codigo_ibge);
    assert.ok(rows.some((r) => /[áéíóúãõâêôç]/i.test(r.nome)), "há nomes acentuados decodificados");
  });

  test("geometrias válidas, multipolígonos e em SIRGAS 2000 (EPSG:4674)", async () => {
    const { rows } = await db.query("select bool_and(st_isvalid(geom)) as validas, bool_and(geometrytype(geom) = 'MULTIPOLYGON') as tipo, array_agg(distinct st_srid(geom)) as srids from protegido.municipio");
    assert.deepEqual(rows[0], { validas: true, tipo: true, srids: [4674] });
  });

  test("área de cada município confere com AREA_KM2 do IBGE (tolerância 0,5%)", () => {
    assert.ok(relatorio.maior_diferenca_area_pct < 0.5, `maior diferença: ${relatorio.maior_diferenca_area_pct}%`);
  });

  test("municípios cobrem a UF sem lacunas nem sobreposições", () => {
    assert.ok(Math.abs(relatorio.sobreposicao_km2) < 1, `sobreposição: ${relatorio.sobreposicao_km2} km²`);
    assert.ok(Math.abs(relatorio.lacuna_km2) < 1, `lacuna: ${relatorio.lacuna_km2} km²`);
    assert.equal(relatorio.municipios_fora_da_uf, 0);
    const oficial = malha.uf.AREA_KM2;
    assert.ok(Math.abs(relatorio.area_uf_km2 - oficial) / oficial < 0.005, `UF: ${relatorio.area_uf_km2} × ${oficial}`);
  });

  test("lote registra fonte, edição, arquivos com SHA-256 e situação ok", async () => {
    const manifesto = await lerManifesto();
    const lote = (await db.query("select * from protegido.lote where id = $1", [relatorio.lote])).rows[0];
    assert.equal(lote.fonte_codigo, CODIGO_FONTE);
    assert.equal(lote.situacao, "ok");
    assert.equal(lote.versao_fonte, "2025");
    assert.equal(lote.recebidos, 142);
    assert.equal(lote.relatorio.validacao.municipios, 142);
    const arquivos = (await db.query("select caminho, sha256, tamanho_bytes::int as tamanho from protegido.arquivo_original where lote_id = $1 order by caminho", [relatorio.lote])).rows;
    assert.deepEqual(
      arquivos,
      manifesto.arquivos.map((a) => ({ caminho: a.url, sha256: a.sha256, tamanho: a.tamanho_bytes })).sort((x, y) => x.caminho.localeCompare(y.caminho)),
    );
  });

  test("camada pública expõe os 142 municípios ao papel do site", async () => {
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select count(*)::int as n, bool_and(uf = 'MT') as uf, bool_and(edicao_malha = '2025') as edicao from publico.municipio");
    assert.deepEqual(rows[0], { n: 142, uf: true, edicao: true });
  });
});

// Fase 11.4.4D: o carregador não pode depender do search_path deixado pelas migrações na mesma sessão.
describe("malha municipal oficial do IBGE carregada numa sessão nova", () => {
  let db;
  before(async () => {
    db = await criarBancoEmSessaoNova();
  });
  after(() => db?.close());

  test("sessão nova sem o PostGIS no caminho de busca; a carga resolve as funções espaciais e valida tudo", async () => {
    assert.doesNotMatch((await db.query("show search_path")).rows[0].search_path, /extensions/);
    const relatorio = await carregarMalha(db, await lerMalha());
    const { rows } = await db.query(`select count(*)::int as n, bool_and(extensions.st_isvalid(geom)) as validas,
      bool_and(extensions.st_srid(geom) = 4674) as sirgas from protegido.municipio where lote_id = $1`, [relatorio.lote]);
    assert.deepEqual(rows[0], { n: 142, validas: true, sirgas: true });
    assert.doesNotMatch((await db.query("show search_path")).rows[0].search_path, /extensions/, "o ajuste não vaza para a sessão");
  });
});
