import { indicadoresPublicos } from "@/lib/paginas/indicadores-publicos";
import { Rotulo } from "@/components/ui/rotulo";

const numero = new Intl.NumberFormat("pt-BR");

// Indicadores da camada pública. Só existe quando há registros publicados (conjuntos aprovados); caso contrário,
// a seção não é exibida. Dado derivado: contagens, com a fonte indicada.
export async function Indicadores() {
  const r = await indicadoresPublicos();
  if (!r) return null;
  const itens = [
    { rotulo: "Registros públicos", valor: r.registros },
    { rotulo: "Espécies com registro", valor: r.especies },
    { rotulo: "Municípios com registro", valor: r.municipios },
    { rotulo: "Conjuntos de dados", valor: r.conjuntos },
  ];
  return (
    <section aria-labelledby="indicadores-titulo" className="border-y border-linha bg-papel-50">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Rotulo>Dados publicados</Rotulo>
        <h2 id="indicadores-titulo" className="mt-4 font-display text-3xl font-extrabold tracking-[-0.03em] text-verde-950">
          A biodiversidade registrada até agora
        </h2>
        <dl className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {itens.map((i) => (
            <div key={i.rotulo} className="rounded-cartao border border-linha bg-white p-6">
              <dt className="font-mono text-xs uppercase tracking-[0.14em] text-tinta-500">{i.rotulo}</dt>
              <dd className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] text-verde-800">{numero.format(i.valor)}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-sm leading-relaxed text-tinta-600">
          Dado derivado: contagem dos registros de conjuntos de dados aprovados para publicação. Fontes e licenças em /api/v1/fontes.
          {r.registros_so_por_municipio > 0 && ` ${numero.format(r.registros_so_por_municipio)} registros sensíveis aparecem só por município.`}
        </p>
      </div>
    </section>
  );
}
