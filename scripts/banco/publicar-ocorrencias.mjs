// Publicador de ocorrências — Cenário B (Fase 11.5.1): leva de um banco de ORIGEM (o banco local, arquivo completo)
// para um DESTINO (o Supabase) só os registros dos conjuntos de dados APROVADOS de um download do GBIF.
// O banco local continua com tudo: originais, rejeitados, pendentes de revisão.
//
//   node scripts/banco/publicar-ocorrencias.mjs plano <chave-do-download> [--dados <pasta PGlite>]
//        mostra o que seria publicado (tabelas, linhas, bytes), só lendo a origem. Não conecta ao Supabase.
//   node scripts/banco/publicar-ocorrencias.mjs publicar <chave-do-download>
//        BLOQUEADO nesta fase (PUBLICACAO_REMOTA_LIBERADA = false): publicação real exige autorização expressa
//        e mudança revisada deste arquivo.
//
// Garantias de publicarLote():
//   - pré-condições só de leitura: mesmas migrações (nome e SHA-256) na origem e no destino; lote ainda não
//     publicado; dependências já presentes no destino (municípios, espécies, nomes) IDÊNTICAS às da origem (MD5);
//     espaço: tamanho atual + estimativa abaixo do limite;
//   - uma única transação no destino: qualquer falha desfaz tudo (inclusive interrupção da conexão);
//   - identificadores preservados (COPY grava os ids recebidos); sequências ajustadas;
//   - após cada tabela, contagem e MD5 do conteúdo, origem × destino, na mesma transação;
//   - no fim, a camada pública do lote no destino tem de ser idêntica à da origem; o tamanho, abaixo do limite;
//   - a proteção (lista de referência e espécies sensíveis) entra na MESMA transação das ocorrências.
import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const PUBLICACAO_REMOTA_LIBERADA = false;
export const LIMITE_PADRAO_BYTES = 450e6;
const FATOR_ESTIMATIVA = 1.4; // dados + índices, sobre pg_column_size das linhas

const inteiros = (valores) => {
  const lista = valores.map(Number);
  if (!lista.every(Number.isSafeInteger)) throw new Error("identificador não inteiro na montagem do plano");
  return lista.length ? lista.join(", ") : "null";
};
const textos = (valores) => (valores.length ? valores.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(", ") : "null");

// ---------------------------------------------------------------------------------------------
// Adaptadores
// ---------------------------------------------------------------------------------------------
export function origemPglite(db) {
  return {
    consultar: async (texto, parametros = []) => (await db.query(texto, parametros)).rows,
    // COPY sem linhas não devolve blob no PGlite: vale como conteúdo vazio.
    exportar: async (select) => {
      const { blob } = await db.query(`copy (${select}) to '/dev/blob'`);
      return blob ? Buffer.from(await blob.arrayBuffer()) : Buffer.alloc(0);
    },
    migracoes: async () => (await db.query("select nome, sha256 from bemtevi_local.migracao order by nome")).rows,
  };
}

const transacaoPglite = (tx) => ({
  consultar: async (texto, parametros = []) => (await tx.query(texto, parametros)).rows,
  importar: async (tabela, colunas, dados) => {
    await tx.query(`copy protegido.${tabela} (${colunas}) from '/dev/blob'`, [], { blob: new Blob([dados]) });
  },
  bruto: tx,
});

export function destinoPglite(db) {
  return {
    consultar: async (texto, parametros = []) => (await db.query(texto, parametros)).rows,
    migracoes: async () => (await db.query("select nome, sha256 from bemtevi_local.migracao order by nome")).rows,
    transacao: (fn) => db.transaction((tx) => fn(transacaoPglite(tx))),
  };
}

// Supabase (cliente `postgres`, conexão de conectarRemoto). Histórico no formato da CLI do Supabase.
export function destinoRemoto(sql) {
  return {
    consultar: (texto, parametros = []) => sql.unsafe(texto, parametros),
    migracoes: async () =>
      (await sql`select version, name, statements from supabase_migrations.schema_migrations order by version`).map((m) => ({
        nome: `${m.version}_${m.name}.sql`,
        sha256: createHash("sha256").update(m.statements?.[0] ?? "").digest("hex"),
      })),
    transacao: (fn) =>
      sql.begin((tx) =>
        fn({
          consultar: (texto, parametros = []) => tx.unsafe(texto, parametros),
          importar: async (tabela, colunas, dados) => pipeline(Readable.from([dados]), await tx.unsafe(`copy protegido.${tabela} (${colunas}) from stdin`).writable()),
          bruto: tx,
        }),
      ),
  };
}

