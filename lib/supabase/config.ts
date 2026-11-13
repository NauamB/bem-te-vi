// Leitura da configuração PÚBLICA do Supabase (URL do projeto e chave publicável).
// Nenhum cliente Supabase é criado nesta fase e nenhuma biblioteca do Supabase está instalada.
// A chave secreta (service_role / sb_secret_…) nunca é lida aqui: ela ignora o RLS e só poderá existir
// em código de servidor e em rotinas de ingestão (ver lib/supabase/README.md).

export type ConfiguracaoPublicaSupabase = { url: string; chavePublicavel: string };

export function lerConfiguracaoPublicaSupabase(): ConfiguracaoPublicaSupabase | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const chavePublicavel = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !chavePublicavel) return null;
  return { url, chavePublicavel };
}
