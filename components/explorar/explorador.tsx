"use client";

// Explorador de espécies: busca por nome (científico, sinônimo ou popular), filtro por grupo biológico, resultados
// paginados e perfil da espécie. Usa SOMENTE a API pública (/api/v1/especies). Sem dados publicados, a API responde
// 503 e o explorador diz isso claramente: nenhum resultado é simulado.
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useId, useRef, useState } from "react";
import { IconeBusca } from "@/components/ui/icones";

type Especie = {
  id: number;
  nome: string;
  familia: string | null;
  grupo: string;
  sensivel: boolean;
  ocorrencias_publicas: number;
  nome_encontrado: string;
  tipo_encontrado: "cientifico" | "sinonimo" | "popular";
};
type Perfil = {
  especie: {
    id: number;
    nome: string;
    grupo: string;
    sensivel: boolean;
    ocorrencias_publicas: number;
    municipios_com_registro: number;
    classificacao: Record<string, string | null>;
    nomes_cientificos: { nome: string; autoria: string | null; status: string }[];
    nomes_populares: { nome: string }[];
  };
  referencia: { nome: string | null; versao: string | null; nota: string | null; citacao: string | null };
};
type Estado =
  | { tipo: "inicial" }
  | { tipo: "carregando" }
  | { tipo: "indisponivel" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "resultados"; termo: string; especies: Especie[]; proximo: string | null };

const GRUPOS = [
  { valor: "", rotulo: "Todos" },
  { valor: "flora", rotulo: "Flora" },
  { valor: "fauna", rotulo: "Fauna" },
  { valor: "fungos", rotulo: "Fungos" },
] as const;
const TIPO_NOME = { cientifico: "nome científico", sinonimo: "sinônimo", popular: "nome popular" } as const;
const numero = new Intl.NumberFormat("pt-BR");

async function obter<T>(url: string): Promise<{ ok: true; corpo: T } | { ok: false; status: number; mensagem: string }> {
  try {
    const r = await fetch(url, { headers: { accept: "application/json" } });
    const corpo = await r.json().catch(() => null);
    if (r.ok) return { ok: true, corpo: corpo as T };
    return { ok: false, status: r.status, mensagem: corpo?.erro?.mensagem ?? "Não foi possível consultar os dados." };
  } catch {
    return { ok: false, status: 0, mensagem: "Sem conexão com o servidor." };
  }
}

