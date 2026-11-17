// Busca de espécies por nome científico, sinônimo ou nome popular (prefixo, sem acento nem caixa).
// A chave de busca é normalizada pela mesma função usada na carga (scripts/ingestao/texto.mjs).
import { normalizarBusca } from "../../../scripts/ingestao/texto.mjs";
import type { Consultar } from "../../banco/tipos.ts";
import { numero } from "../valores.ts";

export type FiltroBusca = { termo: string; grupo?: string; limite: number; apos?: [string, number] };

export const TERMO_MINIMO = 3;

// Escapa os curingas do LIKE: o termo é sempre literal.
const prefixoLike = (termo: string) => `${termo.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

export async function buscarEspecies(consultar: Consultar, f: FiltroBusca) {
  const termo = normalizarBusca(f.termo);
  const linhas = await consultar(
    `select e.id::int8 as id, e.nome, e.familia, e.grupo, e.referencia, e.sensivel, e.ocorrencias::int as ocorrencias_publicas,
            a.texto as nome_encontrado, a.tipo as tipo_encontrado
     from (
       select distinct on (b.especie_id) b.especie_id, b.texto, b.tipo
       from publico.busca b
       where b.chave like $1 escape '\\'
       order by b.especie_id, case b.tipo when 'cientifico' then 0 when 'sinonimo' then 1 else 2 end, b.texto
     ) a
     join publico.especie e on e.id = a.especie_id
     where ($2::text is null or e.grupo = $2)
       and ($3::text is null or (e.nome, e.id) > ($3::text, $4::bigint))
     order by e.nome, e.id
     limit $5`,
    [prefixoLike(termo), f.grupo ?? null, f.apos?.[0] ?? null, f.apos?.[1] ?? null, f.limite + 1],
  );
  const pagina = linhas.slice(0, f.limite).map((l) => ({
    id: numero(l.id),
    nome: String(l.nome),
    familia: l.familia === null ? null : String(l.familia),
    grupo: String(l.grupo),
    referencia: String(l.referencia),
    sensivel: Boolean(l.sensivel),
    ocorrencias_publicas: numero(l.ocorrencias_publicas),
    nome_encontrado: String(l.nome_encontrado),
    tipo_encontrado: String(l.tipo_encontrado) as "cientifico" | "sinonimo" | "popular",
  }));
  const ultimo = pagina.at(-1);
  return { termo_normalizado: termo, especies: pagina, proximo: linhas.length > f.limite && ultimo ? ([ultimo.nome, ultimo.id] as [string, number]) : null };
}
