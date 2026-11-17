// GET /api/v1/especies — busca de espécies (nome científico, sinônimo ou popular). Lógica em lib/api/v1.ts.
import { rotaEspecies } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaEspecies(new URL(requisicao.url).searchParams, consultarPublico);
}