export function Explorador() {
  const parametros = useSearchParams();
  const router = useRouter();
  const [termo, setTermo] = useState(parametros.get("q") ?? "");
  const [grupo, setGrupo] = useState(parametros.get("grupo") ?? "");
  const [aviso, setAviso] = useState<string | null>(null);
  const [resposta, setResposta] = useState<{ chave: string; estado: Estado } | null>(null);
  const [perfil, setPerfil] = useState<{ carregando: boolean; dados?: Perfil; erro?: string } | null>(null);
  const idResultados = useId();
  const perfilRef = useRef<HTMLDivElement>(null);

  // A consulta vem da URL (/explorar?q=…&grupo=…): a página inicial e o formulário escrevem nela.
  const q = parametros.get("q")?.trim() ?? "";
  const g = parametros.get("grupo") ?? "";
  const chave = q.replace(/\s/g, "").length >= 3 ? `${q}|${g}` : null;

  const consultar = useCallback(async (termoBusca: string, grupoBusca: string, apos?: string): Promise<Estado> => {
    const p = new URLSearchParams({ q: termoBusca });
    if (grupoBusca) p.set("grupo", grupoBusca);
    if (apos) p.set("apos", apos);
    const r = await obter<{ dados: { termo: string; especies: Especie[] }; paginacao: { proximo: string | null } }>(`/api/v1/especies?${p}`);
    if (!r.ok) return r.status === 503 ? { tipo: "indisponivel" } : { tipo: "erro", mensagem: r.mensagem };
    return { tipo: "resultados", termo: r.corpo.dados.termo, especies: r.corpo.dados.especies, proximo: r.corpo.paginacao.proximo };
  }, []);

  // O estado só é gravado quando a resposta chega; "carregando" é derivado (consulta atual ainda sem resposta).
  useEffect(() => {
    if (!chave) return;
    let ativo = true;
    void consultar(q, g).then((estado) => ativo && setResposta({ chave, estado }));
    return () => {
      ativo = false;
    };
  }, [chave, q, g, consultar]);

  const estado: Estado = aviso
    ? { tipo: "erro", mensagem: aviso }
    : !chave
      ? { tipo: "inicial" }
      : resposta?.chave === chave
        ? resposta.estado
        : { tipo: "carregando" };

  const mais = async (apos: string) => {
    if (!chave || resposta?.estado.tipo !== "resultados") return;
    const anteriores = resposta.estado.especies;
    const novo = await consultar(q, g, apos);
    setResposta({ chave, estado: novo.tipo === "resultados" ? { ...novo, especies: [...anteriores, ...novo.especies] } : novo });
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    const termoLimpo = termo.trim();
    if (termoLimpo.replace(/\s/g, "").length < 3) {
      setAviso("Digite pelo menos 3 letras do nome.");
      return;
    }
    setAviso(null);
    setPerfil(null);
    const p = new URLSearchParams({ q: termoLimpo });
    if (grupo) p.set("grupo", grupo);
    router.replace(`/explorar?${p}`, { scroll: false });
  };

  const abrirPerfil = async (id: number) => {
    setPerfil({ carregando: true });
    const r = await obter<{ dados: Perfil }>(`/api/v1/especies/${id}`);
    setPerfil(r.ok ? { carregando: false, dados: r.corpo.dados } : { carregando: false, erro: r.status === 503 ? "A base pública ainda não está disponível." : r.mensagem });
    requestAnimationFrame(() => perfilRef.current?.focus());
  };

  return (
    <div className="grid gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <form onSubmit={enviar} role="search" aria-label="Buscar espécies" className="rounded-painel border border-linha bg-white p-5 shadow-cartao sm:p-7">
          <label htmlFor="termo-busca" className="font-display text-lg font-bold text-verde-950">
            Buscar espécie
          </label>
          <p className="mt-1 text-sm text-tinta-600">Nome científico, sinônimo ou nome popular (início do nome, sem acento nem maiúsculas).</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <IconeBusca className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-tinta-500" />
              <input
                id="termo-busca"
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                autoComplete="off"
                placeholder="Ex.: jatobá, Hymenaea courbaril"
                className="h-12 w-full rounded-xl border border-linha bg-papel-50 pl-12 pr-4 text-base text-tinta-950 placeholder:text-tinta-500"
              />
            </div>
            <button type="submit" className="h-12 rounded-xl bg-verde-800 px-6 text-base font-semibold text-white transition-colors hover:bg-verde-700">
              Buscar
            </button>
          </div>

          <fieldset className="mt-6">
            <legend className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-tinta-500">Grupo biológico</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {GRUPOS.map((g) => (
                <label key={g.rotulo} className="cursor-pointer">
                  <input type="radio" name="grupo" value={g.valor} checked={grupo === g.valor} onChange={() => setGrupo(g.valor)} className="peer sr-only" />
                  <span className="inline-flex min-h-11 items-center rounded-full border border-linha px-4 text-sm font-medium text-tinta-600 transition-colors peer-checked:border-verde-800 peer-checked:bg-verde-800 peer-checked:text-white peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-laranja-600 hover:border-verde-800">
                    {g.rotulo}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="mt-6 grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center">
            <label htmlFor="filtro-municipio" className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-tinta-500">
              Filtro geográfico
            </label>
            <select id="filtro-municipio" disabled className="h-12 w-full min-w-0 rounded-xl border border-linha bg-papel-100 px-4 text-sm text-tinta-500" defaultValue="">
              <option value="">Município (após a publicação)</option>
            </select>
          </div>
        </form>

        <div id={idResultados} aria-live="polite" className="mt-8">
          <Resultados estado={estado} onPerfil={abrirPerfil} onMais={mais} />
        </div>
      </div>

      <aside className="space-y-6 lg:col-span-5" aria-label="Perfil e mapa">
        <div ref={perfilRef} tabIndex={-1} className="rounded-painel border border-linha bg-white p-6 shadow-cartao focus:outline-none">
          <PainelPerfil perfil={perfil} />
        </div>
        <div className="superficie-escura relative overflow-hidden rounded-painel bg-verde-950 p-6 text-white">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-laranja-300">Mapa de distribuição</p>
          <p className="mt-3 font-display text-xl font-bold">Em preparação</p>
          <p className="mt-2 text-sm leading-relaxed text-verde-100/85">
            Quando os registros forem publicados, a distribuição aparecerá em células de cerca de 11 km e, para espécies sensíveis, só por município.
            Coordenadas precisas nunca são exibidas.
          </p>
        </div>
      </aside>
    </div>
  );
}

