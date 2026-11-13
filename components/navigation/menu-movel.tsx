"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { ItemNavegacao } from "@/lib/config/site";
import { rotas } from "@/lib/config/site";

// O roteador do Next.js 16 rola até o destino, mas não move o foco (comportamento documentado no próprio
// layout-router). Sem isto, o foco ficaria no link do menu que acabou de ser ocultado. Leva o foco à seção
// da âncora ou ao conteúdo principal (#conteudo) assim que a nova página estiver no lugar.
function focarDestino(href: string) {
  const url = new URL(href, window.location.href);
  const alvoId = url.hash ? decodeURIComponent(url.hash.slice(1)) : "conteudo";
  const limite = performance.now() + 2000;
  let quadrosEstaveis = 0;
  const tentar = () => {
    const alvo = window.location.pathname === url.pathname ? document.getElementById(alvoId) : null;
    if (alvo?.isConnected) {
      if (document.activeElement !== alvo) {
        if (!alvo.hasAttribute("tabindex")) alvo.setAttribute("tabindex", "-1");
        alvo.focus({ preventScroll: true });
        quadrosEstaveis = 0;
      } else if (++quadrosEstaveis >= 3) return;
    }
    if (performance.now() < limite) requestAnimationFrame(tentar);
  };
  requestAnimationFrame(tentar);
}

// Menu para telas menores que 1024 px. Ao abrir, o foco permanece no botão e o Tab segue para os links
// (o painel vem logo depois no documento, sem armadilha de foco). Esc fecha e devolve o foco ao botão.
export function MenuMovel({ itens }: { itens: ItemNavegacao[] }) {
  const [aberto, setAberto] = useState(false);
  const id = useId();
  const botaoRef = useRef<HTMLButtonElement>(null);

  const fecharComEsc = useCallback((e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    setAberto(false);
    botaoRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!aberto) return;
    window.addEventListener("keydown", fecharComEsc);
    return () => window.removeEventListener("keydown", fecharComEsc);
  }, [aberto, fecharComEsc]);

  const escolher = (href: string) => {
    setAberto(false);
    focarDestino(href);
  };

  return (
    <div className="lg:hidden">
      <button
        ref={botaoRef}
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
                <Link href={item.href} onClick={() => escolher(item.href)} className="flex min-h-12 items-center text-base font-medium text-grafite-900">
                  {item.rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link href={rotas.explorar} onClick={() => escolher(rotas.explorar)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-floresta-800 px-5 text-sm font-semibold text-white">
            Explorar biodiversidade
          </Link>
          <Link href={rotas.acessoInterno} onClick={() => escolher(rotas.acessoInterno)} className="inline-flex min-h-11 items-center justify-center rounded-full border border-floresta-800/30 px-5 text-sm font-semibold text-floresta-900">
            Acesso interno
          </Link>
        </div>
      </div>
    </div>
  );
}
