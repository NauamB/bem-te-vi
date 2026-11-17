import type { Metadata } from "next";
import { Suspense } from "react";
import { rotas } from "@/lib/config/site";
import { Explorador } from "@/components/explorar/explorador";
import { CurvasDeNivel } from "@/components/presentation/curvas-de-nivel";
import { BotaoLink } from "@/components/ui/botao-link";
import { Rotulo } from "@/components/ui/rotulo";

export const metadata: Metadata = {
  title: "Explorar biodiversidade",
  description: "Área de exploração pública do Bem-te-vi. Os dados de biodiversidade ainda estão sendo preparados.",
};

const modulos = [
  { nome: "Espécies", texto: "Busca por nome científico ou popular, com taxonomia e fontes." },
  { nome: "Registros de ocorrência", texto: "Registros de fauna e flora com data, origem, licença e incerteza da coordenada." },
  { nome: "Mapa", texto: "Distribuição geográfica com camadas de municípios, biomas e áreas protegidas." },
  { nome: "Territórios", texto: "Leitura por município, bioma ou área protegida." },
  { nome: "Fontes e metadados", texto: "Cobertura, licença e última atualização de cada fonte." },
] as const;

export default function PaginaExplorar() {
  return (
    <>
      <section aria-labelledby="explorar-titulo" className="superficie-escura relative overflow-hidden bg-verde-950 text-white">
        <CurvasDeNivel composicao="mato-grosso" />
        <div className="relative mx-auto max-w-7xl px-4 pb-14 pt-16 sm:px-6 sm:pt-20 lg:px-8">
          <Rotulo className="text-verde-200">Observatório público</Rotulo>
          <h1 id="explorar-titulo" className="mt-4 font-display text-4xl font-extrabold tracking-[-0.035em] sm:text-6xl">
            Explorar biodiversidade
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-verde-50/85">
            Espécies, registros de ocorrência e território de Mato Grosso, sempre com fonte, licença e natureza de cada informação.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div role="status" className="rounded-cartao border border-laranja-300 bg-laranja-50 p-6 sm:p-7">
          <p className="font-display text-xl font-bold text-verde-950">Os dados ainda estão sendo preparados.</p>
          <p className="mt-2 text-base leading-relaxed text-tinta-600">
            A busca abaixo consulta a API pública do Bem-te-vi. Enquanto os registros aprovados não forem publicados, ela informa que a base ainda
            não está disponível. Nenhum resultado é simulado.
          </p>
        </div>

        <div className="mt-10">
          <Suspense fallback={<p className="text-sm text-tinta-600">Carregando o explorador…</p>}>
            <Explorador />
          </Suspense>
        </div>

        <h2 className="mt-20 font-display text-3xl font-extrabold tracking-[-0.03em] text-verde-950">O que esta área vai oferecer</h2>
        <ul className="mt-6 divide-y divide-linha border-y border-linha">
          {modulos.map((m) => (
            <li key={m.nome} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:gap-6">
              <span className="font-display text-lg font-bold text-verde-950 sm:w-56 sm:shrink-0">{m.nome}</span>
              <span className="flex-1 text-base leading-relaxed text-tinta-600">{m.texto}</span>
              <span className="w-fit rounded-full border border-laranja-600/40 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-laranja-600">
                Previsto
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <BotaoLink href={rotas.inicio} variante="secundario">
            Voltar à apresentação
          </BotaoLink>
          <BotaoLink href="/#principios" variante="secundario">
            Conhecer os princípios
          </BotaoLink>
        </div>
      </div>
    </>
  );
}
