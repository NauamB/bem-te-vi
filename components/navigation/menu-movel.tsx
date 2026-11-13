"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import type { ItemNavegacao } from "@/lib/config/site";
import { rotas } from "@/lib/config/site";

// Menu para telas menores que 1024 px. Fecha ao escolher um destino ou com Esc.
export function MenuMovel({ itens }: { itens: ItemNavegacao[] }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const fechar = () => setAberto(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={aberto}
        aria-controls={id}
        onClick={() => setAberto((v) => !v)}
        className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-floresta-800/25 px-4 text-sm font-semibold text-floresta-900"
      >
        <span aria-hidden="true" className="flex w-4 flex-col gap-1">
          <span className={`h-0.5 bg-current transition-transform ${aberto ? "translate-y-1.5 rotate-45" : ""}`} />
          <span className={`h-0.5 bg-current transition-opacity ${aberto ? "opacity-0" : ""}`} />
          <span className={`h-0.5 bg-current transition-transform ${aberto ? "-translate-y-1.5 -rotate-45" : ""}`} />
        </span>
        {aberto ? "Fechar" : "Menu"}
      </button>
      <div
        id={id}
        hidden={!aberto}
        className="absolute inset-x-0 top-full border-b border-floresta-900/10 bg-areia-50 px-4 pb-6 pt-2 shadow-lg sm:px-6"
      >
        <nav aria-label="Navegação principal">
          <ul className="divide-y divide-floresta-900/10">
            {itens.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={fechar} className="flex min-h-12 items-center text-base font-medium text-grafite-900">
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href={rotas.explorar} onClick={fechar} className="inline-flex min-h-11 items-center justify-center rounded-full bg-floresta-800 px-5 text-sm font-semibold text-white">
            Explorar biodiversidade
          </Link>
          <Link href={rotas.acessoInterno} onClick={fechar} className="inline-flex min-h-11 items-center justify-center rounded-full border border-floresta-800/30 px-5 text-sm font-semibold text-floresta-900">
            Acesso interno
          </Link>
        </div>
      </div>
    </div>
  );
}
