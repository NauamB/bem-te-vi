// GET /api/v1/especies/{id} — perfil da espécie. Lógica em lib/api/v1.ts.
import { rotaEspecie } from "@/lib/api/v1";
import { consultarPublico } from "@/lib/banco/leitura";

export async function GET(requisicao: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return rotaEspecie(id, new URL(requisicao.url).searchParams, consultarPublico);
}
