import { Rotulo } from "@/components/ui/rotulo";
import { naturezasInformacao } from "@/types/informacao";

const principios = [
  { titulo: "Fontes identificadas", texto: "Cada informação indica a fonte, o conjunto de dados e a licença de uso." },
  { titulo: "Rastreabilidade", texto: "Do dado exibido é possível voltar ao registro original e à forma como foi tratado." },
  { titulo: "Informação geográfica", texto: "Espécies e registros são lidos no território, com a incerteza de cada coordenada." },
  { titulo: "Transparência metodológica", texto: "Contagens e cruzamentos mostram o método, as lacunas e o que não permitem concluir." },
  { titulo: "Atualização controlada", texto: "Cada importação é registrada com data e situação; falha de uma fonte não apaga o que já existe." },
] as const;

export function Principios() {
  return (
    <section id="principios" aria-labelledby="principios-titulo" className="border-y border-floresta-900/10 bg-areia-100">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-4">
            <Rotulo>Princípios</Rotulo>
            <h2 id="principios-titulo" className="mt-4 font-display text-3xl font-medium tracking-tight text-floresta-950 sm:text-4xl">
              Inteligência baseada em dados
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-pedra-700">
              A confiança vem de mostrar a origem e os limites de cada informação, não de esconder as lacunas.
            </p>
          </div>

          <ol className="divide-y divide-floresta-900/10 border-y border-floresta-900/10 lg:col-span-8">
            {principios.map((p, i) => (
              <li key={p.titulo} className="grid gap-2 py-6 sm:grid-cols-[4rem_minmax(0,14rem)_minmax(0,1fr)] sm:gap-6">
                <span className="font-mono text-sm text-floresta-700">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="font-display text-xl font-medium text-floresta-950">{p.titulo}</h3>
                <p className="text-base leading-relaxed text-pedra-700">{p.texto}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-20">
          <h3 className="font-display text-2xl font-medium text-floresta-950">Como a informação será organizada</h3>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-pedra-700">
            Modelo previsto: cada informação terá uma única natureza, identificada em todas as telas. Dados das fontes, cálculos da
            plataforma e decisões de pessoas nunca se confundem.
          </p>
          <dl className="mt-8 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {naturezasInformacao.map((n) => (
              <div key={n.natureza} className="border-l-2 border-floresta-600/40 pl-4">
                <dt className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-floresta-800">{n.rotulo}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-pedra-700">{n.descricao}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
