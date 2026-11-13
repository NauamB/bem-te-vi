import Link from "next/link";
import { navegacaoInstitucional, rotas, site } from "@/lib/config/site";
import { MenuMovel } from "@/components/navigation/menu-movel";
import { BotaoLink } from "@/components/ui/botao-link";
import { Marca } from "./marca";

export function Cabecalho() {
  return (
    <header className="sticky top-0 z-40 border-b border-floresta-900/10 bg-areia-50/92 backdrop-blur supports-[backdrop-filter]:bg-areia-50/80">
      <div className="relative mx-auto flex h-18 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href={rotas.inicio} className="flex min-h-11 items-center gap-3" aria-label={`${site.nome} — página inicial`}>
          <Marca className="h-9 w-9 shrink-0" idRecorte="marca-cabecalho" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-semibold tracking-tight text-floresta-900">{site.nome}</span>
            <span className="mt-1 hidden font-mono text-[0.65rem] uppercase tracking-[0.16em] text-pedra-500 sm:block">{site.assinatura}</span>
          </span>
        </Link>

        <nav aria-label="Navegação institucional" className="hidden lg:block">
          <ul className="flex items-center gap-7">
            {navegacaoInstitucional.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="inline-flex min-h-11 items-center text-sm font-medium text-pedra-700 transition-colors hover:text-floresta-800">
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
