// Conector de ocorrências do GBIF (Fase 11.3) com um download Darwin Core Archive SINTÉTICO gerado aqui.
// Território e referência taxonômica também são os sintéticos de tests/banco/fixtures/sinteticos.sql
// (UF "99" em [0,2]×[0,1]; "Sinteticus communis", sinônimo "Sinteticus vetus"). Nenhum dado real.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import {
  carregarDownload, classificarConjuntos, decidirRevisao, licencaDe, licencaEfetiva, licencaMaisRestritiva, lerEml, motivosContraAprovacaoHumana,
} from "../../scripts/ingestao/gbif.mjs";
import { comoPapel, criarBanco, criarBancoEmSessaoNova, erroDe } from "./apoio.mjs";
import { BY, BYNC, dwcaSintetico, REGISTROS } from "./dwca-sintetico.mjs";

describe("licenças", () => {
  test("reconhece CC0, CC BY e CC BY-NC (URL ou código) e recusa as demais", () => {
    assert.equal(licencaDe("http://creativecommons.org/publicdomain/zero/1.0/legalcode"), "CC0-1.0");
    assert.equal(licencaDe(BY), "CC-BY-4.0");
    assert.equal(licencaDe("CC_BY_NC_4_0"), "CC-BY-NC-4.0");
    assert.equal(licencaDe("http://creativecommons.org/licenses/by-sa/4.0/"), "outra");
    assert.equal(licencaDe(""), "ausente");
  });

  test("licença efetiva é a mais restritiva entre registro e conjunto", () => {
    assert.equal(licencaEfetiva(BY, "CC-BY-NC-4.0"), "CC-BY-NC-4.0");
    assert.equal(licencaEfetiva(BYNC, "CC-BY-4.0"), "CC-BY-NC-4.0");
    assert.equal(licencaEfetiva("http://creativecommons.org/publicdomain/zero/1.0/", "CC-BY-4.0"), "CC-BY-4.0");
    assert.equal(licencaEfetiva(BY, "outra"), null);
  });

  test("lê título, publicador e licença do EML do conjunto", () => {
    const e = lerEml(`<eml><dataset><title>T</title><creator><organizationName>Org</organizationName></creator><intellectualRights><para><ulink url="${BYNC}"/></para></intellectualRights></dataset></eml>`);
    assert.deepEqual({ titulo: e.titulo, publicador: e.publicador, licenca: e.licenca }, { titulo: "T", publicador: "Org", licenca: "CC-BY-NC-4.0" });
  });
});

describe("download corrompido (sintético)", () => {
  test("gbifID repetido recusa a carga inteira, sem criar lote", async () => {
    const db = await criarBanco({ sinteticos: true });
    try {
      const repetido = [REGISTROS[0], REGISTROS[0]];
      await assert.rejects(
        carregarDownload(db, { zip: dwcaSintetico(repetido), download: { chave: "x" }, loteDef: { descricao: "x", predicado: {} }, fonteFlora: "teste-sintetico-taxonomia", ufCodigo: "99" }),
        /gbifID P1 repetido/,
      );
      const { rows } = await db.query("select count(*)::int as n from protegido.lote where fonte_codigo = 'gbif'");
      assert.equal(rows[0].n, 0);
    } finally {
      await db.close();
    }
  });
});

