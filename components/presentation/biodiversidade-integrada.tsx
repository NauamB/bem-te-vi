import { Rotulo } from "@/components/ui/rotulo";

const dimensoes = [
  {
    numero: "01",
    nome: "Flora",
    resumo: "Espécies vegetais, taxonomia e distribuição.",
    itens: ["Nomes aceitos e sinônimos", "Classificação taxonômica", "Distribuição por território"],
    cor: "border-floresta-600",
    marcador: "bg-floresta-600",
  },
  {
    numero: "02",
    nome: "Fauna",
    resumo: "Espécies animais, registros e ocorrência.",
    itens: ["Espécies e grupos", "Registros de ocorrência com origem", "Situação de conservação, quando a fonte permitir"],
    cor: "border-cerrado-600",
    marcador: "bg-cerrado-600",
  },
  {
    numero: "03",
    nome: "Território",
    resumo: "Biomas, municípios, paisagens e distribuição geográfica.",
    itens: ["Municípios e limites oficiais", "Biomas e vegetação", "Áreas protegidas"],
    cor: "border-pantanal-600",
    marcador: "bg-pantanal-600",
  },
] as const;

export function BiodiversidadeIntegrada() {
  return (
    <section id="plataforma" aria-labelledby="plataforma-titulo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="max-w-3xl">
        <Rotulo>A plataforma</Rotulo>
        <h2 id="plataforma-titulo" className="mt-4 font-display text-3xl font-medium tracking-tight text-floresta-950 sm:text-4xl">
          Biodiversidade integrada
        </h2>
        <p className="mt-5 text-lg leading-relaxed text-pedra-700">
          Informações sobre espécies, registros e território costumam estar dispersas em diferentes fontes. O Bem-te-vi reunirá essas três
          dimensões em uma mesma leitura, sempre indicando de onde vem cada informação.
        </p>
      </div>

      <ol className="mt-14 grid gap-12 md:grid-cols-3 md:gap-8 lg:gap-12">
        {dimensoes.map((d) => (
          <li key={d.nome} className={`border-t-2 pt-6 ${d.cor}`}>
            <p className="font-mono text-sm text-pedra-500">{d.numero}</p>
            <h3 className="mt-3 font-display text-2xl font-medium text-floresta-950">{d.nome}</h3>
            <p className="mt-3 text-base leading-relaxed text-pedra-700">{d.resumo}</p>
            <ul className="mt-5 space-y-2.5">
              {d.itens.map((item) => (
                <li key={item} className="flex gap-3 text-sm text-grafite-900">
                  <span aria-hidden="true" className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${d.marcador}`} />
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
