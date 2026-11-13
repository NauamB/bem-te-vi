import Link from "next/link";
import { navegacaoInstitucional, rotas, site } from "@/lib/config/site";
import { Marca } from "./marca";

export function Rodape() {
  return (
    <footer className="bg-floresta-950 text-floresta-100">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-12 lg:px-8">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-3">
            <Marca className="h-10 w-10" idRecorte="marca-rodape" />
            <span className="font-display text-2xl font-semibold text-white">{site.nome}</span>
          </div>
          <p className="mt-2 font-mono text-xs uppercase tracking-[0.16em] text-floresta-300">Plataforma de Inteligência da Biodiversidade</p>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-floresta-100/85">{site.descricao}</p>
        </div>

        <nav aria-label="Links do rodapé" className="lg:col-span-4">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-floresta-300">Navegação</p>
          <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {[...navegacaoInstitucional, { rotulo: "Explorar biodiversidade", href: rotas.explorar }, { rotulo: "Acesso interno", href: rotas.acessoInterno }].map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-floresta-100 hover:text-white">
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lg:col-span-3">
          <p className="font-mono text-xs uppercase tracking-[0.16em] text-floresta-300">Versão</p>
          <p className="mt-4 text-sm text-white">
            v{site.versao} · {site.fase}
          </p>
          <p className="mt-4 text-xs leading-relaxed text-floresta-100/75">{site.aviso}</p>
        </div>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-7xl px-4 py-5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-floresta-300 sm:px-6 lg:px-8">{site.assinatura}</p>
      </div>
    </footer>
  );
}
