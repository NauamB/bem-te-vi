import { IconeFonte } from "@/components/ui/icones";
import { Rotulo } from "@/components/ui/rotulo";

// Fontes públicas em integração, com o que cada uma fornece e a licença registrada nos manifestos do projeto
// (dados/referencias/). O Bem-te-vi não tem vínculo com nenhuma dessas instituições.
const fontes = [
  {
    nome: "GBIF",
    instituicao: "Global Biodiversity Information Facility",
    papel: "Registros de ocorrência de flora e fauna, obtidos por downloads oficiais com DOI.",
    licenca: "Licença de cada conjunto de dados (CC0, CC BY ou CC BY-NC); só são publicados conjuntos aprovados na conferência de licença.",
    url: "https://www.gbif.org",
  },
  {
    nome: "Flora e Funga do Brasil",
    instituicao: "Instituto de Pesquisas Jardim Botânico do Rio de Janeiro",
    papel: "Lista de nomes de plantas e fungos: referência para nomes aceitos, sinônimos e distribuição.",
    licenca: "CC BY 4.0",
    url: "https://ipt.jbrj.gov.br/jbrj/resource?r=lista_especies_flora_brasil",
  },
  {
    nome: "Malha Municipal Digital",
    instituicao: "IBGE",
    papel: "Limites dos municípios de Mato Grosso, usados para situar cada registro no território.",
    licenca: "Compatível com CC BY 4.0, com créditos ao IBGE",
    url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais.html",
  },
  {
    nome: "GBIF Backbone Taxonomy",
    instituicao: "Secretariado do GBIF",
    papel: "Classificação provisória para fauna e grupos não cobertos pela Flora e Funga. Não é o catálogo oficial brasileiro.",
    licenca: "CC BY 4.0",
    url: "https://doi.org/10.15468/39omei",
  },
] as const;

export function FontesDeInformacao() {
  return (
    <section id="fontes" aria-labelledby="fontes-titulo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Rotulo>Fontes de informação</Rotulo>
          <h2 id="fontes-titulo" className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-verde-950 sm:text-5xl">
            De onde vêm os dados
          </h2>
        </div>
        <p className="text-lg leading-relaxed text-tinta-600 lg:col-span-5">
          Fontes científicas e oficiais, abertas e citáveis. Cada informação exibida indicará a fonte, o conjunto de dados e a licença. O Bem-te-vi
          não tem vínculo com essas instituições.
        </p>
      </div>

      <ul className="mt-14 grid gap-5 sm:grid-cols-2">
        {fontes.map((f) => (
          <li key={f.nome} className="flex flex-col rounded-cartao border border-linha bg-white p-7 shadow-cartao">
            <div className="flex items-start gap-4">
              <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-agua-50 text-agua-600">
                <IconeFonte className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-display text-xl font-bold tracking-[-0.01em] text-verde-950">{f.nome}</h3>
                <p className="mt-0.5 text-sm text-tinta-500">{f.instituicao}</p>
              </div>
            </div>
            <p className="mt-5 text-base leading-relaxed text-tinta-600">{f.papel}</p>
            <dl className="mt-5 border-t border-linha pt-4">
              <dt className="font-mono text-[0.68rem] font-medium uppercase tracking-[0.16em] text-tinta-500">Licença</dt>
              <dd className="mt-1 text-sm text-tinta-800">{f.licenca}</dd>
            </dl>
            <a href={f.url} className="mt-auto inline-flex min-h-11 items-center gap-1.5 pt-3 text-sm font-semibold text-verde-700 underline-offset-4 hover:underline">
              Página da fonte: {f.nome}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
