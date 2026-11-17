// Publicador de ocorrências, Cenário B (Fase 11.5.1), testado entre dois bancos PGlite DESCARTÁVEIS em memória:
// origem = banco "local" com um download SINTÉTICO carregado; destino = banco "remoto" só com as referências.
// Nenhuma conexão com o Supabase.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { carregarDownload } from "../../scripts/ingestao/gbif.mjs";
import { destinoPglite, origemPglite, planejar, publicarLote } from "../../scripts/banco/publicar-ocorrencias.mjs";
import { comoPapel, criarBanco, erroDe } from "./apoio.mjs";
import { BY, dwcaSintetico, REGISTROS } from "./dwca-sintetico.mjs";

const CHAVE = "0000000-000000000000500";
const download = (chave) => ({
  chave, doi: `10.15468/dl.${chave.slice(-3)}`, citacao: "[SINTÉTICO] citação", link: `https://teste.invalid/${chave}.zip`,
  tamanho_bytes: 1, sha256: "e".repeat(64), solicitado_em: "2026-11-18T00:00:00Z", baixado_em: "2026-11-18T01:00:00Z",
});
const carregar = (db, chave, registros = REGISTROS, licencas = undefined) =>
  carregarDownload(db, {
    zip: dwcaSintetico(registros, licencas), download: download(chave), loteDef: { descricao: `[SINTÉTICO] ${chave}`, predicado: {} },
    fonteFlora: "teste-sintetico-taxonomia", ufCodigo: "99",
  });
const contar = async (db, sql, params = []) => (await db.query(`select count(*)::int as n from ${sql}`, params)).rows[0].n;
const tamanho = async (db) => Number((await db.query("select pg_database_size(current_database())::bigint as b")).rows[0].b);
async function retrato(db) {
  const tabelas = ["fonte", "lote", "arquivo_original", "conjunto_dados", "revisao_conjunto", "nome_recebido", "especie", "nome_cientifico",
    "ocorrencia_recebida", "lista_referencia", "taxon_sensivel", "ocorrencia", "ocorrencia_municipio"];
  return Object.fromEntries(await Promise.all(tabelas.map(async (t) => [t, await contar(db, `protegido.${t}`)])));
}

describe("publicador — plano do Cenário B", () => {
  let origem;
  let rel;
  before(async () => {
    origem = await criarBanco({ sinteticos: true });
    rel = await carregar(origem, CHAVE);
  });
  after(() => origem?.close());

  test("só o conjunto aprovado (D1); a proteção do lote inteiro vai junto", async () => {
    const plano = await planejar(origemPglite(origem), CHAVE);
    const d1 = (await origem.query("select id from protegido.conjunto_dados where chave_externa = 'D1'")).rows[0].id;
    assert.deepEqual(plano.conjuntosAprovados, [d1]);
    assert.equal(plano.lote, rel.lote);
    assert.equal(plano.loteTaxonomia, rel.lote_taxonomia);
    assert.deepEqual(plano.tabelas.map((t) => t.tabela), [
      "fonte", "lote", "arquivo_original", "conjunto_dados", "revisao_conjunto", "nome_recebido", "especie", "nome_cientifico",
      "ocorrencia_recebida", "lista_referencia", "taxon_sensivel", "ocorrencia", "ocorrencia_municipio",
    ]);
  });

  test("download inexistente ou sem conjunto aprovado: recusado", async () => {
    assert.match(await erroDe(() => planejar(origemPglite(origem), "9999999-999999999999999")), /não está carregado/);
    const outra = await criarBanco({ sinteticos: true });
    try {
      await carregar(outra, "0000000-000000000000501", REGISTROS.filter((r) => r[1] !== "D1"));
      assert.match(await erroDe(() => planejar(origemPglite(outra), "0000000-000000000000501")), /nenhum conjunto aprovado/);
    } finally {
      await outra.close();
    }
  });
});

