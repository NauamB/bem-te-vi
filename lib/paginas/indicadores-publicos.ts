// Indicadores da página inicial, lidos no SERVIDOR pela mesma consulta da API pública (/api/v1/indicadores).
// Sem banco configurado, banco fora do ar ou nenhum registro publicado, devolve null e a seção não aparece:
// a interface nunca mostra números que não venham dos dados publicados.
import { cacheLife } from "next/cache";
import { consultarPublico } from "@/lib/banco/leitura";
import { resumoPublico } from "@/lib/modulos/indicadores/resumo";

export async function indicadoresPublicos() {
  "use cache";
  cacheLife("hours");
  try {
    const r = await resumoPublico(consultarPublico);
    return r.registros > 0 ? r : null;
  } catch {
    return null;
  }
}
