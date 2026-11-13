import Link from "next/link";
import type { ReactNode } from "react";

// Link com aparência de botão. Altura mínima de 44 px para toque.
const variantes = {
  primario: "bg-floresta-800 text-white hover:bg-floresta-700",
  secundario: "border border-floresta-800/30 text-floresta-900 hover:border-floresta-800 hover:bg-floresta-50",
  sol: "bg-sol-300 text-grafite-900 hover:bg-sol-400",
  claro: "border border-white/35 text-white hover:border-white hover:bg-white/10",
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