// ---------------------------------------------------------------------------------------------
// Plano: o que sai da origem, tabela por tabela, em ordem de dependência
// ---------------------------------------------------------------------------------------------
// modo "novo": nenhuma linha pode existir no destino. "compartilhado": linhas já publicadas por outro lote
// (fonte, conjunto, revisões) têm de ser idênticas; só as que faltam são copiadas.
export async function planejar(origem, chave) {
  const [lote] = await origem.consultar(
    "select id, situacao from protegido.lote where fonte_codigo = 'gbif' and versao_fonte = $1", [chave]);
  if (!lote) throw new Error(`download ${chave} não está carregado na origem`);
  if (lote.situacao !== "ok") throw new Error(`lote ${lote.id} com situação ${lote.situacao}`);
  const L = Number(lote.id);
  const loteTaxonomia = (await origem.consultar(
    "select id from protegido.lote where fonte_codigo = 'gbif-taxonomia' and filtros->>'download' = $1", [chave]))[0];
  const LT = loteTaxonomia ? Number(loteTaxonomia.id) : null;
  const aprovados = (await origem.consultar(
    `select distinct r.conjunto_id from protegido.ocorrencia_recebida r
     join protegido.revisao_vigente rv on rv.conjunto_id = r.conjunto_id and rv.decisao = 'aprovado'
     where r.lote_id = $1 order by 1`, [L])).map((r) => Number(r.conjunto_id));
  if (!aprovados.length) throw new Error(`nenhum conjunto aprovado no lote ${L}: nada a publicar`);
  const lotes = inteiros(LT ? [L, LT] : [L]);
  const conj = inteiros(aprovados);
  const deOcorrencias = `lote_id = ${L} and conjunto_id in (${conj})`;
  const fontes = (await origem.consultar(`select distinct fonte_codigo from protegido.lote where id in (${lotes})`)).map((f) => f.fonte_codigo);

  const tabelas = [
    { tabela: "fonte", onde: `codigo in (${textos(fontes)})`, ordem: "codigo", modo: "compartilhado" },
    { tabela: "lote", onde: `id in (${lotes})`, ordem: "id", modo: "novo" },
    { tabela: "arquivo_original", onde: `lote_id in (${lotes})`, ordem: "id", modo: "novo" },
    { tabela: "conjunto_dados", onde: `id in (${conj})`, ordem: "id", modo: "compartilhado" },
    { tabela: "revisao_conjunto", onde: `conjunto_id in (${conj})`, ordem: "id", modo: "compartilhado" },
    ...(LT
      ? ["nome_recebido", "especie", "nome_cientifico"].map((tabela) => ({ tabela, onde: `lote_id = ${LT}`, ordem: "id", modo: "novo" }))
      : []),
    { tabela: "ocorrencia_recebida", onde: deOcorrencias, ordem: "id", modo: "novo" },
    { tabela: "lista_referencia", onde: `lote_id = ${L}`, ordem: "id", modo: "novo" },
    // Toda a proteção do lote (nível de espécie, conservadora), inclusive de espécies vistas só em conjuntos pendentes.
    { tabela: "taxon_sensivel", onde: `lista_id in (select id from protegido.lista_referencia where lote_id = ${L})`, ordem: "especie_id, lista_id", modo: "novo" },
    { tabela: "ocorrencia", onde: deOcorrencias, ordem: "id", modo: "novo" },
    { tabela: "ocorrencia_municipio", onde: `ocorrencia_id in (select id from protegido.ocorrencia where ${deOcorrencias})`, ordem: "ocorrencia_id", modo: "novo" },
  ];

  // Dependências que NÃO são copiadas (já devem estar no destino, idênticas): referências taxonômica e territorial.
  const foraDoLote = LT ? `and lote_id <> ${LT}` : "";
  const nomes = (await origem.consultar(
    `select distinct nome_cientifico_id as id from protegido.ocorrencia where ${deOcorrencias} and nome_cientifico_id is not null
     and nome_cientifico_id in (select id from protegido.nome_cientifico where true ${foraDoLote})`)).map((r) => r.id);
  const especies = (await origem.consultar(
    `select distinct especie_id as id from (
       select especie_id from protegido.nome_cientifico where id in (${inteiros(nomes)})
       union select especie_id from protegido.taxon_sensivel where lista_id in (select id from protegido.lista_referencia where lote_id = ${L})
     ) x where especie_id is not null and especie_id in (select id from protegido.especie where true ${foraDoLote})`)).map((r) => r.id);
  const municipios = (await origem.consultar(
    `select distinct municipio_codigo as codigo from protegido.ocorrencia_municipio
     where ocorrencia_id in (select id from protegido.ocorrencia where ${deOcorrencias})`)).map((r) => r.codigo);
  const dependencias = [
    { tabela: "nome_cientifico", onde: `id in (${inteiros(nomes)})`, ordem: "id", linhas: nomes.length },
    { tabela: "especie", onde: `id in (${inteiros(especies)})`, ordem: "id", linhas: especies.length },
    { tabela: "municipio", onde: `codigo_ibge in (${textos(municipios)})`, ordem: "codigo_ibge", linhas: municipios.length },
  ];
  return { chave, lote: L, loteTaxonomia: LT, conjuntosAprovados: aprovados, tabelas, dependencias };
}

