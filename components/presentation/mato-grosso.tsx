import { Rotulo } from "@/components/ui/rotulo";
import { CurvasDeNivel } from "./curvas-de-nivel";

// Descrições gerais e qualitativas. A delimitação oficial dos biomas (IBGE) será integrada em fase própria;
// por isso não há áreas, percentuais ou contagens nesta seção.
const biomas = [
  { nome: "Amazônia", texto: "Florestas tropicais, predominantes na porção norte do estado.", cor: "bg-floresta-500" },
  { nome: "Cerrado", texto: "Savanas, campos e formações florestais na porção central e leste.", cor: "bg-cerrado-400" },
  { nome: "Pantanal", texto: "Planície sujeita a inundações periódicas, no sudoeste.", cor: "bg-pantanal-400" },
] as const;

export function MatoGrosso() {
  return (
    <section id="mato-grosso" aria-labelledby="mt-titulo" className="relative overflow-hidden bg-floresta-900 text-white">
      <CurvasDeNivel composicao="mato-grosso" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-12 lg:gap-8 lg:px-8 lg:py-28">
        <div className="lg:col-span-6">
          <Rotulo className="text-sol-300">Território inicial</Rotulo>
          <h2 id="mt-titulo" className="mt-4 font-display text-3xl font-medium tracking-tight sm:text-4xl">
            Mato Grosso, onde três biomas se encontram
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-floresta-100">
            O Bem-te-vi começa por Mato Grosso, estado que reúne Amazônia, Cerrado e Pantanal e seus 142 municípios (IBGE). Essa diversidade de
            paisagens é o primeiro território de trabalho da plataforma.
          </p>
          <p className="mt-5 text-base leading-relaxed text-floresta-100/85">
            A arquitetura não se limita ao estado: códigos territoriais e geometrias seguem referências nacionais desde o início, para que outras
            unidades da federação possam ser incorporadas sem refazer a base.
          </p>
        </div>

        <ul className="space-y-px self-end overflow-hidden rounded-2xl border border-white/10 lg:col-span-5 lg:col-start-8">
          {biomas.map((b) => (
            <li key={b.nome} className="flex gap-4 bg-floresta-950/60 p-6">
              <span aria-hidden="true" className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${b.cor}`} />
              <div>
                <h3 className="font-display text-xl font-medium">{b.nome}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-floresta-100/85">{b.texto}</p>
              </div>
            </li>
          ))}
          <li className="bg-floresta-950/60 px-6 py-4 font-mono text-[0.7rem] leading-relaxed text-floresta-300">
            Descrição geral. A delimitação oficial dos biomas (IBGE) será integrada em fase própria.
          </li>
        </ul>
      </div>
    </section>
  );
}
