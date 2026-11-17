// Referência taxonômica (Fase 11.3).
// 1. Utilitários: normalização para busca, COPY e leitor de Darwin Core Archive (pacote SINTÉTICO gerado aqui).
// 2. Flora e Funga do Brasil REAL (v393.433), baixada por `npm run taxonomia:baixar`, conferida pelo SHA-256
//    do manifesto e carregada num banco em memória.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { strToU8, zipSync } from "fflate";
import { campoCopy } from "../../scripts/banco/copiar.mjs";
import { abrirDwca } from "../../scripts/ingestao/dwca.mjs";
import { CODIGO_FONTE, carregarFloraFunga, lerFloraFunga, MANIFESTO } from "../../scripts/ingestao/flora-funga.mjs";
import { lerManifesto } from "../../scripts/ingestao/manifesto.mjs";
import { normalizarBusca } from "../../scripts/ingestao/texto.mjs";
import { comoPapel, criarBanco } from "./apoio.mjs";

describe("utilitários de ingestão", () => {
  test("normalização para busca ignora acentos, caixa e espaços extras", () => {
    assert.equal(normalizarBusca("  JATOBÁ  "), "jatoba");
    assert.equal(normalizarBusca("Jatobá-do-Cerrado"), "jatoba-do-cerrado");
    assert.equal(normalizarBusca("Hymenaea   courbaril"), "hymenaea courbaril");
  });

  test("COPY escapa barra, tabulação, quebra de linha, nulo e arrays", () => {
    assert.equal(campoCopy(null), "\\N");
    assert.equal(campoCopy("a\tb\nc\\d"), "a\\tb\\nc\\\\d");
    assert.equal(campoCopy(['x "y"', "z\\w"]), '{"x \\\\"y\\\\"","z\\\\\\\\w"}');
  });

  test("COPY grava exatamente os valores enviados", async () => {
    const db = await criarBanco();
    try {
      const { copiar } = await import("../../scripts/banco/copiar.mjs");
      await db.exec("create temporary table t (a text, b text[])");
      const valores = [["tab\there", ['aspas "x"', "barra\\y", "vírgula, z"]], [null, []]];
      await copiar(db, "t", ["a", "b"], valores);
      const { rows } = await db.query("select a, b from t order by a nulls last");
      assert.deepEqual(rows, [{ a: "tab\there", b: ['aspas "x"', "barra\\y", "vírgula, z"] }, { a: null, b: [] }]);
    } finally {
      await db.close();
    }
  });

  test("leitor de DwC-A segue o meta.xml (núcleo e extensão)", () => {
    const meta = `<archive xmlns="http://rs.tdwg.org/dwc/text/">
      <core encoding="UTF-8" fieldsTerminatedBy="\\t" linesTerminatedBy="\\n" fieldsEnclosedBy="" ignoreHeaderLines="1" rowType="http://rs.tdwg.org/dwc/terms/Taxon">
        <files><location>taxon.txt</location></files><id index="0"/>
        <field index="1" term="http://rs.tdwg.org/dwc/terms/scientificName"/>
      </core>
      <extension encoding="UTF-8" fieldsTerminatedBy="\\t" linesTerminatedBy="\\n" fieldsEnclosedBy="" ignoreHeaderLines="1" rowType="http://rs.gbif.org/terms/1.0/VernacularName">
        <files><location>vern.txt</location></files><coreid index="0"/>
        <field index="1" term="http://rs.tdwg.org/dwc/terms/vernacularName"/>
      </extension></archive>`;
    const zip = zipSync({
      "meta.xml": strToU8(meta),
      "taxon.txt": strToU8("id\tscientificName\nS1\t[SINTÉTICO] Sinteticus communis\nS2\t\n"),
      "vern.txt": strToU8("id\tvernacularName\nS1\t[SINTÉTICO] árvore\n"),
    });
    const dwca = abrirDwca(zip);
    assert.deepEqual([...dwca.linhas(dwca.nucleo)], [{ id: "S1", scientificName: "[SINTÉTICO] Sinteticus communis" }, { id: "S2", scientificName: null }]);
    assert.deepEqual([...dwca.linhas(dwca.extensao("VernacularName"))], [{ id: "S1", vernacularName: "[SINTÉTICO] árvore" }]);
  });
});

