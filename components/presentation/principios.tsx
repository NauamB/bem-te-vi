import { Rotulo } from "@/components/ui/rotulo";
import { naturezasInformacao } from "@/types/informacao";
import { CurvasDeNivel } from "./curvas-de-nivel";

const principios = [
  { titulo: "Fontes identificadas", texto: "Cada informação indica a fonte, o conjunto de dados e a licença de uso." },
  { titulo: "Rastreabilidade", texto: "Do dado exibido é possível voltar ao registro original e à forma como foi tratado." },
  { titulo: "Informação geográfica", texto: "Espécies e registros são lidos no território, com a incerteza de cada coordenada." },
  { titulo: "Transparência metodológica", texto: "Contagens e cruzamentos mostram o método, as lacunas e o que não permitem concluir." },
  { titulo: "Atualização controlada", texto: "Cada importação é registrada com data e situação; falha de uma fonte não apaga o que já existe." },
] as const;

export function Principios() {
  return (
    <section id="principios" aria-labelledby="principios-titulo" className="relative overflow-hidden border-y border-linha bg-papel-50">
      <CurvasDeNivel composicao="hero" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Rotulo>Princípios</Rotulo>
            <h2 id="principios-titulo" className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-verde-950 sm:text-5xl">
              Inteligência baseada em dados
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-tinta-600">
              A confiança vem de mostrar a origem e os limites de cada informação, não de esconder as lacunas.
            </p>
          </div>

          <ol className="lg:col-span-8">
            {principios.map((p, i) => (
              <li key={p.titulo} className="grid gap-2 border-t border-linha py-6 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_minmax(0,14rem)_minmax(0,1fr)] sm:gap-6 lg:first:pt-2">
                <span className="font-mono text-sm font-medium text-laranja-600">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-verde-950">{p.titulo}</h3>
                <p className="text-base leading-relaxed text-tinta-600">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-20 rounded-painel border border-linha bg-white p-7 shadow-cartao sm:p-10">
          <h3 className="font-display text-2xl font-bold tracking-[-0.02em] text-verde-950">Como a informação será organizada</h3>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-tinta-600">
            Modelo previsto: cada informação terá uma única natureza, identificada em todas as telas. Dados das fontes, cálculos da
            plataforma e decisões de pessoas nunca se confundem.
          </p>
          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {naturezasInformacao.map((n) => (
              <div key={n.natureza} className="border-l-2 border-verde-600/40 pl-4">
                <dt className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-700">{n.rotulo}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-tinta-600">{n.descricao}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-6 font-mono text-[0.7rem] text-tinta-500">Composição gráfica com curvas de nível ao fundo. Não é mapa e não representa dados.</p>
      </div>
    </section>
  );
}
