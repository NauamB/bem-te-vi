// Integridade: restrições, chaves, imutabilidade dos originais e regras de revisão.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { criarBanco, erroDe } from "./apoio.mjs";

let db;
before(async () => {
  db = await criarBanco({ sinteticos: true });
});
after(() => db?.close());

const LOTE = "(select id from protegido.lote where descricao = 'sintetico-ocorrencias')";
const CONJUNTO = "(select id from protegido.conjunto_dados where chave_externa = 'S1')";

// Cada caso deve ser recusado pelo banco.
const recusas = [
  ["código IBGE de município com 6 dígitos",
    `insert into protegido.municipio values ('990000', 'x', '99', st_multi(st_makeenvelope(0,0,1,1,4674)), 't', ${LOTE})`],
  ["município cujo código não começa pela UF",
    `insert into protegido.municipio values ('5100001', 'x', '99', st_multi(st_makeenvelope(0,0,1,1,4674)), 't', ${LOTE})`],
  ["geometria fora do SIRGAS 2000",
    `insert into protegido.municipio values ('9900009', 'x', '99', st_multi(st_makeenvelope(0,0,1,1,4326)), 't', ${LOTE})`],
  ["SHA-256 inválido",
    `insert into protegido.arquivo_original (lote_id, caminho, tipo, tamanho_bytes, sha256) values (${LOTE}, 'a.zip', 'zip', 10, 'abc')`],
  ["DOI malformado",
    `update protegido.lote set doi = 'doi-invalido' where descricao = 'sintetico-ocorrencias'`],
  ["lote concluído sem data de conclusão",
    `insert into protegido.lote (fonte_codigo, descricao, versao_conector, situacao) values ('teste-sintetico-ocorrencias', 'x', 't', 'ok')`],
  ["licença de conjunto fora da lista",
    `insert into protegido.conjunto_dados (fonte_codigo, chave_externa, titulo, licenca) values ('teste-sintetico-ocorrencias', 'X', 'x', 'CC-BY-SA-4.0')`],
  ["conjunto repetido na mesma fonte",
    `insert into protegido.conjunto_dados (fonte_codigo, chave_externa, titulo, licenca) values ('teste-sintetico-ocorrencias', 'S1', 'x', 'CC-BY-4.0')`],
  ["CC BY-NC aprovado sem revisão humana",
    `insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
     values (${CONJUNTO}, 'r', 'automatica', 'CC-BY-NC-4.0', 'c', 'a', 'aprovado', 'j')`],
  ["revisão sem justificativa",
    `insert into protegido.revisao_conjunto (conjunto_id, revisor, tipo, licenca_confirmada, condicoes_de_uso, atribuicao_exigida, decisao, justificativa)
     values (${CONJUNTO}, 'r', 'humana', 'CC-BY-4.0', 'c', 'a', 'aprovado', '  ')`],
  ["sinônimo sem nome aceito",
    `insert into protegido.nome_cientifico (lote_id, recebido_id, taxon_id, nome, rank, status)
     select lote_id, id, 'X1', 'x', 'especie', 'sinonimo' from protegido.nome_recebido where taxon_id = 'T3'`],
  ["ocorrência repetida na mesma fonte",
    `insert into protegido.ocorrencia (recebida_id, fonte_codigo, id_externo, conjunto_id, lote_id, nome_recebido, conciliacao, geom, licenca_efetiva)
     select r.id, 'teste-sintetico-ocorrencias', 'G1', r.conjunto_id, r.lote_id, 'x', 'nao_conciliado', st_setsrid(st_makepoint(0.5, 0.5), 4674), 'CC-BY-4.0'
     from protegido.ocorrencia_recebida r where r.gbif_id = 'G7'`],
  ["ocorrência 'conciliada' sem nome científico",
    `insert into protegido.ocorrencia (recebida_id, fonte_codigo, id_externo, conjunto_id, lote_id, nome_recebido, conciliacao, geom, licenca_efetiva)
     select r.id, 'teste-sintetico-ocorrencias', 'G7', r.conjunto_id, r.lote_id, 'x', 'conciliado', st_setsrid(st_makepoint(0.5, 0.5), 4674), 'CC-BY-4.0'
     from protegido.ocorrencia_recebida r where r.gbif_id = 'G7'`],
  ["ocorrência com licença efetiva não admitida",
    `insert into protegido.ocorrencia (recebida_id, fonte_codigo, id_externo, conjunto_id, lote_id, nome_recebido, conciliacao, geom, licenca_efetiva)
     select r.id, 'teste-sintetico-ocorrencias', 'G7', r.conjunto_id, r.lote_id, 'x', 'nao_conciliado', st_setsrid(st_makepoint(0.5, 0.5), 4674), 'outra'
     from protegido.ocorrencia_recebida r where r.gbif_id = 'G7'`],
  ["ocorrência com geometria que não é ponto",
    `insert into protegido.ocorrencia (recebida_id, fonte_codigo, id_externo, conjunto_id, lote_id, nome_recebido, conciliacao, geom, licenca_efetiva)
     select r.id, 'teste-sintetico-ocorrencias', 'G7', r.conjunto_id, r.lote_id, 'x', 'nao_conciliado', st_makeenvelope(0,0,1,1,4674), 'CC-BY-4.0'
     from protegido.ocorrencia_recebida r where r.gbif_id = 'G7'`],
  ["ocorrência apontando para conjunto inexistente",
    `insert into protegido.ocorrencia (recebida_id, fonte_codigo, id_externo, conjunto_id, lote_id, nome_recebido, conciliacao, geom, licenca_efetiva)
     select r.id, 'teste-sintetico-ocorrencias', 'G7', 999999, r.lote_id, 'x', 'nao_conciliado', st_setsrid(st_makepoint(0.5, 0.5), 4674), 'CC-BY-4.0'
     from protegido.ocorrencia_recebida r where r.gbif_id = 'G7'`],
  ["política validada sem responsável",
    `insert into protegido.politica_protecao (versao, estado, grade_graus, descricao) values (1, 'validada', 0.1, 'x')`],
];

