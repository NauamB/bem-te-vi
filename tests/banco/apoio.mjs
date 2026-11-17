// Apoio dos testes do banco: cria um PostgreSQL + PostGIS em memória (PGlite), aplica as migrações versionadas
// e, quando pedido, carrega os dados SINTÉTICOS de teste. Nada aqui acessa rede, Supabase ou dados reais.
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { postgis } from "@electric-sql/pglite-postgis";
import { aplicarMigracoes } from "../../scripts/banco/local.mjs";

export { listarMigracoes } from "../../scripts/banco/local.mjs";
const ARQUIVO_SINTETICOS = join(import.meta.dirname, "fixtures", "sinteticos.sql");

// Banco novo em memória, com os papéis da API do Supabase emulados (anon, authenticated), como no projeto real.
// As migrações são aplicadas pelo mesmo código do banco local (scripts/banco/local.mjs).
export async function criarBanco({ sinteticos = false } = {}) {
  const db = await PGlite.create({ extensions: { postgis } });
  await db.exec("create role anon nologin; create role authenticated nologin;");
  await aplicarMigracoes(db);
  if (sinteticos) await db.exec(await readFile(ARQUIVO_SINTETICOS, "utf8"));
  return db;
}

// Banco em disco (pasta temporária) migrado numa sessão, FECHADO e reaberto: a sessão devolvida é nova, sem o
// search_path que as migrações deixam na sessão que as aplicou, como no `carregar` real (Fase 11.4.4D).
// A pasta é apagada no close().
export async function criarBancoEmSessaoNova({ sinteticos = false } = {}) {
  const pasta = await mkdtemp(join(tmpdir(), "bemtevi-sessao-"));
  const preparo = await PGlite.create({ dataDir: pasta, extensions: { postgis } });
  await preparo.exec("create role anon nologin; create role authenticated nologin;");
  await aplicarMigracoes(preparo);
  if (sinteticos) await preparo.exec(await readFile(ARQUIVO_SINTETICOS, "utf8"));
  await preparo.close();
  const db = await PGlite.create({ dataDir: pasta, extensions: { postgis } });
  const fechar = db.close.bind(db);
  db.close = async () => {
    await fechar();
    await rm(pasta, { recursive: true, force: true });
  };
  return db;
}

// Executa como outro papel e sempre volta ao dono, mesmo em caso de erro.
export async function comoPapel(db, papel, sql) {
  await db.exec(`set role ${papel}`);
  try {
    return await db.query(sql);
  } finally {
    await db.exec("reset role");
  }
}

// Mensagem do erro lançado por `fn`, ou null se não houve erro.
export async function erroDe(fn) {
  try {
    await fn();
    return null;
  } catch (erro) {
    return erro.message;
  }
}
