import Link from "next/link";
import { navegacaoInstitucional, rotas, site } from "@/lib/config/site";
import { Logotipo } from "./marca";

export function Rodape() {
  return (
    <footer className="superficie-escura relative overflow-hidden bg-verde-950 text-verde-100">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 pb-14 pt-16 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <Logotipo variante="negativo" idRecorte="marca-rodape" />
          <p className="mt-6 max-w-md text-sm leading-relaxed text-verde-100/85">{site.descricao}</p>
          <p className="mt-6 max-w-md text-xs leading-relaxed text-verde-200/80">
            Fotografias de paisagem são ilustrativas e não são registros científicos; cada uma traz autor, fonte e licença junto da imagem.
          </p>
        </div>

        <nav aria-label="Links do rodapé" className="lg:col-span-4">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verde-300">Navegação</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {[...navegacaoInstitucional, { rotulo: "Explorar biodiversidade", href: rotas.explorar }, { rotulo: "Acesso interno", href: rotas.acessoInterno }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-verde-100 transition-colors hover:text-laranja-300">
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-verde-300">Versão</p>
          <p className="mt-4 text-sm text-white">
            v{site.versao} · {site.fase}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-verde-100/75">{site.aviso}</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-verde-300">{site.assinatura}</p>
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.16em] text-verde-300">Plataforma de Inteligência da Biodiversidade</p>
        </div>
      </div>
    </footer>
  );
}
