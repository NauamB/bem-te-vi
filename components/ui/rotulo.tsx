import type { ReactNode } from "react";

// Rótulo de seção em fonte de dados (monoespaçada), usado como "legenda cartográfica" dos títulos.
export function Rotulo({ children, className = "text-floresta-700" }: { children: ReactNode; className?: string }) {
  return <p className={`font-mono text-xs font-medium uppercase tracking-[0.18em] ${className}`}>{children}</p>;
}
