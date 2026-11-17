import Image from "next/image";
import { imagens, type ImagemPaisagem } from "@/lib/conteudo/imagens";
import { CreditoImagem } from "@/components/ui/credito-imagem";
import { Rotulo } from "@/components/ui/rotulo";

const biomas: { nome: string; texto: string; foto: ImagemPaisagem; cor: string }[] = [
  { nome: "Amazônia", texto: "Florestas tropicais, predominantes na porção norte do estado.", foto: imagens.amazonia, cor: "bg-verde-400" },
  { nome: "Cerrado", texto: "Savanas, campos e formações florestais na porção central e leste.", foto: imagens.cerrado, cor: "bg-terra-400" },
  { nome: "Pantanal", texto: "Planície sujeita a inundações periódicas, no sudoeste.", foto: imagens.pantanal, cor: "bg-agua-400" },
];

export function MatoGrosso() {
  return (
    <section id="mato-grosso" aria-labelledby="mt-titulo" className="superficie-escura bg-verde-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <Rotulo className="text-laranja-300">Território inicial</Rotulo>
            <h2 id="mt-titulo" className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
              Mato Grosso, onde três biomas se encontram
            </h2>
          </div>
          <div className="space-y-5 lg:col-span-6 lg:pt-10">
            <p className="text-lg leading-relaxed text-verde-100">
              O Bem-te-vi começa por Mato Grosso, estado que reúne Amazônia, Cerrado e Pantanal e seus 142 municípios (IBGE). Essa diversidade de
              paisagens é o primeiro território de trabalho da plataforma.
            </p>
            <p className="text-base leading-relaxed text-verde-100/80">
              A arquitetura não se limita ao estado: códigos territoriais e geometrias seguem referências nacionais desde o início, para que outras
              unidades da federação possam ser incorporadas sem refazer a base.
            </p>
          </div>
        </div>

        <ul className="mt-14 grid gap-8 md:grid-cols-3 md:gap-6">
          {biomas.map((b) => (
            <li key={b.nome} className="flex flex-col">
              <div className="relative aspect-[4/3] overflow-hidden rounded-cartao bg-verde-950">
                <Image src={b.foto.arquivo} alt={b.foto.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover" />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <span aria-hidden="true" className={`h-3 w-3 shrink-0 rounded-full ${b.cor}`} />
                <h3 className="font-display text-2xl font-bold tracking-[-0.02em]">{b.nome}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-verde-100/85">{b.texto}</p>
              <CreditoImagem imagem={b.foto} className="mt-2" />
            </li>
          ))}
        </ul>
        <p className="mt-10 border-t border-white/10 pt-5 font-mono text-[0.7rem] leading-relaxed text-verde-300">
          Descrição geral. A delimitação oficial dos biomas (IBGE) será integrada em fase própria. As fotografias são ilustrativas e não representam
          registros da plataforma.
        </p>
      </div>
    </section>
  );
}
