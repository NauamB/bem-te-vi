// Publica no Supabase os dados de REFERÊNCIA já validados no banco local (PGlite em dados/banco-local):
// malha municipal do IBGE e Flora e Funga do Brasil. Não publica ocorrências.
//
//   node --use-system-ca scripts/banco/publicar.mjs referencias
//
// Garantias:
//   - só grava se todas as tabelas de destino estiverem VAZIAS no remoto (nunca sobrescreve);
//   - uma única transação: qualquer falha desfaz a publicação inteira;
//   - identificadores preservados (COPY grava os valores de identidade recebidos) e sequências ajustadas;
//   - conferência por tabela: contagem e MD5 do conteúdo, local × remoto, dentro da mesma transação.
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { abrirBancoLocal } from "./local.mjs";
import { conectarRemoto } from "./remoto.mjs";

// Ordem de dependência (chaves estrangeiras).
export const TABELAS_REFERENCIA = [
  "fonte", "lote", "arquivo_original", "uf", "municipio",
  "nome_recebido", "especie", "nome_cientifico", "nome_popular_recebido", "distribuicao_recebida", "perfil_recebido",
];
const FONTES_PERMITIDAS = ["ibge-malha-municipal", "flora-funga-brasil"];

const chaveDe = (tabela) => (tabela === "fonte" ? "codigo" : ["uf", "municipio"].includes(tabela) ? "codigo_ibge" : "id");
// MD5 do conteúdo, em ordem da chave, com fuso fixo (as datas viram texto do mesmo jeito nos dois bancos).
const sqlMd5 = (tabela) => `select count(*)::int as linhas, md5(coalesce(string_agg(t::text, E'\\n' order by t.${chaveDe(tabela)}), '')) as md5 from protegido.${tabela} t`;

async function colunas(local, tabela) {
  const { rows } = await local.query(
    "select column_name from information_schema.columns where table_schema = 'protegido' and table_name = $1 order by ordinal_position", [tabela]);
  return rows.map((r) => `"${r.column_name}"`);
}

export async function publicarReferencias({ aoProgredir = () => {} } = {}) {
  const local = await abrirBancoLocal();
  const sql = conectarRemoto();
  try {
    // Pré-condições locais: só referências validadas, nenhum dado de ocorrência.
    await local.exec("set timezone = 'UTC'");
    const fontes = (await local.query("select codigo from protegido.fonte order by 1")).rows.map((r) => r.codigo);
    if (fontes.some((f) => !FONTES_PERMITIDAS.includes(f))) throw new Error(`banco local tem fontes fora das referências: ${fontes.join(", ")}`);
    const lotesNaoOk = (await local.query("select count(*)::int as n from protegido.lote where situacao <> 'ok'")).rows[0].n;
    if (lotesNaoOk) throw new Error(`${lotesNaoOk} lote(s) local(is) sem situação ok`);
    const ocorrencias = (await local.query("select count(*)::int as n from protegido.ocorrencia")).rows[0].n;
    if (ocorrencias) throw new Error("o banco local já tem ocorrências: esta publicação é só de referências");

    const locais = {};
    for (const t of TABELAS_REFERENCIA) locais[t] = (await local.query(sqlMd5(t))).rows[0];

    const resultado = await sql.begin(async (tx) => {
      await tx.unsafe("set local statement_timeout = '20min'; set local timezone = 'UTC'");
      for (const t of TABELAS_REFERENCIA) {
        const [{ n }] = await tx.unsafe(`select count(*)::int as n from protegido.${t}`);
        if (n) throw new Error(`protegido.${t} já tem ${n} linha(s) no remoto: nada foi gravado (a publicação não sobrescreve)`);
      }
      const conferencia = {};
      for (const t of TABELAS_REFERENCIA) {
        const cols = await colunas(local, t);
        const { blob } = await local.query(`copy (select ${cols.join(", ")} from protegido.${t} order by ${chaveDe(t)}) to '/dev/blob'`);
        const dados = Buffer.from(await blob.arrayBuffer());
        const destino = await tx.unsafe(`copy protegido.${t} (${cols.join(", ")}) from stdin`).writable();
        await pipeline(Readable.from([dados]), destino);
        const [remoto] = await tx.unsafe(sqlMd5(t));
        conferencia[t] = { local: locais[t].linhas, remoto: remoto.linhas, md5_confere: remoto.md5 === locais[t].md5, bytes: dados.byteLength };
        aoProgredir(t, conferencia[t]);
        if (remoto.linhas !== locais[t].linhas || remoto.md5 !== locais[t].md5) {
          throw new Error(`protegido.${t}: conteúdo remoto difere do local (linhas ${remoto.linhas}/${locais[t].linhas}, MD5 ${remoto.md5 === locais[t].md5 ? "igual" : "diferente"}); publicação desfeita`);
        }
        if (chaveDe(t) === "id") {
          await tx.unsafe(`select setval(pg_get_serial_sequence('protegido.${t}', 'id'), greatest((select max(id) from protegido.${t}), 1))`);
        }
      }
      return conferencia;
    });
    return resultado;
  } finally {
    await sql.end();
    await local.close();
  }
}

if (import.meta.main) {
  if (process.argv[2] !== "referencias") {
    console.error("uso: node --use-system-ca scripts/banco/publicar.mjs referencias");
    process.exit(2);
  }
  const inicio = Date.now();
  const r = await publicarReferencias({
    aoProgredir: (t, c) => console.log(`${t.padEnd(24)} local ${String(c.local).padStart(7)} | remoto ${String(c.remoto).padStart(7)} | MD5 ${c.md5_confere ? "confere" : "DIFERE"} | ${(c.bytes / 1e6).toFixed(1)} MB`),
  });
  console.log(`publicação concluída e confirmada em ${((Date.now() - inicio) / 1000).toFixed(0)} s (${Object.keys(r).length} tabelas).`);
}