const sqlMd5 = (t) =>
  `select count(*)::int as linhas, md5(coalesce(string_agg(t::text, E'\\n' order by ${t.ordem.split(",").map((c) => `t.${c.trim()}`).join(", ")}), '')) as md5
   from (select * from protegido.${t.tabela} where ${t.onde}) t`;
const sqlBytes = (t) => `select coalesce(sum(pg_column_size(t.*)), 0)::bigint as bytes from (select * from protegido.${t.tabela} where ${t.onde}) t`;
const sqlTamanho = "select pg_database_size(current_database())::bigint as bytes";
const SQL_PUBLICO = (L) =>
  `select count(*)::int as linhas, md5(coalesce(string_agg(t::text, E'\\n' order by t.id), '')) as md5
   from (select id, especie_id, protecao, municipio_codigo, celula, licenca_efetiva, url_origem, data_evento, conjunto_id from publico.ocorrencia where lote_id = ${L}) t`;

async function colunas(consultar, tabela) {
  return (await consultar(
    "select column_name from information_schema.columns where table_schema = 'protegido' and table_name = $1 order by ordinal_position", [tabela]))
    .map((c) => `"${c.column_name}"`).join(", ");
}

// Só leitura na origem: linhas, MD5 e bytes por tabela do plano.
export async function medirPlano(origem, plano) {
  await origem.consultar("set timezone = 'UTC'");
  const medidas = {};
  for (const t of plano.tabelas) medidas[t.tabela] = { ...(await origem.consultar(sqlMd5(t)))[0], bytes: Number((await origem.consultar(sqlBytes(t)))[0].bytes) };
  return medidas;
}

