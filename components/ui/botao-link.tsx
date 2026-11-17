import Link from "next/link";
import type { ReactNode } from "react";

// Link com aparência de botão. Altura mínima de 44 px para toque.
// primario: a ação principal da tela (laranja, o "ponto de observação" da marca) · verde: ação institucional ·
// secundario: alternativa em fundo claro · claro: alternativa em fundo escuro ou sobre fotografia.
const variantes = {
  primario: "bg-laranja-500 text-verde-950 hover:bg-laranja-400 active:bg-laranja-500",
  verde: "bg-verde-800 text-white hover:bg-verde-700 active:bg-verde-900",
  secundario: "border border-verde-800/25 bg-white text-verde-900 hover:border-verde-800 hover:bg-verde-50",
  claro: "border border-white/45 text-white hover:border-white hover:bg-white/10",
} as const;

type BotaoLinkProps = {
  href: string;
  children: ReactNode;
  variante?: keyof typeof variantes;
  className?: string;
};

export function BotaoLink({ href, children, variante = "primario", className = "" }: BotaoLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold tracking-tight transition-colors ${variantes[variante]} ${className}`}
    >
      {children}
    </Link>
  );
}