describe("Flora e Funga do Brasil — Lista Oficial (real)", () => {
  let db;
  let relatorio;
  let dados;
  before(async () => {
    try {
      dados = await lerFloraFunga();
    } catch (erro) {
      throw new Error(`Flora e Funga indisponível ou divergente do manifesto. Rode \`npm run taxonomia:baixar\`.\n${erro.message}`);
    }
    db = await criarBanco();
    relatorio = await carregarFloraFunga(db, dados);
  });
  after(() => db?.close());

  test("manifesto: DOI, versão, licença CC BY 4.0 e SHA-256", async () => {
    const m = await lerManifesto(MANIFESTO);
    assert.equal(m.doi, "10.15468/1mtkaw");
    assert.equal(m.licenca, "CC-BY-4.0");
    assert.equal(m.versao, "v393.433");
    assert.match(m.arquivos[0].sha256, /^[0-9a-f]{64}$/);
  });

  test("todo nome recebido tem um nome tratado; nada é descartado", () => {
    assert.equal(relatorio.nomes_recebidos, dados.nomes.length);
    assert.equal(relatorio.nomes_tratados, relatorio.nomes_recebidos);
    assert.equal(relatorio.aceitos + relatorio.sinonimos + relatorio.outros, relatorio.nomes_tratados);
  });

  test("espécies são os nomes aceitos de rank espécie (plantas e fungos)", async () => {
    const esperado = dados.nomes.filter((t) => t.taxonRank === "ESPECIE" && t.taxonomicStatus === "NOME_ACEITO").length;
    assert.equal(relatorio.especies, esperado);
    assert.equal(relatorio.especies, relatorio.especies_plantae + relatorio.especies_fungi);
  });

  test("Hymenaea courbaril: espécie aceita, nome popular jatobá, nativa em MT", async () => {
    const especie = (await db.query("select id, taxon_id, reino, familia from protegido.especie where nome = 'Hymenaea courbaril'")).rows;
    assert.deepEqual(especie.map(({ taxon_id, reino, familia }) => ({ taxon_id, reino, familia })), [{ taxon_id: "22972", reino: "Plantae", familia: "Fabaceae" }]);
    const id = especie[0].id;
    const busca = await comoPapel(db, "bemtevi_leitura", `select tipo, texto from publico.busca where especie_id = ${id} and chave = '${normalizarBusca("JATOBÁ")}'`);
    assert.deepEqual(busca.rows, [{ tipo: "popular", texto: "jatobá" }]);
    const dist = await comoPapel(db, "bemtevi_leitura", `select location_id, origem from publico.distribuicao where especie_id = ${id}`);
    assert.deepEqual(dist.rows, [{ location_id: "BR-MT", origem: "Nativa" }]);
    const ficha = await comoPapel(db, "bemtevi_leitura", `select grupo, referencia, referencia_versao from publico.especie where id = ${id}`);
    assert.deepEqual(ficha.rows, [{ grupo: "flora", referencia: CODIGO_FONTE, referencia_versao: "v393.433" }]);
  });

  test("sinônimo leva à espécie do nome aceito (inclusive em cadeia)", async () => {
    const { rows } = await db.query(`
      select count(*)::int as total,
             count(*) filter (where s.especie_id is distinct from a.especie_id)::int as divergentes
      from protegido.nome_cientifico s join protegido.nome_cientifico a on a.id = s.nome_aceito_id
      where s.status = 'sinonimo'`);
    assert.ok(rows[0].total > 80000, `sinônimos: ${rows[0].total}`);
    assert.equal(rows[0].divergentes, 0);
    const stil = await db.query("select e.nome from protegido.nome_cientifico n join protegido.especie e on e.id = n.especie_id where n.nome_canonico = 'Hymenaea courbaril var. stilbocarpa'");
    assert.deepEqual(stil.rows, [{ nome: "Hymenaea courbaril" }]);
  });

  test("homônimos são preservados como espécies distintas, identificadas pelo taxonID", () => {
    assert.equal(relatorio.homonimos, 7);
  });

  test("distribuição carregada só para MT; perfil só para espécies aceitas", async () => {
    const { rows } = await db.query("select array_agg(distinct location_id) as ufs from protegido.distribuicao_recebida");
    assert.deepEqual(rows[0].ufs, ["BR-MT"]);
    assert.ok(relatorio.distribuicoes_mt > 7000);
    const perfisOrfaos = await db.query(`select count(*)::int as n from protegido.perfil_recebido p
      where not exists (select 1 from protegido.especie e where e.taxon_id = p.taxon_id and e.lote_id = p.lote_id)`);
    assert.equal(perfisOrfaos.rows[0].n, 0);
  });

  test("lote registra DOI, citação, versão, arquivo com SHA-256 e situação ok", async () => {
    const m = await lerManifesto(MANIFESTO);
    const lote = (await db.query("select * from protegido.lote where id = $1", [relatorio.lote])).rows[0];
    assert.equal(lote.situacao, "ok");
    assert.equal(lote.doi, "10.15468/1mtkaw");
    assert.equal(lote.versao_fonte, "v393.433");
    assert.match(lote.citacao, /doi:10\.15468\/1mtkaw/);
    const arq = await db.query("select sha256 from protegido.arquivo_original where lote_id = $1", [relatorio.lote]);
    assert.deepEqual(arq.rows, [{ sha256: m.arquivos[0].sha256 }]);
  });
});