// ---------------------------------------------------------------------------------------------
// Publicação
// ---------------------------------------------------------------------------------------------
export async function publicarLote(origem, destino, chave, { limiteBytes = LIMITE_PADRAO_BYTES, fatorEstimativa = FATOR_ESTIMATIVA, aoCopiar = async () => {}, aoProgredir = () => {} } = {}) {
  // 1. Pré-condições, só leitura.
  const [mo, md] = [await origem.migracoes(), await destino.migracoes()];
  const assinatura = (ms) => ms.map((m) => `${m.nome}:${m.sha256}`).join("\n");
  if (assinatura(mo) !== assinatura(md)) throw new Error("migrações diferentes entre origem e destino: aplique as mesmas migrações antes de publicar");
  const plano = await planejar(origem, chave);
  const medidas = await medirPlano(origem, plano);
  await destino.consultar("set timezone = 'UTC'");
  const jaPublicado = await destino.consultar(`select id from protegido.lote where id = ${plano.lote} or (fonte_codigo = 'gbif' and versao_fonte = $1)`, [chave]);
  if (jaPublicado.length) throw new Error(`download ${chave} ou o lote ${plano.lote} já existe no destino (lote ${jaPublicado[0].id}): nada foi gravado`);
  for (const d of plano.dependencias) {
    const [a, b] = [(await origem.consultar(sqlMd5(d)))[0], (await destino.consultar(sqlMd5(d)))[0]];
    if (a.linhas !== d.linhas || b.linhas !== a.linhas || b.md5 !== a.md5) {
      throw new Error(`dependência protegido.${d.tabela} difere no destino (linhas ${b.linhas}/${a.linhas}): publique as referências idênticas antes`);
    }
  }
  for (const t of plano.tabelas.filter((x) => x.modo === "novo")) {
    const [{ linhas }] = await destino.consultar(`select count(*)::int as linhas from protegido.${t.tabela} where ${t.onde}`);
    if (linhas) throw new Error(`protegido.${t.tabela} já tem ${linhas} linha(s) deste lote no destino: nada foi gravado`);
  }
  const estimativa = Object.values(medidas).reduce((s, m) => s + m.bytes, 0) * fatorEstimativa;
  const tamanhoAntes = Number((await destino.consultar(sqlTamanho))[0].bytes);
  if (tamanhoAntes + estimativa > limiteBytes) {
    throw new Error(`espaço insuficiente: ${(tamanhoAntes / 1e6).toFixed(1)} MB + ~${(estimativa / 1e6).toFixed(1)} MB passaria do limite de ${(limiteBytes / 1e6).toFixed(0)} MB`);
  }
  const [publicoOrigem] = await origem.consultar(SQL_PUBLICO(plano.lote));

  // 2. Uma transação no destino.
  const tabelas = await destino.transacao(async (tx) => {
    await tx.consultar("set local timezone = 'UTC'");
    await tx.consultar("set local statement_timeout = '20min'");
    const resultado = {};
    for (const t of plano.tabelas) {
      const cols = await colunas(origem.consultar, t.tabela);
      if (cols !== (await colunas(tx.consultar, t.tabela))) throw new Error(`colunas de protegido.${t.tabela} diferem entre origem e destino`);
      let onde = t.onde;
      if (t.modo === "compartilhado") {
        // Linhas já publicadas: têm de ser idênticas às da origem; só as ausentes serão copiadas.
        const chaveCol = t.ordem;
        const existentes = (await tx.consultar(`select ${chaveCol} as k from protegido.${t.tabela} where ${t.onde}`)).map((r) => r.k);
        if (existentes.length) {
          const lista = t.tabela === "fonte" ? textos(existentes) : inteiros(existentes);
          const parte = { ...t, onde: `${t.onde} and ${chaveCol} in (${lista})` };
          const [a, b] = [(await origem.consultar(sqlMd5(parte)))[0], (await tx.consultar(sqlMd5(parte)))[0]];
          if (a.linhas !== b.linhas || a.md5 !== b.md5) throw new Error(`protegido.${t.tabela}: linhas já publicadas diferem da origem; publicação desfeita`);
          onde = `${t.onde} and ${chaveCol} not in (${lista})`;
        }
      }
      const dados = await origem.exportar(`select ${cols} from protegido.${t.tabela} where ${onde} order by ${t.ordem}`);
      if (dados.byteLength) await tx.importar(t.tabela, cols, dados);
      await aoCopiar(t.tabela, tx);
      const [b] = await tx.consultar(sqlMd5(t));
      const a = medidas[t.tabela];
      if (a.linhas !== b.linhas || a.md5 !== b.md5) throw new Error(`protegido.${t.tabela}: destino difere da origem (linhas ${b.linhas}/${a.linhas}, MD5 ${a.md5 === b.md5 ? "igual" : "diferente"}); publicação desfeita`);
      if (cols.startsWith('"id"')) {
        await tx.consultar(`select setval(pg_get_serial_sequence('protegido.${t.tabela}', 'id'), greatest((select max(id) from protegido.${t.tabela}), 1))`);
      }
      resultado[t.tabela] = { linhas: b.linhas, md5: b.md5, copiadas_agora: dados.byteLength ? dados.toString("utf8").split("\n").filter(Boolean).length : 0 };
      aoProgredir(t.tabela, resultado[t.tabela]);
    }
    // Conferências finais, ainda dentro da transação.
    const vigentes = await tx.consultar(`select conjunto_id, decisao from protegido.revisao_vigente where conjunto_id in (${inteiros(plano.conjuntosAprovados)})`);
    if (vigentes.length !== plano.conjuntosAprovados.length || vigentes.some((v) => v.decisao !== "aprovado")) {
      throw new Error("revisão vigente no destino não é 'aprovado' para todos os conjuntos publicados; publicação desfeita");
    }
    const [publicoDestino] = await tx.consultar(SQL_PUBLICO(plano.lote));
    if (publicoDestino.linhas !== publicoOrigem.linhas || publicoDestino.md5 !== publicoOrigem.md5) {
      throw new Error(`camada pública do lote difere da origem (${publicoDestino.linhas}/${publicoOrigem.linhas}); publicação desfeita`);
    }
    const tamanhoDepois = Number((await tx.consultar(sqlTamanho))[0].bytes);
    if (tamanhoDepois > limiteBytes) throw new Error(`limite de ${(limiteBytes / 1e6).toFixed(0)} MB ultrapassado (${(tamanhoDepois / 1e6).toFixed(1)} MB); publicação desfeita`);
    return { ...resultado, _publico: { linhas: publicoDestino.linhas, md5: publicoDestino.md5 }, _tamanho_depois: tamanhoDepois };
  });
  const { _publico, _tamanho_depois, ...porTabela } = tabelas;
  return {
    download: chave, lote: plano.lote, lote_taxonomia: plano.loteTaxonomia, conjuntos_aprovados: plano.conjuntosAprovados,
    tabelas: porTabela, camada_publica: _publico, tamanho_antes: tamanhoAntes, tamanho_depois: _tamanho_depois, estimativa_bytes: Math.round(estimativa),
  };
}

