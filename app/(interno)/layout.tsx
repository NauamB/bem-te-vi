import Link from "next/link";
import { Marca } from "@/components/layout/marca";
import { rotas, site } from "@/lib/config/site";

// Ambiente interno: exigirá autenticação (Supabase Auth) e autorização por perfil em fase própria.
// Nesta fase não há sessão, login nem simulação de acesso.
export default function LayoutInterno({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-floresta-950 text-floresta-50">
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={rotas.inicio} className="flex min-h-11 items-center gap-3" aria-label={`${site.nome} — página inicial`}>
            <Marca className="h-9 w-9" idRecorte="marca-interno" />
            <span className="font-display text-xl font-semibold text-white">{site.nome}</span>
          </Link>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.16em] text-floresta-300">Ambiente interno</span>
        </div>
      </header>
      <main id="conteudo" className="flex-1">
        {children}
      </main>
    </div>
  );
}
