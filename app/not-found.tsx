import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-16 sm:px-6">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-floresta-700">Erro 404</p>
      <h1 className="mt-4 font-display text-4xl font-medium text-floresta-950">Página não encontrada</h1>
      <p className="mt-4 text-lg text-pedra-700">O endereço não corresponde a nenhuma página do Bem-te-vi.</p>
      <Link href="/" className="mt-8 inline-flex min-h-11 w-fit items-center rounded-full bg-floresta-800 px-5 text-sm font-semibold text-white hover:bg-floresta-700">
        Voltar à apresentação
      </Link>
    </main>
  );
}
