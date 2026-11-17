// GET /api/v1/distribuicao/municipios — contagens por município. Lógica em lib/api/v1.ts.
import { rotaMunicipios } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaMunicipios(new URL(requisicao.url).searchParams, consultarPublico);
}