describe("restrições de integridade", () => {
  for (const [caso, sql] of recusas) {
    test(`recusa: ${caso}`, async () => {
      assert.ok(await erroDe(() => db.exec(sql)), `deveria ter sido recusado: ${caso}`);
    });
  }
});

describe("originais, arquivos e revisões são somente inserção", () => {
  for (const [tabela, filtro] of [
    ["ocorrencia_recebida", "gbif_id = 'G1'"],
    ["nome_recebido", "taxon_id = 'T1'"],
    ["revisao_conjunto", "true"],
  ]) {
    test(`${tabela}: UPDATE e DELETE recusados`, async () => {
      const coluna = tabela === "revisao_conjunto" ? "justificativa" : "lote_id";
      const valor = tabela === "revisao_conjunto" ? "'alterada'" : "lote_id";
      assert.match(await erroDe(() => db.exec(`update protegido.${tabela} set ${coluna} = ${valor} where ${filtro}`)), /somente inserção/);
      assert.match(await erroDe(() => db.exec(`delete from protegido.${tabela} where ${filtro}`)), /somente inserção/);
    });
  }

  test("arquivo_original: aceita SHA-256 válido e depois recusa alteração", async () => {
    const sha = "a".repeat(64);
    await db.exec(`insert into protegido.arquivo_original (lote_id, caminho, tipo, tamanho_bytes, sha256) values (${LOTE}, 'sintetico.zip', 'zip', 10, '${sha}')`);
    assert.match(await erroDe(() => db.exec("update protegido.arquivo_original set caminho = 'outro.zip'")), /somente inserção/);
    assert.match(await erroDe(() => db.exec("delete from protegido.arquivo_original")), /somente inserção/);
  });

  test("registro rejeitado continua preservado no original, com o motivo", async () => {
    const { rows } = await db.query("select motivo_rejeicao from protegido.ocorrencia_recebida where gbif_id = 'G7'");
    assert.equal(rows[0].motivo_rejeicao, "coordenada (0, 0)");
    const tratada = await db.query("select 1 from protegido.ocorrencia where id_externo = 'G7'");
    assert.equal(tratada.rows.length, 0);
  });
});

describe("separação entre espécie, nome científico e ocorrência", () => {
  test("sinônimo aponta para o nome aceito e para a mesma espécie", async () => {
    const { rows } = await db.query(`
      select s.status, a.nome as aceito, e.nome as especie
      from protegido.nome_cientifico s
      join protegido.nome_cientifico a on a.id = s.nome_aceito_id
      join protegido.especie e on e.id = s.especie_id
      where s.nome = 'Sinteticus vetus'`);
    assert.deepEqual(rows, [{ status: "sinonimo", aceito: "Sinteticus communis", especie: "Sinteticus communis" }]);
  });

  test("ocorrência preserva o nome recebido mesmo quando conciliada por sinônimo", async () => {
    const { rows } = await db.query(`
      select o.nome_recebido, o.conciliacao, e.nome as especie
      from protegido.ocorrencia o
      join protegido.nome_cientifico n on n.id = o.nome_cientifico_id
      join protegido.especie e on e.id = n.especie_id
      where o.id_externo = 'G3'`);
    assert.deepEqual(rows, [{ nome_recebido: "Sinteticus vetus", conciliacao: "conciliado", especie: "Sinteticus communis" }]);
  });

  test("nome não encontrado na referência fica 'nao_conciliado', sem ser descartado", async () => {
    const { rows } = await db.query("select conciliacao, nome_cientifico_id from protegido.ocorrencia where id_externo = 'G8'");
    assert.deepEqual(rows, [{ conciliacao: "nao_conciliado", nome_cientifico_id: null }]);
  });
});
