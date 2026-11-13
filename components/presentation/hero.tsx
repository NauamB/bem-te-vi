import { rotas, site } from "@/lib/config/site";
import { BotaoLink } from "@/components/ui/botao-link";
import { CurvasDeNivel } from "./curvas-de-nivel";

export function Hero() {
  return (
    <section aria-labelledby="hero-titulo" className="relative overflow-hidden border-b border-floresta-900/10">
      <CurvasDeNivel composicao="hero" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:grid-cols-12 lg:items-center lg:gap-8 lg:px-8 lg:pb-28 lg:pt-24">
        <div className="lg:col-span-7">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-floresta-700">{site.assinatura}</p>
          <h1 id="hero-titulo" className="mt-6 font-display text-[2.35rem] font-medium leading-[1.05] tracking-tight text-floresta-950 sm:text-5xl lg:text-[3.6rem]">
            Conhecer a biodiversidade é compreender o território.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-pedra-700">{site.descricao}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <BotaoLink href={rotas.explorar}>Explorar biodiversidade</BotaoLink>
            <BotaoLink href={rotas.plataforma} variante="secundario">
              Conhecer a plataforma
            </BotaoLink>
          </div>
          <p className="mt-6 flex items-start gap-2 text-sm text-pedra-500">
            <span aria-hidden="true" className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-sol-400" />
            Fase de fundação: os dados de biodiversidade ainda estão sendo preparados.
          </p>
        </div>

        <figure className="lg:col-span-5">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-floresta-900/15 bg-floresta-950 sm:aspect-[5/4]">
            <CurvasDeNivel composicao="painel" />
            <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.06)_1px,transparent_1px)] bg-[size:25%_25%]" />
            <div className="absolute left-4 top-4 flex flex-wrap gap-2 font-mono text-[0.65rem] uppercase tracking-[0.14em]">
              <span className="rounded-full bg-floresta-500/90 px-2.5 py-1 text-white">Flora</span>
              <span className="rounded-full bg-cerrado-600/90 px-2.5 py-1 text-white">Fauna</span>
              <span className="rounded-full bg-pantanal-600/90 px-2.5 py-1 text-white">Território</span>
            </div>
            <span aria-hidden="true" className="absolute left-[58%] top-[44%] h-3 w-3 rounded-full border-2 border-floresta-950 bg-sol-400 ring-4 ring-sol-300/25" />
          </div>
          <figcaption className="mt-3 font-mono text-[0.7rem] leading-relaxed text-pedra-500">
            Composição gráfica com curvas de nível. Não é mapa e não representa dados.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
