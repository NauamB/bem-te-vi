// Acesso de LEITURA do site ao banco (Supabase), exclusivo do servidor.
//
// - Conexão: BANCO_LEITURA_URL (variável de servidor; nunca NEXT_PUBLIC_), com o papel de login do site,
//   membro de bemtevi_leitura, que só lê as views do schema publico. Usuário administrador é recusado.
// - TLS com verificação completa pela raiz do Supabase (certificado-supabase.ts) e nome do servidor conferido.
// - Toda consulta roda numa transação READ ONLY, com tempo máximo. O pooler em modo transação exige prepare: false.
import "server-only";
import { X509Certificate } from "node:crypto";
import postgres from "postgres";
import { CERTIFICADO_RAIZ_SUPABASE, SHA256_RAIZ_SUPABASE } from "./certificado-supabase.ts";
import { ErroBancoIndisponivel, type Consultar, type Linha } from "./tipos.ts";

const USUARIOS_PROIBIDOS = new Set(["postgres", "supabase_admin", "service_role", "authenticator"]);
let cliente: ReturnType<typeof postgres> | null = null;

function obterCliente() {
  if (cliente) return cliente;
  const url = process.env.BANCO_LEITURA_URL?.trim();
  if (!url) throw new ErroBancoIndisponivel("banco de leitura não configurado");
  const endereco = new URL(url);
  // No pooler do Supabase o usuário vem como "<papel>.<referência do projeto>".
  const papel = decodeURIComponent(endereco.username).split(".")[0];
  if (USUARIOS_PROIBIDOS.has(papel)) throw new Error("BANCO_LEITURA_URL deve usar o papel de leitura do site, nunca um usuário administrador");
  if (new X509Certificate(CERTIFICADO_RAIZ_SUPABASE).fingerprint256 !== SHA256_RAIZ_SUPABASE) throw new Error("certificado raiz do Supabase inesperado");
  cliente = postgres(url, {
    ssl: { ca: CERTIFICADO_RAIZ_SUPABASE, rejectUnauthorized: true, servername: endereco.hostname },
    max: 1,
    prepare: false,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: "bem-te-vi-site" },
    onnotice: () => {},
  });
  return cliente;
}

// Erro com SQLSTATE (5 caracteres) veio do banco; sem ele, é falha de rede ou de conexão.
const ehErroDoBanco = (erro: unknown) => typeof (erro as { code?: unknown })?.code === "string" && /^[0-9A-Z]{5}$/.test((erro as { code: string }).code);

export const consultarPublico: Consultar = async (texto, parametros = []) => {
  const sql = obterCliente();
  try {
    return await sql.begin("read only", async (tx) => {
      await tx.unsafe("set local statement_timeout = '8s'");
      return (await tx.unsafe(texto, parametros as never[])) as unknown as Linha[];
    });
  } catch (erro) {
    if (erro instanceof ErroBancoIndisponivel || ehErroDoBanco(erro)) throw erro;
    throw new ErroBancoIndisponivel("banco de leitura indisponível");
  }
};
