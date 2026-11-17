import type { Metadata } from "next";
import Link from "next/link";
import { Simbolo } from "@/components/layout/marca";

// Metadados próprios da 404 (suportados no app/not-found.tsx raiz). A resposta continua com status HTTP 404,
// e o Next.js já injeta <meta name="robots" content="noindex"> nela; por isso não há robots aqui (evita duplicar).
export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "O endereço solicitado não corresponde a nenhuma página do Bem-te-vi.",
};

export default function NaoEncontrado() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <Simbolo className="h-12 w-auto self-start" idRecorte="marca-404" />
      <p className="mt-8 font-mono text-xs font-medium uppercase tracking-[0.18em] text-laranja-600">Erro 404</p>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.035em] text-verde-950 sm:text-5xl">Página não encontrada</h1>
      <p className="mt-4 text-lg text-tinta-600">O endereço não corresponde a nenhuma página do Bem-te-vi.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 w-fit items-center rounded-full bg-laranja-500 px-5 text-sm font-semibold text-verde-950 transition-colors hover:bg-laranja-400"
      >
        Voltar à apresentação
      </Link>
    </main>
  );
}
