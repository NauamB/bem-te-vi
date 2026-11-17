// GET /api/v1/indicadores — contagens gerais da camada pública. Lógica em lib/api/v1.ts.
import { rotaIndicadores } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaIndicadores(new URL(requisicao.url).searchParams, consultarPublico);
}
