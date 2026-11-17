// Ícones próprios do Bem-te-vi: traço de 1,75 px, cantos arredondados, grade de 24 px. Decorativos (aria-hidden).
// Flora, Fauna e Território repetem os elementos da marca: folha com nervura, asa sob o supercílio, curvas de nível.

type IconeProps = { className?: string };
const base = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.75, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function IconeFlora({ className = "h-6 w-6" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z" />
      <path d="M5 19 14 10M9.5 14.5h4M12 12V8.5" />
    </svg>
  );
}

export function IconeFauna({ className = "h-6 w-6" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M4 8.5C7 5.5 13 4.5 20 6.5" />
      <path d="M3.5 14c3-3.5 8.5-5 13.5-3.5 1.6.5 3 1.4 3.5 2.5-1.5 3-5.5 5.5-10 5.5-3 0-5.5-1.5-7-4.5Z" />
      <circle cx="12" cy="14" r="2" />
    </svg>
  );
}

export function IconeTerritorio({ className = "h-6 w-6" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 17c3-2 5.5 1 9-1s5-3 9-1" />
      <path d="M3 12.5c3-2 5.5 1 9-1s5-3 9-1" />
      <path d="M3 8c3-2 5.5 1 9-1s5-3 9-1" />
      <circle cx="15.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconeBusca({ className = "h-5 w-5" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5" />
    </svg>
  );
}

export function IconeSeta({ className = "h-4 w-4" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function IconeFonte({ className = "h-6 w-6" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7" ry="2.5" />
      <path d="M5 6v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V6M5 12v6c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5v-6" />
    </svg>
  );
}

export function IconeMapa({ className = "h-6 w-6" }: IconeProps) {
  return (
    <svg {...base} className={className} aria-hidden="true">
      <path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  );
}