describe("carga de download do GBIF (sintético)", () => {
  let db;
  let rel;
  before(async () => {
    db = await criarBanco({ sinteticos: true });
    rel = await carregarDownload(db, {
      zip: dwcaSintetico(),
      download: { chave: "0000000-000000000000000", doi: "10.15468/dl.sintetico", citacao: "[SINTÉTICO] citação", link: "https://teste.invalid/download.zip",
        tamanho_bytes: 100, sha256: "b".repeat(64), solicitado_em: "2026-11-16T00:00:00Z", baixado_em: "2026-11-16T01:00:00Z" },
      loteDef: { descricao: "[SINTÉTICO] lote de teste", predicado: { type: "equals", key: "TESTE", value: "1" } },
      fonteFlora: "teste-sintetico-taxonomia",
      ufCodigo: "99",
    });
  });
  after(() => db?.close());

  test("contagens: recebidos = aceitos + rejeitados, com motivo para cada rejeição", () => {
    assert.equal(rel.recebidos, 11);
    assert.equal(rel.aceitos, 7);
    assert.equal(rel.rejeitados, 4);
    assert.deepEqual(Object.keys(rel.rejeicoes_por_motivo).sort(), [
      "ano inválido ou futuro", "coordenada (0, 0)", "fora dos limites da UF 99 (malha municipal carregada)",
      "licença não admitida (registro: outra, conjunto: CC-BY-4.0)",
    ]);
  });

  test("todo registro recebido fica preservado no original, inclusive os rejeitados", async () => {
    const { rows } = await db.query("select count(*)::int as n, count(motivo_rejeicao)::int as rejeitados from protegido.ocorrencia_recebida where lote_id = $1", [rel.lote]);
    assert.deepEqual(rows[0], { n: 11, rejeitados: 4 });
  });

  test("plantas: conciliação pela referência (canônico do GBIF e sinônimo verbatim) ou 'não conciliado'", async () => {
    const { rows } = await db.query(`select o.id_externo, o.conciliacao, e.nome as especie from protegido.ocorrencia o
      left join protegido.nome_cientifico n on n.id = o.nome_cientifico_id left join protegido.especie e on e.id = n.especie_id
      where o.lote_id = $1 and o.reino_recebido = 'Plantae' order by 1`, [rel.lote]);
    assert.deepEqual(rows, [
      { id_externo: "P1", conciliacao: "conciliado", especie: "Sinteticus communis" },
      { id_externo: "P2", conciliacao: "conciliado", especie: "Sinteticus communis" },
      { id_externo: "P3", conciliacao: "nao_conciliado", especie: null },
      { id_externo: "X1", conciliacao: "conciliado", especie: "Sinteticus communis" },
    ]);
  });

  test("fauna: espécie criada pela referência provisória do GBIF, com aviso público", async () => {
    assert.equal(rel.especies_gbif_criadas, 2);
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select nome, grupo, referencia, referencia_nota from publico.especie where referencia = 'gbif-taxonomia' order by nome");
    assert.deepEqual(rows.map((r) => [r.nome, r.grupo, r.referencia]), [["Animalis ameacadus", "fauna", "gbif-taxonomia"], ["Animalis sinteticus", "fauna", "gbif-taxonomia"]]);
    assert.match(rows[0].referencia_nota, /não é o catálogo taxonômico oficial brasileiro/i);
    const a3 = await db.query("select conciliacao from protegido.ocorrencia where id_externo = 'A3'");
    assert.equal(a3.rows[0].conciliacao, "nao_conciliado");
  });

  test("categoria IUCN EN (informada pelo GBIF) protege a espécie: só município, sem célula", async () => {
    assert.equal(rel.especies_sensiveis_iucn, 1);
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select protecao, celula, url_origem, data_evento, municipio_codigo from publico.ocorrencia where especie = 'Animalis ameacadus'");
    assert.deepEqual(rows, [{ protecao: "municipio", celula: null, url_origem: null, data_evento: null, municipio_codigo: "9900001" }]);
  });

  test("conjuntos: CC BY sem termos extras aprovado automaticamente; CC BY-NC e termos extras aguardam revisão humana", async () => {
    const { rows } = await db.query(`select c.chave_externa, rv.decisao, rv.tipo from protegido.conjunto_dados c
      left join protegido.revisao_vigente rv on rv.conjunto_id = c.id where c.fonte_codigo = 'gbif' order by 1`);
    assert.deepEqual(rows, [
      { chave_externa: "D1", decisao: "aprovado", tipo: "automatica" },
      { chave_externa: "D2", decisao: null, tipo: null },
      { chave_externa: "D3", decisao: null, tipo: null },
      { chave_externa: "D4", decisao: null, tipo: null },
    ]);
    const publicas = (await comoPapel(db, "bemtevi_leitura", "select count(*)::int as n from publico.ocorrencia where lote_id = " + rel.lote)).rows[0].n;
    assert.equal(publicas, 5, "só as 5 ocorrências aceitas do conjunto D1 aparecem");
  });

  test("após revisão humana registrada, o conjunto CC BY-NC aparece com a licença efetiva", async () => {
    await db.query(`insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
      select id, '[SINTÉTICO] revisor', 'humana', 'CC-BY-NC-4.0', '[SINTÉTICO] termos lidos', '[SINTÉTICO] crédito', 'aprovado', '[SINTÉTICO] teste'
      from protegido.conjunto_dados where chave_externa = 'D2'`);
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select licenca_efetiva, grupo, protecao from publico.ocorrencia where especie = 'Animalis sinteticus'");
    assert.deepEqual(rows, [{ licenca_efetiva: "CC-BY-NC-4.0", grupo: "fauna", protecao: "celula_0_1_grau" }]);
  });

  test("nenhuma coordenada ou localidade precisa vaza para a camada pública", async () => {
    const { rows } = await comoPapel(db, "bemtevi_leitura", "select *, st_astext(celula) as wkt from publico.ocorrencia");
    const texto = JSON.stringify(rows);
    for (const c of ["0.45", "0.15", "0.55", "0.25", "1.35", "1.55", "0.85"]) assert.ok(!texto.includes(c), `coordenada ${c} vazou`);
    assert.ok(!texto.includes("localidade precisa"));
  });

  test("lote registra DOI, chave do download, arquivo com SHA-256 e relatório", async () => {
    const lote = (await db.query("select doi, versao_fonte, situacao, relatorio from protegido.lote where id = $1", [rel.lote])).rows[0];
    assert.deepEqual([lote.doi, lote.versao_fonte, lote.situacao], ["10.15468/dl.sintetico", "0000000-000000000000000", "ok"]);
    assert.equal(lote.relatorio.validacao.aceitos, 7);
    const arq = (await db.query("select sha256 from protegido.arquivo_original where lote_id = $1", [rel.lote])).rows;
    assert.deepEqual(arq, [{ sha256: "b".repeat(64) }]);
  });
});

