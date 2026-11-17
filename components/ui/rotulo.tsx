import type { ReactNode } from "react";

// Rótulo de seção em fonte de dados (monoespaçada), com o traço laranja da marca: a "legenda" dos títulos.
export function Rotulo({ children, className = "text-verde-600" }: { children: ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-3 font-mono text-xs font-medium uppercase tracking-[0.18em] ${className}`}>
      <span aria-hidden="true" className="h-px w-6 bg-laranja-500" />
      {children}
    </p>
  );
}
