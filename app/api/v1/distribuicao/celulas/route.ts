// GET /api/v1/distribuicao/celulas — contagens por célula de 0,1° (GeoJSON). Lógica em lib/api/v1.ts.
import { rotaCelulas } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaCelulas(new URL(requisicao.url).searchParams, consultarPublico);
}
