// GET /api/v1/fontes — fontes, downloads e conjuntos aprovados, com licença e citação. Lógica em lib/api/v1.ts.
import { rotaFontes } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaFontes(new URL(requisicao.url).searchParams, consultarPublico);
}