// ---------------------------------------------------------------------------------------------
// Fase 11.4.4 — regressão das falhas A (licenças) e B (proteção IUCN do registro)
// ---------------------------------------------------------------------------------------------
const CC0 = "http://creativecommons.org/publicdomain/zero/1.0/legalcode";
const SA = "http://creativecommons.org/licenses/by-sa/4.0/legalcode";

describe("falha A — classificação dos conjuntos (função pura)", () => {
  const reg = (d, license, extra = {}) => ({ datasetKey: d, license, ...extra });
  const classificar = (registros, licencas) => classificarConjuntos(registros, (d) => licencas[d]);

  test("CC BY sem termos adicionais: conferência automática, licença CC BY", () => {
    const k = classificar([reg("A", BY), reg("A", BY)], { A: "CC-BY-4.0" }).get("A");
    assert.deepEqual([k.decisao, k.licenca_automatica, k.motivos], ["automatica", "CC-BY-4.0", []]);
  });

  test("CC0 sem termos adicionais: conferência automática, licença CC0", () => {
    const k = classificar([reg("A", CC0)], { A: "CC0-1.0" }).get("A");
    assert.deepEqual([k.decisao, k.licenca_automatica], ["automatica", "CC0-1.0"]);
  });

  test("CC0 com um registro CC BY: automática, mas confirmada como CC BY (a mais restritiva)", () => {
    const k = classificar([reg("A", CC0), reg("A", BY)], { A: "CC0-1.0" }).get("A");
    assert.deepEqual([k.decisao, k.licenca_automatica], ["automatica", "CC-BY-4.0"]);
  });

  test("conjunto CC BY contendo registro CC BY-NC: revisão humana", () => {
    const k = classificar([reg("A", BY), reg("A", BYNC)], { A: "CC-BY-4.0" }).get("A");
    assert.equal(k.decisao, "revisao_humana");
    assert.equal(k.cc_by_nc, 1);
  });

  test("conjunto CC BY-NC contendo registros CC BY: revisão humana, todos CC BY-NC efetivos", () => {
    const k = classificar([reg("A", BY), reg("A", BY)], { A: "CC-BY-NC-4.0" }).get("A");
    assert.equal(k.decisao, "revisao_humana");
    assert.deepEqual(k.efetivas, { "CC-BY-NC-4.0": 2 });
  });

  test("termos adicionais em todos os registros: revisão humana", () => {
    const k = classificar([reg("A", BY, { rights: "termos" }), reg("A", BY, { accessRights: "termos" })], { A: "CC-BY-4.0" }).get("A");
    assert.equal(k.decisao, "revisao_humana");
    assert.equal(k.termos_adicionais, 2);
  });

  test("registro com licença não admitida (CC BY-SA) num conjunto CC BY: revisão humana", () => {
    const k = classificar([reg("A", BY), reg("A", SA)], { A: "CC-BY-4.0" }).get("A");
    assert.equal(k.decisao, "revisao_humana");
    assert.equal(k.licenca_nao_admitida, 1);
  });
});

