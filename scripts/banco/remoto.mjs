// Banco REMOTO (Supabase): inspeção SOMENTE LEITURA, antes de qualquer migração.
//
//   node --use-system-ca scripts/banco/remoto.mjs inspecionar
//
// Conexão: SUPABASE_DB_URL (string do pooler de sessão, com senha), lida do ambiente ou de .env.local
// (ignorado pelo Git). A string nunca é impressa.
// TLS com verificação COMPLETA: cadeia validada só pela raiz oficial do Supabase (SUPABASE_CA_CERT, padrão
// prod-ca-2021.crt na raiz do projeto, SHA-256 conferido abaixo) e nome do servidor conferido. Falha de TLS é erro.
// Todas as consultas rodam numa transação READ ONLY.
import { X509Certificate } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";
import { listarMigracoes } from "./local.mjs";

const RAIZ = join(import.meta.dirname, "..", "..");
// Impressão digital da "Supabase Root 2021 CA", conferida em 16/11/2026 contra a cadeia apresentada pelo pooler
// e contra o certificado baixado do painel do projeto.
const SHA256_RAIZ_SUPABASE = "80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA";

export function certificadoSupabase() {
  const caminho = join(RAIZ, process.env.SUPABASE_CA_CERT ?? "prod-ca-2021.crt");
  if (!existsSync(caminho)) throw new Error(`certificado raiz do Supabase não encontrado em ${caminho}`);
  const pem = readFileSync(caminho);
  const impressao = new X509Certificate(pem).fingerprint256;
  if (impressao !== SHA256_RAIZ_SUPABASE) throw new Error(`certificado em ${caminho} não é a raiz esperada do Supabase (SHA-256 ${impressao})`);
  return pem;
}

export function conectarRemoto() {
  const local = join(RAIZ, ".env.local");
  if (existsSync(local)) process.loadEnvFile(local);
  const url = process.env.SUPABASE_DB_URL;
  if (!url) throw new Error("defina SUPABASE_DB_URL no .env.local (ignorado pelo Git); ver .env.example");
  const servidor = new URL(url).hostname;
  return postgres(url, {
    ssl: { ca: certificadoSupabase(), rejectUnauthorized: true, servername: servidor },
    max: 1,
    prepare: false,
    idle_timeout: 5,
    connect_timeout: 20,
    onnotice: () => {},
  });
}

export async function inspecionar(sql) {
  return sql.begin("read only", async (tx) => {
    const [servidor] = await tx`select version() as versao, current_setting('server_version_num')::int as versao_num,
      current_user as usuario, current_database() as banco, current_setting('transaction_read_only') as somente_leitura`;
    const extensoes = await tx`select name, default_version, installed_version,
      (select n.nspname from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = a.name) as schema
      from pg_available_extensions a where name in ('postgis', 'pg_trgm', 'unaccent', 'pgcrypto', 'uuid-ossp') order by name`;
    const schemas = await tx`select n.nspname as schema,
        (select count(*)::int from pg_class c where c.relnamespace = n.oid and c.relkind in ('r', 'p')) as tabelas,
        (select count(*)::int from pg_class c where c.relnamespace = n.oid and c.relkind in ('v', 'm')) as views,
        (select count(*)::int from pg_proc p where p.pronamespace = n.oid) as funcoes
      from pg_namespace n
      where n.nspname not like 'pg\\_%' and n.nspname <> 'information_schema'
      order by 1`;
    const tabelasUsuario = await tx`select n.nspname as schema, c.relname as tabela, c.reltuples::bigint as linhas_estimadas
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where c.relkind in ('r', 'p') and n.nspname in ('public', 'protegido', 'publico', 'bemtevi_local')
      order by 1, 2`;
    const papeis = await tx`select rolname, rolcanlogin, rolsuper, rolcreaterole, rolbypassrls from pg_roles
      where rolname in ('bemtevi_leitura', 'postgres', 'anon', 'authenticated', 'service_role', 'authenticator') order by 1`;
    const [eu] = await tx`select rolsuper, rolcreaterole, rolcreatedb, rolbypassrls from pg_roles where rolname = current_user`;
    const api = await tx`select unnest(rolconfig) as config from pg_roles where rolname = 'authenticator'`;
    const temMigracoes = (await tx`select to_regclass('supabase_migrations.schema_migrations') is not null as existe`)[0].existe;
    const migracoes = temMigracoes ? await tx`select version, name from supabase_migrations.schema_migrations order by version` : [];
    const temBuckets = (await tx`select to_regclass('storage.buckets') is not null as existe`)[0].existe;
    const buckets = temBuckets ? await tx`select id, public from storage.buckets order by id` : [];
    const [srid] = await tx`select exists (select 1 from pg_extension where extname = 'postgis') as postgis_instalado`;
    const [tamanho] = await tx`select pg_size_pretty(pg_database_size(current_database())) as tamanho_banco`;
    return { servidor, papel_atual: eu, extensoes, schemas, tabelas_de_usuario: tabelasUsuario, papeis, configuracao_api: api.map((a) => a.config),
      migracoes_supabase: migracoes, buckets, ...srid, ...tamanho };
  });
}

// Histórico no formato da CLI do Supabase: supabase_migrations.schema_migrations (version, statements, name).
// version = prefixo de 14 dígitos do arquivo; name = restante do nome; statements = o arquivo inteiro.
const separarNome = (arquivo) => {
  const [, version, name] = arquivo.match(/^(\d{14})_(.+)\.sql$/);
  return { version, name };
};