// ---------------------------------------------------------------------------------------------
// Linha de comando
// ---------------------------------------------------------------------------------------------
if (import.meta.main) {
  const [comando, chave] = process.argv.slice(2);
  const i = process.argv.indexOf("--dados");
  if (comando === "plano" && chave) {
    const { PGlite } = await import("@electric-sql/pglite");
    const { postgis } = await import("@electric-sql/pglite-postgis");
    const { PASTA_BANCO_LOCAL } = await import("./local.mjs");
    // Abre a origem SEM aplicar migrações e só lê (transação read only).
    const db = await PGlite.create({ dataDir: i > 0 ? process.argv[i + 1] : PASTA_BANCO_LOCAL, extensions: { postgis } });
    try {
      await db.exec("begin read only");
      const origem = origemPglite(db);
      const plano = await planejar(origem, chave);
      const medidas = await medirPlano(origem, plano);
      const total = Object.values(medidas).reduce((s, m) => s + m.bytes, 0);
      console.log(JSON.stringify({
        download: chave, lote: plano.lote, lote_taxonomia: plano.loteTaxonomia, conjuntos_aprovados: plano.conjuntosAprovados.length,
        tabelas: Object.fromEntries(Object.entries(medidas).map(([t, m]) => [t, { linhas: m.linhas, mb: +(m.bytes / 1e6).toFixed(2) }])),
        dependencias_no_destino: Object.fromEntries(plano.dependencias.map((d) => [d.tabela, d.linhas])),
        estimativa_mb: +((total * FATOR_ESTIMATIVA) / 1e6).toFixed(1),
      }, null, 2));
      await db.exec("rollback");
    } finally {
      await db.close();
    }
  } else if (comando === "publicar") {
    if (!PUBLICACAO_REMOTA_LIBERADA) {
      console.error("publicação remota BLOQUEADA nesta fase (Fase 11.5.1): exige autorização expressa e alteração revisada de PUBLICACAO_REMOTA_LIBERADA.");
      process.exit(3);
    }
  } else {
    console.error("uso: node scripts/banco/publicar-ocorrencias.mjs plano <chave-do-download> [--dados <pasta>] | publicar <chave-do-download>");
    process.exit(2);
  }
}
