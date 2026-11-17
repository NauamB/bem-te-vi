// GET /api/v1/ocorrencias — registros públicos paginados (célula de 0,1° ou município). Lógica em lib/api/v1.ts.
import { rotaOcorrencias } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaOcorrencias(new URL(requisicao.url).searchParams, consultarPublico);
}
