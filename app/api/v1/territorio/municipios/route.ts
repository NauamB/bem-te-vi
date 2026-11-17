// GET /api/v1/territorio/municipios — malha municipal simplificada (GeoJSON). Lógica em lib/api/v1.ts.
import { rotaMalha } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request) {
  return rotaMalha(new URL(requisicao.url).searchParams, consultarPublico);
}
