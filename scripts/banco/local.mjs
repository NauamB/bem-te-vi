// Banco LOCAL de desenvolvimento: PGlite + PostGIS persistido em dados/banco-local/ (ignorado pelo Git).
// Aplica as migrações de supabase/migrations/ ainda não aplicadas, registrando nome e SHA-256 de cada uma.
// Não se conecta a nenhum serviço externo.
//
// Uso: node scripts/banco/local.mjs          (cria ou atualiza o banco local e mostra o estado)
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";

export const RAIZ = join(import.meta.dirname, "..", "..");
export const PASTA_BANCO_LOCAL = join(RAIZ, "dados", "banco-local");
const PASTA_MIGRACOES = join(RAIZ, "supabase", "migrations");

export async function listarMigracoes() {
  const arquivos = (await readdir(PASTA_MIGRACOES)).filter((f) => /^\d{14}_[a-z0-9_]+\.sql$/.test(f)).sort();
  return Promise.all(
    arquivos.map(async (nome) => {
      const sql = await readFile(join(PASTA_MIGRACOES, nome), "utf8");
      return { nome, sql, sha256: createHash("sha256").update(sql).digest("hex") };
    }),
  );
}

// Aplica as migrações pendentes. Uma migração já aplicada e depois editada é erro: corrige-se com migração nova.
export async function aplicarMigracoes(db) {
  await db.exec(`
    create schema if not exists bemtevi_local;
    create table if not exists bemtevi_local.migracao (
      nome text primary key, sha256 text not null, aplicada_em timestamptz not null default now());
    revoke all on schema bemtevi_local from public;`);
  const aplicadas = new Map((await db.query("select nome, sha256 from bemtevi_local.migracao")).rows.map((r) => [r.nome, r.sha256]));
  const novas = [];
  for (const m of await listarMigracoes()) {
    if (aplicadas.has(m.nome)) {
      if (aplicadas.get(m.nome) !== m.sha256) throw new Error(`migração ${m.nome} foi alterada depois de aplicada`);
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.exec(m.sql);
      await tx.query("insert into bemtevi_local.migracao (nome, sha256) values ($1, $2)", [m.nome, m.sha256]);
    });
    novas.push(m.nome);
  }
  return novas;
}

export async function abrirBancoLocal() {
  await mkdir(PASTA_BANCO_LOCAL, { recursive: true });
  const db = await PGlite.create({ dataDir: PASTA_BANCO_LOCAL, extensions: { postgis } });
  await aplicarMigracoes(db);
  return db;
}

if (import.meta.main) {
  const db = await abrirBancoLocal();
  const { rows } = await db.query("select nome, aplicada_em from bemtevi_local.migracao order by nome");
  console.log(`banco local: ${PASTA_BANCO_LOCAL}`);
  for (const r of rows) console.log(`  aplicada  ${r.nome}  (${r.aplicada_em.toISOString()})`);
  const contagens = await db.query(`
    select 'municípios' as item, count(*)::int as n from protegido.municipio
    union all select 'ocorrências', count(*)::int from protegido.ocorrencia
    union all select 'nomes científicos', count(*)::int from protegido.nome_cientifico`);
  for (const c of contagens.rows) console.log(`  ${c.item}: ${c.n}`);
  await db.close();
}