describe("publicador — publicação entre bancos descartáveis", () => {
  let origem;
  let destino;
  let rel;
  let resultado;
  before(async () => {
    origem = await criarBanco({ sinteticos: true });
    destino = await criarBanco({ sinteticos: true });
    rel = await carregar(origem, CHAVE);
    resultado = await publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE);
  });
  after(async () => {
    await origem?.close();
    await destino?.close();
  });

  test("publica só os registros do conjunto aprovado, inclusive os rejeitados dele, com os mesmos ids", async () => {
    assert.equal(resultado.tabelas.ocorrencia.linhas, 5, "P1, P2, P3, A2 e A3");
    assert.equal(resultado.tabelas.ocorrencia_recebida.linhas, 8, "os 5 aceitos e os 3 rejeitados de D1 (R1, R2, R5)");
    const ids = (db) => db.query("select id, id_externo, recebida_id from protegido.ocorrencia where lote_id = $1 order by id", [rel.lote]).then((r) => r.rows);
    assert.deepEqual(await ids(destino), await ids(origem).then((l) => l.filter((o) => ["P1", "P2", "P3", "A2", "A3"].includes(o.id_externo))));
    const rejeitados = (await destino.query("select gbif_id from protegido.ocorrencia_recebida where lote_id = $1 and motivo_rejeicao is not null order by 1", [rel.lote])).rows;
    assert.deepEqual(rejeitados.map((r) => r.gbif_id), ["R1", "R2", "R5"]);
  });

  test("conjuntos pendentes (D2, D3, D4) e seus registros não vão para o destino", async () => {
    assert.equal(await contar(destino, "protegido.conjunto_dados where chave_externa in ('D2', 'D3', 'D4')"), 0);
    assert.equal(await contar(destino, "protegido.ocorrencia_recebida where gbif_id in ('A1', 'X1', 'R4')"), 0);
    assert.ok(await contar(origem, "protegido.ocorrencia_recebida where gbif_id in ('A1', 'X1', 'R4')") === 3, "a origem continua com tudo");
  });

  test("camada pública do destino idêntica à da origem; espécie ameaçada só por município", async () => {
    const publico = (db) => comoPapel(db, "bemtevi_leitura",
      `select id, protecao, municipio_codigo, celula_x10, celula_y10, licenca_efetiva from publico.ocorrencia_celula where lote_id = ${rel.lote} order by id`).then((r) => r.rows);
    assert.deepEqual(await publico(destino), await publico(origem));
    const a2 = await comoPapel(destino, "bemtevi_leitura", "select protecao, celula_x10 from publico.ocorrencia_celula where especie = 'Animalis ameacadus'");
    assert.deepEqual(a2.rows, [{ protecao: "municipio", celula_x10: null }]);
    assert.equal(resultado.camada_publica.linhas, 5);
  });

  test("sequências ajustadas: novos ids no destino continuam depois dos publicados", async () => {
    for (const t of ["lote", "ocorrencia", "ocorrencia_recebida", "revisao_conjunto"]) {
      const { rows } = await destino.query(`select nextval(pg_get_serial_sequence('protegido.${t}', 'id')) > (select max(id) from protegido.${t}) as ok`);
      assert.equal(rows[0].ok, true, t);
    }
  });

  test("repetir a publicação é recusado e não muda nada", async () => {
    const antes = await retrato(destino);
    assert.match(await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE)), /já existe no destino/);
    assert.deepEqual(await retrato(destino), antes);
  });

  test("segundo download com o mesmo conjunto aprovado: linhas compartilhadas conferidas, só o novo é copiado", async () => {
    const chave2 = "0000000-000000000000502";
    const novos = [["N1", "D1", "Plantae", "Sinteticus communis", "", "Sinteticus communis", "0.45", "0.45", "2022", BY, {}]];
    await carregar(origem, chave2, novos, { D1: BY });
    const r = await publicarLote(origemPglite(origem), destinoPglite(destino), chave2);
    assert.equal(r.tabelas.conjunto_dados.copiadas_agora, 0, "D1 já estava publicado e idêntico");
    assert.equal(r.tabelas.ocorrencia.linhas, 1);
    assert.equal(await contar(destino, "protegido.ocorrencia where id_externo = 'N1'"), 1);
  });
});

describe("publicador — falhas desfazem tudo", () => {
  let origem;
  before(async () => {
    origem = await criarBanco({ sinteticos: true });
    await carregar(origem, CHAVE);
  });
  after(() => origem?.close());

  const comDestino = async (fn) => {
    const destino = await criarBanco({ sinteticos: true });
    try {
      const antes = await retrato(destino);
      await fn(destino);
      assert.deepEqual(await retrato(destino), antes, "o destino ficou exatamente como antes");
    } finally {
      await destino.close();
    }
  };

  test("erro no meio da cópia (interrupção): transação desfeita", () =>
    comDestino(async (destino) => {
      const erro = await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE, {
        aoCopiar: async (tabela) => { if (tabela === "ocorrencia") throw new Error("interrompido"); },
      }));
      assert.match(erro, /interrompido/);
    }));

  test("conteúdo divergente depois da cópia (MD5): transação desfeita", () =>
    comDestino(async (destino) => {
      const erro = await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE, {
        aoCopiar: async (tabela, tx) => { if (tabela === "ocorrencia") await tx.consultar("update protegido.ocorrencia set ano = 1999 where id = (select max(id) from protegido.ocorrencia)"); },
      }));
      assert.match(erro, /protegido\.ocorrencia: destino difere da origem/);
    }));

  test("migrações diferentes: recusado antes de gravar", () =>
    comDestino(async (destino) => {
      await destino.exec("delete from bemtevi_local.migracao where nome = (select max(nome) from bemtevi_local.migracao)");
      assert.match(await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE)), /migrações diferentes/);
    }));

  test("referência diferente no destino (município): recusado antes de gravar", () =>
    comDestino(async (destino) => {
      await destino.exec("update protegido.municipio set nome = '[SINTÉTICO] outro nome' where codigo_ibge = '9900001'");
      assert.match(await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE)), /dependência protegido\.municipio difere/);
    }));

  test("espaço: estimativa acima do limite é recusada antes de gravar", () =>
    comDestino(async (destino) => {
      const limiteBytes = (await tamanho(destino)) + 1;
      assert.match(await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE, { limiteBytes })), /espaço insuficiente/);
    }));

  test("espaço: crescimento real acima do limite dentro da transação é desfeito", () =>
    comDestino(async (destino) => {
      const limiteBytes = (await tamanho(destino)) + 2e6;
      const erro = await erroDe(() => publicarLote(origemPglite(origem), destinoPglite(destino), CHAVE, {
        limiteBytes, fatorEstimativa: 0,
        aoCopiar: async (tabela, tx) => {
          if (tabela === "ocorrencia_municipio") await tx.consultar("create temporary table enchimento on commit drop as select repeat('x', 1000) as x from generate_series(1, 20000)");
        },
      }));
      assert.match(erro, /limite de \d+ MB ultrapassado/);
    }));
});