describe("falhas A e B — carga de download sintético", () => {
  // Território sintético: UF 99 em [0,2]×[0,1]. Referência: "Sinteticus communis" (fixtures).
  const REGS = [
    // A1: termos adicionais num registro que será REJEITADO por estar fora da UF; o outro registro é normal.
    ["W1", "DW", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.5", "5.5", "2020", BY, { rights: "[SINTÉTICO] termos do publicador" }],
    ["W2", "DW", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.45", "0.35", "2020", BY, {}],
    // A2: conjunto CC BY com um registro CC BY-NC.
    ["N1", "DN", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.45", "0.55", "2020", BY, {}],
    ["N2", "DN", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.45", "0.65", "2020", BYNC, {}],
    // A3: conjunto CC BY-NC com registros CC BY.
    ["C1", "DC", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.55", "0.15", "2020", BY, {}],
    // A4: termos adicionais em todos os registros.
    ["T1", "DT", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.55", "0.25", "2020", BY, { rights: "[SINTÉTICO] termos" }],
    ["T2", "DT", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.55", "0.35", "2020", BY, { accessRights: "[SINTÉTICO] acesso" }],
    // Conjunto CC BY limpo (aprovado automaticamente) com os casos da falha B:
    ["B0", "DB", "Plantae", "Sinteticus vagus", "", "Sinteticus vagus", "0.25", "0.15", "2020", BY, {}],
    ["B7", "DB", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.25", "0.85", "2020", BY, {}],
    ["B1", "DB", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.25", "0.25", "2020", BY, { iucnRedListCategory: "VU" }],
    ["B2", "DB", "Plantae", "Sinteticus ameacadus", "", "Sinteticus ameacadus", "0.25", "0.35", "2020", BY, { iucnRedListCategory: "EN" }],
    ["B3", "DB", "Plantae", "Sinteticus ignotus", "", "Sinteticus ignotus", "0.25", "0.45", "2020", BY, { iucnRedListCategory: "CRITICALLY_ENDANGERED" }],
    ["B4", "DB", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.25", "0.55", "2020", BY, { dataGeneralizations: "[SINTÉTICO] coordenada generalizada" }],
    ["B5", "DB", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.25", "0.65", "2020", BY, { informationWithheld: "[SINTÉTICO] localidade retida" }],
    ["B6", "DB", "Plantae", "Sinteticus vagus", "", "Sinteticus vagus", "0.25", "0.75", "2020", BY, { iucnRedListCategory: "LC" }],
  ];
  let db;
  let rel;
  before(async () => {
    db = await criarBanco({ sinteticos: true });
    rel = await carregarDownload(db, {
      zip: dwcaSintetico(REGS, { DW: BY, DN: BY, DC: BYNC, DT: BY, DB: BY }),
      download: { chave: "0000000-000000000000002", doi: "10.15468/dl.sintetico2", citacao: "[SINTÉTICO]", link: "https://teste.invalid/d2.zip",
        tamanho_bytes: 1, sha256: "c".repeat(64), solicitado_em: "2026-11-16T00:00:00Z", baixado_em: "2026-11-16T01:00:00Z" },
      loteDef: { descricao: "[SINTÉTICO] regressão 11.4.4", predicado: {} },
      fonteFlora: "teste-sintetico-taxonomia",
      ufCodigo: "99",
    });
  });
  after(() => db?.close());

  const revisao = async (chave) =>
    (await db.query(
      `select rv.decisao, rv.tipo, rv.licenca_confirmada from protegido.conjunto_dados c
       left join protegido.revisao_vigente rv on rv.conjunto_id = c.id where c.chave_externa = $1`, [chave])).rows[0];
  // O id interno é obtido como dono; a leitura pública é feita como bemtevi_leitura (que não enxerga protegido).
  const publico = async (gbif) => {
    const id = (await db.query("select id from protegido.ocorrencia where id_externo = $1", [gbif])).rows[0]?.id;
    if (id === undefined) return null;
    return (await comoPapel(db, "bemtevi_leitura",
      `select p.protecao, p.celula is not null as tem_celula, p.url_origem, p.data_evento, p.municipio_codigo, p.licenca_efetiva
       from publico.ocorrencia p where p.id = ${Number(id)}`)).rows[0] ?? null;
  };

  test("A1: termos adicionais em registro rejeitado geograficamente ainda impedem a aprovação automática", async () => {
    const w1 = (await db.query("select motivo_rejeicao, rights from protegido.ocorrencia_recebida where gbif_id = 'W1'")).rows[0];
    assert.match(w1.motivo_rejeicao, /fora dos limites/);
    assert.ok(w1.rights, "o registro rejeitado foi preservado com os termos");
    assert.equal((await revisao("DW")).decisao, null, "conjunto DW sem revisão: aguardando revisão humana");
    assert.equal(await publico("W2"), null, "o registro aceito de DW não aparece");
  });

  test("A2: conjunto CC BY com registro CC BY-NC não é aprovado automaticamente", async () => {
    assert.equal((await revisao("DN")).decisao, null);
    assert.equal(await publico("N1"), null);
    assert.equal(await publico("N2"), null);
  });

  test("A3: conjunto CC BY-NC com registros CC BY não é aprovado e a licença efetiva é CC BY-NC", async () => {
    assert.equal((await revisao("DC")).decisao, null);
    const lic = (await db.query("select licenca_efetiva from protegido.ocorrencia where id_externo = 'C1'")).rows[0].licenca_efetiva;
    assert.equal(lic, "CC-BY-NC-4.0");
  });

  test("A4: termos adicionais em todos os registros mantêm o conjunto pendente", async () => {
    assert.equal((await revisao("DT")).decisao, null);
    assert.equal(await publico("T1"), null);
  });

  test("conjunto CC BY sem termos: conferência automática registrada; contagem no relatório", async () => {
    assert.deepEqual(await revisao("DB"), { decisao: "aprovado", tipo: "automatica", licenca_confirmada: "CC-BY-4.0" });
    assert.equal(rel.conjuntos_classificados_conferencia_automatica, 1);
    assert.equal(rel.conjuntos_aguardando_revisao_humana, 4);
  });

  test("B: não ameaçada (e IUCN LC) aparece como célula de 0,1°, com link e data", async () => {
    for (const g of ["B0", "B6"]) {
      const p = await publico(g);
      assert.equal(p.protecao, "celula_0_1_grau", g);
      assert.equal(p.tem_celula, true, g);
      assert.ok(p.url_origem && p.data_evento, g);
    }
  });

  for (const [g, caso] of [
    ["B1", "ameaçada (VU) conciliada com a referência"],
    ["B2", "ameaçada (EN) sem correspondência na referência"],
    ["B3", "ameaçada (CRITICALLY_ENDANGERED, forma por extenso) sem correspondência"],
    ["B4", "coordenada generalizada na fonte"],
    ["B5", "informação geográfica retida pela fonte"],
  ]) {
    test(`B: ${caso} → só município, sem célula, sem link, sem data`, async () => {
      const p = await publico(g);
      assert.deepEqual(p, { protecao: "municipio", tem_celula: false, url_origem: null, data_evento: null, municipio_codigo: "9900001", licenca_efetiva: "CC-BY-4.0" });
    });
  }

  test("B: registro SEM categoria de espécie ameaçada conciliada também é protegido (proteção da espécie)", async () => {
    const p = await publico("B7");
    assert.equal(p.protecao, "municipio");
    assert.equal(p.tem_celula, false);
  });

  test("B2 e B3 de fato não foram conciliados (a proteção não depende da taxonomia)", async () => {
    const { rows } = await db.query("select id_externo, conciliacao from protegido.ocorrencia where id_externo in ('B2', 'B3') order by 1");
    assert.deepEqual(rows, [{ id_externo: "B2", conciliacao: "nao_conciliado" }, { id_externo: "B3", conciliacao: "nao_conciliado" }]);
  });
});

// ---------------------------------------------------------------------------------------------
// Fase 11.4.4C — revalidação dos conjuntos entre lotes
// ---------------------------------------------------------------------------------------------
describe("11.4.4C — decisão sobre a revisão vigente (função pura)", () => {
  const k = (registros, licenca) => classificarConjuntos(registros.map((r) => ({ datasetKey: "A", ...r })), () => licenca).get("A");
  const humana = (licenca, revisado_em = "2026-11-17T12:00:00Z") => ({ tipo: "humana", decisao: "aprovado", licenca_confirmada: licenca, revisado_em });
  const automatica = (licenca, decisao = "aprovado") => ({ tipo: "automatica", decisao, licenca_confirmada: licenca, revisado_em: "2026-11-17T12:00:00Z" });

  test("sem revisão: conferência automática só quando a classificação permite", () => {
    assert.deepEqual(decidirRevisao(undefined, k([{ license: BY }], "CC-BY-4.0")), { acao: "aprovar", licenca: "CC-BY-4.0" });
    assert.deepEqual(decidirRevisao(undefined, k([{ license: BYNC }], "CC-BY-4.0")), { acao: "aguardar" });
  });

  test("aprovação automática com registro CC BY-NC, termos ou CC BY-SA: suspensa", () => {
    for (const extra of [{ license: BYNC }, { license: BY, rights: "termos" }, { license: BY, accessRights: "termos" }, { license: SA }]) {
      const d = decidirRevisao(automatica("CC-BY-4.0"), k([{ license: BY }, extra], "CC-BY-4.0"));
      assert.equal(d.acao, "suspender", JSON.stringify(extra));
      assert.ok(d.motivos.length > 0);
    }
  });

  test("aprovação automática CC0 com registro CC BY novo: reaprovada como CC BY (a mais restritiva)", () => {
    assert.deepEqual(decidirRevisao(automatica("CC0-1.0"), k([{ license: CC0 }, { license: BY }], "CC0-1.0")), { acao: "aprovar", licenca: "CC-BY-4.0" });
    assert.deepEqual(decidirRevisao(automatica("CC-BY-4.0"), k([{ license: BY }], "CC-BY-4.0")), { acao: "manter" });
  });

  test("revisão pendente, suspensa ou rejeitada nunca vira aprovação automática", () => {
    for (const v of [automatica(null, "pendente"), { ...humana("CC-BY-4.0"), decisao: "rejeitado" }, { ...humana(null), decisao: "pendente" }]) {
      assert.deepEqual(decidirRevisao(v, k([{ license: BY }], "CC-BY-4.0")), { acao: "manter" });
    }
  });

  test("aprovação humana: mantida enquanto cobre os registros; suspensa com licença mais restritiva ou não admitida", () => {
    assert.deepEqual(decidirRevisao(humana("CC-BY-NC-4.0"), k([{ license: BY }, { license: BYNC }], "CC-BY-NC-4.0")), { acao: "manter" });
    assert.equal(decidirRevisao(humana("CC-BY-4.0"), k([{ license: BY }, { license: BYNC }], "CC-BY-4.0")).acao, "suspender");
    assert.equal(decidirRevisao(humana("CC-BY-NC-4.0"), k([{ license: SA }], "CC-BY-NC-4.0")).acao, "suspender");
  });

  test("aprovação humana: termos já existentes na revisão são aceitos; termos novos depois dela suspendem", () => {
    const antes = { rights: "termos lidos", concluidoEm: "2026-11-17T11:00:00Z" };
    const mesmo = { rights: "termos lidos", concluidoEm: null };
    const novo = { accessRights: "termos novos", concluidoEm: null };
    const kk = (regs) => k(regs.map((r) => ({ license: BY, ...r })), "CC-BY-4.0");
    assert.deepEqual(motivosContraAprovacaoHumana(humana("CC-BY-4.0"), kk([antes, mesmo]), [antes, mesmo]), []);
    const m = motivosContraAprovacaoHumana(humana("CC-BY-4.0"), kk([antes, novo]), [antes, novo]);
    assert.equal(m.length, 1);
    assert.match(m[0], /rights\/accessRights novos/);
  });

  test("licença do conjunto: a mais restritiva entre a registrada e a do EML novo; não admitida prevalece", () => {
    assert.equal(licencaMaisRestritiva("CC-BY-4.0", "CC-BY-NC-4.0"), "CC-BY-NC-4.0");
    assert.equal(licencaMaisRestritiva("CC-BY-NC-4.0", "CC0-1.0"), "CC-BY-NC-4.0");
    assert.equal(licencaMaisRestritiva("CC-BY-4.0", "outra"), "outra");
    assert.equal(licencaMaisRestritiva("CC-BY-4.0", undefined), "CC-BY-4.0");
  });
});

describe("11.4.4C — carga de lotes sucessivos (sintético)", () => {
  let db;
  let n = 0;
  // Registro sintético dentro da UF 99, espécie da referência sintética.
  const reg = (g, d, licenca = BY, extra = {}) => [g, d, "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.45", "0.15", "2020", licenca, extra];
  const carregar = (regs, licencas) => {
    n++;
    return carregarDownload(db, {
      zip: dwcaSintetico(regs, licencas),
      download: { chave: `0000000-00000000000010${n}`, doi: `10.15468/dl.sint${n}`, citacao: "[SINTÉTICO]", link: `https://teste.invalid/l${n}.zip`,
        tamanho_bytes: 1, sha256: String(n).repeat(64), solicitado_em: "2026-11-17T00:00:00Z", baixado_em: "2026-11-17T01:00:00Z" },
      loteDef: { descricao: `[SINTÉTICO] lote ${n}`, predicado: {} },
      fonteFlora: "teste-sintetico-taxonomia",
      ufCodigo: "99",
    });
  };
  const revisoes = async (chave) =>
    (await db.query(`select r.tipo, r.decisao, r.licenca_confirmada from protegido.revisao_conjunto r join protegido.conjunto_dados c on c.id = r.conjunto_id
      where c.chave_externa = $1 order by r.revisado_em, r.id`, [chave])).rows;
  const vigente = async (chave) => (await revisoes(chave)).at(-1) ?? null;
  // Contagem como dono, pela própria view pública (o filtro por chave do conjunto exige protegido).
  const publicas = async (chave) =>
    (await db.query(`select count(*)::int as n from publico.ocorrencia o join protegido.conjunto_dados c on c.id = o.conjunto_id
      where c.chave_externa = $1`, [chave])).rows[0].n;
  const aprovarHumana = (chave, licenca, decisao = "aprovado") =>
    db.query(`insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
      select id, '[SINTÉTICO] revisor', 'humana', $2, '[SINTÉTICO] termos lidos', '[SINTÉTICO] crédito', $3, '[SINTÉTICO] teste'
      from protegido.conjunto_dados where chave_externa = $1`, [chave, licenca, decisao]);

  before(async () => {
    db = await criarBanco({ sinteticos: true });
    // Lote 1: conjuntos limpos (aprovados automaticamente) e conjuntos que terão revisão humana.
    const r1 = await carregar(
      [reg("L1-A", "SA1"), reg("L1-B", "SB1"), reg("L1-C", "SC1"), reg("L1-D", "SD1"), reg("L1-E", "SE1", CC0), reg("L1-F", "SF1"),
        reg("L1-H", "SH1", BY, { rights: "[SINTÉTICO] termos do publicador" }), reg("L1-I", "SI1"), reg("L1-R", "SR1", BYNC)],
      { SA1: BY, SB1: BY, SC1: BY, SD1: BY, SE1: CC0, SF1: BY, SH1: BYNC, SI1: BY, SR1: BYNC });
    assert.equal(r1.conjuntos_aprovados_automaticamente_neste_lote, 7);
    await aprovarHumana("SH1", "CC-BY-NC-4.0");
    await aprovarHumana("SI1", "CC-BY-4.0");
    await aprovarHumana("SR1", "CC-BY-NC-4.0", "rejeitado");
  });
  after(() => db?.close());

  test("lote 1: conjunto CC BY aprovado automaticamente e publicado", async () => {
    assert.deepEqual(await revisoes("SA1"), [{ tipo: "automatica", decisao: "aprovado", licenca_confirmada: "CC-BY-4.0" }]);
    assert.equal(await publicas("SA1"), 1);
    const leitura = await comoPapel(db, "bemtevi_leitura", "select count(*)::int as n from publico.ocorrencia");
    assert.ok(leitura.rows[0].n > 0, "a camada pública é legível por bemtevi_leitura");
  });

  describe("lote 2", () => {
    let r2;
    before(async () => {
      r2 = await carregar(
        [reg("L2-A", "SA1", BYNC), reg("L2-B", "SB1", BY, { rights: "[SINTÉTICO] uso restrito" }), reg("L2-C", "SC1", SA),
          reg("L2-D", "SD1"), reg("L2-D2", "SD1"), reg("L2-E", "SE1", BY), reg("L2-F", "SF1"),
          reg("L2-H", "SH1"), reg("L2-H2", "SH1", BY, { rights: "[SINTÉTICO] termos do publicador" }), reg("L2-I", "SI1", BYNC), reg("L2-R", "SR1", BY)],
        { SA1: BY, SB1: BY, SC1: BY, SD1: BY, SE1: CC0, SF1: BYNC, SH1: BYNC, SI1: BY, SR1: BYNC });
    });

    const suspenso = async (chave) => {
      assert.deepEqual(await vigente(chave), { tipo: "automatica", decisao: "pendente", licenca_confirmada: null }, chave);
      assert.equal(await publicas(chave), 0, `${chave} saiu da camada pública, inclusive os registros do lote 1`);
      assert.equal((await revisoes(chave))[0].decisao, "aprovado", "a aprovação anterior continua no histórico");
    };

    test("registro CC BY-NC novo num conjunto aprovado: aprovação suspensa", async () => {
      await suspenso("SA1");
      const lic = (await db.query("select licenca_efetiva from protegido.ocorrencia where id_externo = 'L2-A'")).rows[0].licenca_efetiva;
      assert.equal(lic, "CC-BY-NC-4.0");
    });

    test("registro com rights/accessRights novo num conjunto aprovado: aprovação suspensa", () => suspenso("SB1"));

    test("registro com licença não admitida (CC BY-SA) num conjunto aprovado: rejeitado e aprovação suspensa", async () => {
      await suspenso("SC1");
      const m = (await db.query("select motivo_rejeicao from protegido.ocorrencia_recebida where gbif_id = 'L2-C'")).rows[0].motivo_rejeicao;
      assert.match(m, /licença não admitida/);
    });

    test("conjunto aprovado com registros compatíveis em lotes diferentes: aprovação mantida e todos publicados", async () => {
      assert.equal((await revisoes("SD1")).length, 1, "nenhuma revisão nova");
      assert.equal(await publicas("SD1"), 3);
    });

    test("conjunto CC0 que recebe registro CC BY: reaprovado com a licença mais restritiva", async () => {
      assert.deepEqual(await revisoes("SE1"), [
        { tipo: "automatica", decisao: "aprovado", licenca_confirmada: "CC0-1.0" },
        { tipo: "automatica", decisao: "aprovado", licenca_confirmada: "CC-BY-4.0" },
      ]);
    });

    test("EML do conjunto passa a CC BY-NC: registros novos com licença efetiva CC BY-NC e aprovação suspensa", async () => {
      await suspenso("SF1");
      const lic = (await db.query("select licenca_efetiva from protegido.ocorrencia where id_externo = 'L2-F'")).rows[0].licenca_efetiva;
      assert.equal(lic, "CC-BY-NC-4.0");
    });

    test("aprovação humana CC BY-NC preservada com registros compatíveis e os mesmos termos já revisados", async () => {
      assert.deepEqual(await vigente("SH1"), { tipo: "humana", decisao: "aprovado", licenca_confirmada: "CC-BY-NC-4.0" });
      assert.equal(await publicas("SH1"), 3);
    });

    test("aprovação humana CC BY com registro CC BY-NC novo: suspensa (a condição legal não é ignorada)", async () => {
      assert.deepEqual(await vigente("SI1"), { tipo: "automatica", decisao: "pendente", licenca_confirmada: null });
      assert.deepEqual((await revisoes("SI1"))[1], { tipo: "humana", decisao: "aprovado", licenca_confirmada: "CC-BY-4.0" }, "a revisão humana fica no histórico");
      assert.equal(await publicas("SI1"), 0);
    });

    test("rejeição humana preservada: nunca vira aprovação automática", async () => {
      assert.deepEqual(await vigente("SR1"), { tipo: "humana", decisao: "rejeitado", licenca_confirmada: "CC-BY-NC-4.0" });
      assert.equal(await publicas("SR1"), 0);
    });

    test("relatório do lote conta suspensões e revisões humanas preservadas", () => {
      assert.equal(r2.conjuntos_suspensos_neste_lote, 5);
      assert.equal(r2.conjuntos_aprovados_automaticamente_neste_lote, 1);
      assert.equal(r2.conjuntos_com_revisao_humana_preservada, 2);
    });

    describe("lote 3", () => {
      before(async () => {
        await carregar([reg("L3-A", "SA1"), reg("L3-H", "SH1", BY, { accessRights: "[SINTÉTICO] termos novos" })], { SA1: BY, SH1: BYNC });
      });

      test("conjunto suspenso não volta a ser aprovado automaticamente", async () => {
        assert.equal((await vigente("SA1")).decisao, "pendente");
        assert.equal(await publicas("SA1"), 0);
      });

      test("aprovação humana com termos adicionais novos, posteriores à revisão: suspensa", async () => {
        assert.deepEqual(await vigente("SH1"), { tipo: "automatica", decisao: "pendente", licenca_confirmada: null });
        assert.equal(await publicas("SH1"), 0);
      });

      test("revisão humana nova libera o conjunto suspenso", async () => {
        await aprovarHumana("SH1", "CC-BY-NC-4.0");
        assert.equal(await publicas("SH1"), 4);
      });
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Fase 11.4.4D — carga numa sessão nova (search_path padrão, sem o estado deixado pelas migrações)
// ---------------------------------------------------------------------------------------------
describe("11.4.4D — carga de download numa sessão nova", () => {
  let db;
  before(async () => {
    db = await criarBancoEmSessaoNova({ sinteticos: true });
  });
  after(() => db?.close());

  test("a sessão nova não enxerga o PostGIS sem schema (sem o ajuste, a carga falharia)", async () => {
    assert.doesNotMatch((await db.query("show search_path")).rows[0].search_path, /extensions/);
    assert.match(await erroDe(() => db.query("select 'SRID=4674;POINT(0 0)'::geometry")), /type "geometry" does not exist/);
    assert.match(await erroDe(() => db.query("select st_intersects(null::extensions.geometry, null::extensions.geometry)")), /function st_intersects/);
  });

  test("carregarDownload resolve geometry, ST_Intersects e a célula de 0,1°", async () => {
    const rel = await carregarDownload(db, {
      zip: dwcaSintetico(),
      download: { chave: "0000000-000000000000300", doi: "10.15468/dl.sessao", citacao: "[SINTÉTICO]", link: "https://teste.invalid/sessao.zip",
        tamanho_bytes: 1, sha256: "d".repeat(64), solicitado_em: "2026-11-17T00:00:00Z", baixado_em: "2026-11-17T01:00:00Z" },
      loteDef: { descricao: "[SINTÉTICO] sessão nova", predicado: {} },
      fonteFlora: "teste-sintetico-taxonomia",
      ufCodigo: "99",
    });
    assert.deepEqual([rel.recebidos, rel.aceitos, rel.rejeitados], [11, 7, 4]);
    assert.ok(rel.rejeicoes_por_motivo["fora dos limites da UF 99 (malha municipal carregada)"], "ST_Intersects classificou o ponto fora da UF");
    const { rows } = await db.query("select count(*)::int as n from protegido.ocorrencia_municipio om join protegido.ocorrencia o on o.id = om.ocorrencia_id where o.lote_id = $1", [rel.lote]);
    assert.equal(rows[0].n, 7, "todo aceito ganhou município pela malha");
    const celulas = await comoPapel(db, "bemtevi_leitura", "select count(*)::int as n from publico.ocorrencia where protecao = 'celula_0_1_grau' and celula is not null");
    assert.ok(celulas.rows[0].n > 0);
  });

  test("o ajuste vale só dentro da transação: a sessão continua com o search_path padrão", async () => {
    assert.doesNotMatch((await db.query("show search_path")).rows[0].search_path, /extensions/);
  });
});