function Resultados({ estado, onPerfil, onMais }: { estado: Estado; onPerfil: (id: number) => void; onMais: (apos: string) => void }) {
  if (estado.tipo === "inicial") {
    return <p className="rounded-cartao border border-dashed border-linha p-6 text-sm text-tinta-600">Os resultados da busca aparecem aqui.</p>;
  }
  if (estado.tipo === "carregando") return <p className="p-6 text-sm text-tinta-600">Consultando a base pública…</p>;
  if (estado.tipo === "indisponivel") {
    return (
      <div className="rounded-cartao border border-laranja-300 bg-laranja-50 p-6">
        <p className="font-display text-lg font-bold text-verde-950">A base pública ainda não está disponível.</p>
        <p className="mt-2 text-sm leading-relaxed text-tinta-600">
          A busca usa a API pública do Bem-te-vi, que só responde depois que os dados aprovados forem publicados. Nenhum resultado é simulado.
        </p>
      </div>
    );
  }
  if (estado.tipo === "erro") return <p className="rounded-cartao border border-linha bg-papel-50 p-6 text-sm text-tinta-800">{estado.mensagem}</p>;
  if (!estado.especies.length) return <p className="rounded-cartao border border-linha bg-papel-50 p-6 text-sm text-tinta-800">Nenhuma espécie encontrada para “{estado.termo}”.</p>;
  return (
    <div>
      <ul className="divide-y divide-linha overflow-hidden rounded-cartao border border-linha bg-white">
        {estado.especies.map((e) => (
          <li key={e.id}>
            <button type="button" onClick={() => onPerfil(e.id)} className="flex min-h-11 w-full flex-col gap-1 px-5 py-4 text-left transition-colors hover:bg-verde-50 sm:flex-row sm:items-center sm:justify-between">
              <span>
                <span className="block font-display text-base font-bold italic text-verde-950">{e.nome}</span>
                <span className="mt-0.5 block text-xs text-tinta-500">
                  {e.familia ?? "Família não informada"} · encontrado por {TIPO_NOME[e.tipo_encontrado]}
                  {e.tipo_encontrado !== "cientifico" && `: ${e.nome_encontrado}`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs text-tinta-600">
                <span className="rounded-full bg-verde-50 px-2.5 py-1 text-verde-800">{e.grupo}</span>
                {e.sensivel && <span className="rounded-full bg-laranja-50 px-2.5 py-1 text-laranja-600">sensível</span>}
                {numero.format(e.ocorrencias_publicas)} reg.
              </span>
            </button>
          </li>
        ))}
      </ul>
      {estado.proximo && (
        <button type="button" onClick={() => onMais(estado.proximo as string)} className="mt-4 inline-flex min-h-11 items-center rounded-full border border-verde-800/25 px-5 text-sm font-semibold text-verde-900 hover:bg-verde-50">
          Mostrar mais resultados
        </button>
      )}
    </div>
  );
}

function PainelPerfil({ perfil }: { perfil: { carregando: boolean; dados?: Perfil; erro?: string } | null }) {
  if (!perfil) {
    return (
      <>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-verde-600">Perfil da espécie</p>
        <p className="mt-3 text-sm leading-relaxed text-tinta-600">Escolha uma espécie nos resultados para ver nomes, classificação, referência taxonômica e registros públicos.</p>
      </>
    );
  }
  if (perfil.carregando) return <p className="text-sm text-tinta-600">Carregando o perfil…</p>;
  if (perfil.erro || !perfil.dados) return <p className="text-sm text-tinta-800">{perfil.erro}</p>;
  const { especie, referencia } = perfil.dados;
  const sinonimos = especie.nomes_cientificos.filter((n) => n.status === "sinonimo");
  return (
    <>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.16em] text-verde-600">Perfil da espécie · {especie.grupo}</p>
      <h2 className="mt-2 font-display text-2xl font-bold italic tracking-[-0.01em] text-verde-950">{especie.nome}</h2>
      {especie.sensivel && (
        <p className="mt-3 rounded-xl bg-laranja-50 px-4 py-3 text-sm text-tinta-800">Espécie sensível: os registros públicos aparecem só por município.</p>
      )}
      <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
        {(["familia", "ordem", "classe", "filo"] as const).map((k) =>
          especie.classificacao[k] ? (
            <div key={k}>
              <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-tinta-500">{k === "familia" ? "família" : k}</dt>
              <dd className="mt-0.5 text-tinta-800">{especie.classificacao[k]}</dd>
            </div>
          ) : null,
        )}
        <div>
          <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-tinta-500">registros públicos</dt>
          <dd className="mt-0.5 text-tinta-800">{numero.format(especie.ocorrencias_publicas)}</dd>
        </div>
        <div>
          <dt className="font-mono text-[0.68rem] uppercase tracking-[0.14em] text-tinta-500">municípios</dt>
          <dd className="mt-0.5 text-tinta-800">{numero.format(especie.municipios_com_registro)}</dd>
        </div>
      </dl>
      {especie.nomes_populares.length > 0 && (
        <p className="mt-5 text-sm text-tinta-600">
          <span className="font-semibold text-tinta-800">Nomes populares: </span>
          {especie.nomes_populares.slice(0, 8).map((n) => n.nome).join(", ")}
        </p>
      )}
      {sinonimos.length > 0 && (
        <p className="mt-2 text-sm text-tinta-600">
          <span className="font-semibold text-tinta-800">Sinônimos: </span>
          {sinonimos.slice(0, 6).map((n) => n.nome).join(", ")}
        </p>
      )}
      <p className="mt-5 border-t border-linha pt-4 text-xs leading-relaxed text-tinta-500">
        Referência: {referencia.nome ?? "não informada"}
        {referencia.versao ? ` (${referencia.versao})` : ""}. {referencia.nota ?? ""}
      </p>
    </>
  );
}