// Aplica, em ordem, as migrações ainda não registradas. Cada uma numa transação própria: se falhar,
// é desfeita por inteiro e o processo para, sem aplicar as seguintes.
export async function migrar(sql, { aoAplicar = () => {} } = {}) {
  await sql.begin(async (tx) => {
    await tx.unsafe(`create schema if not exists supabase_migrations;
      create table if not exists supabase_migrations.schema_migrations (version text not null primary key, statements text[], name text);`);
  });
  const registradas = new Set((await sql`select version from supabase_migrations.schema_migrations`).map((r) => r.version));
  const aplicadas = [];
  for (const m of await listarMigracoes()) {
    const { version, name } = separarNome(m.nome);
    if (registradas.has(version)) continue;
    try {
      await sql.begin(async (tx) => {
        await tx.unsafe("set local statement_timeout = '5min'");
        await tx.unsafe(m.sql);
        await tx`insert into supabase_migrations.schema_migrations (version, name, statements) values (${version}, ${name}, ${[m.sql]})`;
      });
    } catch (erro) {
      throw new Error(`migração ${m.nome} falhou e foi desfeita; nenhuma migração seguinte foi aplicada: ${erro.message}`);
    }
    aplicadas.push({ nome: m.nome, sha256: m.sha256 });
    aoAplicar(m);
  }
  return aplicadas;
}

// Testes de permissão e de proteção, somente leitura. SET ROLE dentro de transação READ ONLY.
export async function validarPermissoes(sql) {
  return sql.begin("read only", async (tx) => {
    const resultados = [];
    // Cada tentativa num savepoint do cliente: a falha esperada desfaz só a tentativa (e o SET LOCAL ROLE).
    const tentar = async (papel, alvo) => {
      try {
        await tx.savepoint(async (sp) => {
          await sp.unsafe(`set local role ${papel}`);
          await sp.unsafe(`select * from ${alvo} limit 1`);
          throw new Error("__permitido__");
        });
      } catch (erro) {
        if (erro.message === "__permitido__") return "permitido";
        return /permission denied/.test(erro.message) ? "negado" : `erro: ${erro.message}`;
      }
    };
    const tabelas = (await tx`select 'protegido.' || tablename as alvo from pg_tables where schemaname = 'protegido' order by 1`).map((r) => r.alvo);
    const views = (await tx`select 'publico.' || viewname as alvo from pg_views where schemaname = 'publico' order by 1`).map((r) => r.alvo);
    for (const papel of ["anon", "authenticated"]) {
      for (const alvo of [...tabelas, ...views]) resultados.push({ papel, alvo, resultado: await tentar(papel, alvo) });
    }
    const podeAssumirLeitura = (await tx`select pg_has_role(current_user, 'bemtevi_leitura', 'SET') as pode`)[0].pode;
    if (podeAssumirLeitura) {
      for (const alvo of [...tabelas, ...views]) resultados.push({ papel: "bemtevi_leitura", alvo, resultado: await tentar("bemtevi_leitura", alvo) });
    }
    const colunasPublicas = await tx`select table_name, column_name, udt_name from information_schema.columns where table_schema = 'publico' order by 1, 2`;
    const suspeitas = colunasPublicas.filter((c) => /(^|_)(lat|latitude|lon|lng|long|longitude)(_|$)|coord|verbatim|localidade|locality|^x$|^y$|geom_precis/i.test(c.column_name));
    const geometrias = colunasPublicas.filter((c) => c.udt_name === "geometry").map((c) => `${c.table_name}.${c.column_name}`);
    return { resultados, pode_assumir_bemtevi_leitura: podeAssumirLeitura, colunas_publicas_suspeitas: suspeitas, colunas_geometria_publicas: geometrias };
  });
}

if (import.meta.main) {
  const comando = process.argv[2];
  if (!["inspecionar", "migrar", "validar"].includes(comando)) {
    console.error("uso: node scripts/banco/remoto.mjs inspecionar | migrar | validar");
    process.exit(2);
  }
  const sql = conectarRemoto();
  try {
    if (comando === "inspecionar") {
      const estado = await inspecionar(sql);
      const locais = (await listarMigracoes()).map((m) => m.nome);
      console.log(JSON.stringify({ ...estado, migracoes_locais: locais }, null, 2));
    } else if (comando === "migrar") {
      const aplicadas = await migrar(sql, { aoAplicar: (m) => console.log(`aplicada: ${m.nome}  sha256 ${m.sha256}`) });
      console.log(`${aplicadas.length} migração(ões) aplicada(s).`);
    } else {
      const { estrutura, comparar, contagens } = await import("./estrutura.mjs");
      const { PGlite } = await import("@electric-sql/pglite");
      const { postgis } = await import("@electric-sql/pglite-postgis");
      const { aplicarMigracoes } = await import("./local.mjs");
      // Referência: banco local novo, com os mesmos papéis da API do Supabase, só com as migrações.
      const local = await PGlite.create({ extensions: { postgis } });
      await local.exec("create role anon nologin; create role authenticated nologin;");
      await aplicarMigracoes(local);
      const eLocal = await estrutura(async (q) => (await local.query(q)).rows);
      const eRemoto = await sql.begin("read only", (tx) => estrutura((q) => tx.unsafe(q.startsWith("set ") ? q.replace("set ", "set local ") : q)));
      await local.close();
      const historico = await sql`select version, name, array_length(statements, 1) as partes from supabase_migrations.schema_migrations order by version`;
      const [extensao] = await sql`select extversion from pg_extension where extname = 'postgis'`;
      const [tamanho] = await sql`select pg_size_pretty(pg_database_size(current_database())) as t`;
      console.log(JSON.stringify({
        historico, postgis: extensao?.extversion ?? null, tamanho_banco: tamanho.t,
        contagens_local: contagens(eLocal), contagens_remoto: contagens(eRemoto), diferencas: comparar(eLocal, eRemoto),
        permissoes: await validarPermissoes(sql),
      }, null, 2));
    }
  } finally {
    await sql.end();
  }
}
