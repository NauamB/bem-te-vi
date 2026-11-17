import type { ComponentType } from "react";
import { IconeFauna, IconeFlora, IconeTerritorio } from "@/components/ui/icones";
import { Rotulo } from "@/components/ui/rotulo";

const dimensoes: { numero: string; nome: string; resumo: string; itens: string[]; Icone: ComponentType<{ className?: string }>; tom: string; faixa: string }[] = [
  {
    numero: "01",
    nome: "Flora",
    resumo: "Espécies vegetais, taxonomia e distribuição.",
    itens: ["Nomes aceitos e sinônimos", "Classificação taxonômica", "Distribuição por território"],
    Icone: IconeFlora,
    tom: "bg-verde-50 text-verde-700",
    faixa: "bg-verde-600",
  },
  {
    numero: "02",
    nome: "Fauna",
    resumo: "Espécies animais, registros e ocorrência.",
    itens: ["Espécies e grupos", "Registros de ocorrência com origem", "Situação de conservação, quando a fonte permitir"],
    Icone: IconeFauna,
    tom: "bg-agua-50 text-agua-600",
    faixa: "bg-agua-600",
  },
  {
    numero: "03",
    nome: "Território",
    resumo: "Biomas, municípios, paisagens e distribuição geográfica.",
    itens: ["Municípios e limites oficiais", "Biomas e vegetação", "Áreas protegidas"],
    Icone: IconeTerritorio,
    tom: "bg-laranja-50 text-terra-600",
    faixa: "bg-terra-400",
  },
];

export function BiodiversidadeIntegrada() {
  return (
    <section id="plataforma" aria-labelledby="plataforma-titulo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Rotulo>A plataforma</Rotulo>
          <h2 id="plataforma-titulo" className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-verde-950 sm:text-5xl">
            Biodiversidade integrada
          </h2>
        </div>
        <p className="text-lg leading-relaxed text-tinta-600 lg:col-span-5">
          Informações sobre espécies, registros e território costumam estar dispersas em diferentes fontes. O Bem-te-vi reunirá essas três
          dimensões em uma mesma leitura, sempre indicando de onde vem cada informação.
        </p>
      </div>

      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {dimensoes.map(({ numero, nome, resumo, itens, Icone, tom, faixa }) => (
          <li key={nome} className="group relative flex flex-col overflow-hidden rounded-cartao border border-linha bg-white p-7 shadow-cartao transition-shadow hover:shadow-elevado">
            <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${faixa}`} />
            <div className="flex items-center justify-between">
              <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${tom}`}>
                <Icone className="h-6 w-6" />
              </span>
              <span className="font-mono text-sm text-tinta-500">{numero}</span>
            </div>
            <h3 className="mt-6 font-display text-2xl font-bold tracking-[-0.02em] text-verde-950">{nome}</h3>
            <p className="mt-2 text-base leading-relaxed text-tinta-600">{resumo}</p>
            <ul className="mt-6 space-y-2.5 border-t border-linha pt-5">
              {itens.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-tinta-800">
                  <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${faixa}`} />
                  {item}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
    </section>
  );
}
