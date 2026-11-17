import Image from "next/image";
import { imagens } from "@/lib/conteudo/imagens";
import { rotas, site } from "@/lib/config/site";
import { BotaoLink } from "@/components/ui/botao-link";
import { CreditoImagem } from "@/components/ui/credito-imagem";
import { IconeSeta } from "@/components/ui/icones";
import { Rotulo } from "@/components/ui/rotulo";
import { BuscaEspecies } from "./busca-especies";

// Abertura: fotografia de paisagem de Mato Grosso (ilustrativa, com crédito), mensagem institucional e busca.
export function Hero() {
  const foto = imagens.chapada;
  return (
    <section aria-labelledby="hero-titulo" className="superficie-escura relative isolate overflow-hidden bg-verde-950 text-white">
      <Image
        src={foto.arquivo}
        alt={foto.alt}
        fill
        preload
        sizes="100vw"
        className="-z-20 object-cover object-[50%_65%]"
      />
      {/* Escurecimento para leitura do texto sobre a fotografia (contraste ≥ 4,5:1). */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-verde-950/55 lg:bg-transparent lg:bg-linear-to-r lg:from-verde-950/90 lg:via-verde-950/55 lg:to-transparent" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-1/3 bg-linear-to-t from-verde-950/80 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 pb-8 pt-16 sm:px-6 sm:pt-24 lg:px-8 lg:pt-28">
        <div className="max-w-3xl">
          <Rotulo className="text-verde-200">{site.assinatura}</Rotulo>
          <h1 id="hero-titulo" className="mt-6 font-display text-[2.5rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-balance sm:text-6xl lg:text-[4.4rem]">
            Conhecer a biodiversidade é compreender o território.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-verde-50/90 sm:text-xl">{site.descricao}</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <BotaoLink href={rotas.explorar}>
              Explorar biodiversidade
              <IconeSeta />
            </BotaoLink>
            <BotaoLink href={rotas.plataforma} variante="claro">
              Conhecer a plataforma
            </BotaoLink>
          </div>
        </div>

        <BuscaEspecies />

        <div className="mt-10 flex flex-col gap-2 border-t border-white/15 pt-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="flex items-start gap-2 py-3 text-sm text-verde-50/85">
            <span aria-hidden="true" className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full bg-laranja-500" />
            Fase de fundação: os dados de biodiversidade ainda estão sendo preparados.
          </p>
          <CreditoImagem imagem={foto} className="sm:max-w-md sm:text-right sm:[&>p]:justify-end" />
        </div>
      </div>
    </section>
  );
}
