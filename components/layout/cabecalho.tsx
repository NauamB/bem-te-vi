import Link from "next/link";
import { navegacaoInstitucional, rotas, site } from "@/lib/config/site";
import { MenuMovel } from "@/components/navigation/menu-movel";
import { BotaoLink } from "@/components/ui/botao-link";
import { Logotipo } from "./marca";

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-40 border-b border-linha bg-white/95 backdrop-blur-sm supports-[backdrop-filter]:bg-white/88">
      <div className="relative mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={rotas.inicio} className="flex min-h-11 items-center rounded-lg" aria-label={`${site.nome} — página inicial`}>
          <Logotipo idRecorte="marca-cabecalho" />
        </Link>

        <nav aria-label="Navegação institucional" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {navegacaoInstitucional.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="relative inline-flex min-h-11 items-center rounded-full px-3.5 text-sm font-medium text-tinta-600 transition-colors hover:bg-verde-50 hover:text-verde-900"
                >
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <BotaoLink href={rotas.acessoInterno} variante="secundario">
            Acesso interno
          </BotaoLink>
          <BotaoLink href={rotas.explorar}>Explorar biodiversidade</BotaoLink>
        </div>

        <MenuMovel itens={navegacaoInstitucional} />
      </div>
    </header>
  );
}
