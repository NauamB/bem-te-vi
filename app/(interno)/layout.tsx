import Link from "next/link";
import { Logotipo } from "@/components/layout/marca";
import { CurvasDeNivel } from "@/components/presentation/curvas-de-nivel";
import { rotas, site } from "@/lib/config/site";

// Ambiente interno: exigirá autenticação (Supabase Auth) e autorização por perfil em fase própria.
// Nesta fase não há sessão, login nem simulação de acesso.
export default function LayoutInterno({ children }: { children: React.ReactNode }) {
  return (
    <div className="superficie-escura relative flex min-h-dvh flex-col overflow-hidden bg-verde-950 text-verde-50">
      <CurvasDeNivel composicao="mato-grosso" />
      <header className="relative border-b border-white/10">
        <div className="mx-auto flex h-18 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href={rotas.inicio} className="flex min-h-11 items-center rounded-lg" aria-label={`${site.nome} — página inicial`}>
            <Logotipo variante="negativo" assinatura={false} idRecorte="marca-interno" />
          </Link>
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.18em] text-laranja-300">Ambiente interno</span>
        </div>
      </header>
      <main id="conteudo" className="relative flex-1">
        {children}
      </main>
    </div>
  );
}
