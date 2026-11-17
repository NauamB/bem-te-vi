// Marca do Bem-te-vi — "o olhar do bem-te-vi" (Fase 11.5A). Guia: docs/identidade/IDENTIDADE_VISUAL.md.
//
// O nome da ave é um verbo de observação: "bem te vi". O símbolo é um olho em forma de folha, sob a listra
// (supercílio) que identifica o bem-te-vi. Dentro dele, a metade de cima é floresta (flora), a de baixo é água,
// separadas por uma linha de relevo (território), e as curvas claras são curvas de nível. A íris é uma lente com
// anel topográfico e, no centro, o ponto laranja: o ponto de observação, onde dado, espécie e lugar se encontram.
// Fauna (a ave), flora, ecossistemas, território e ciência num único sinal, sem desenhar só um pássaro ou uma folha.

const FOLHA = "M5 39C15 26 39 21.5 59 30.5C50 46.5 25 52.5 5 39Z";

type Variante = "positivo" | "negativo";
type SimboloProps = { variante?: Variante; className?: string; titulo?: string; idRecorte?: string };

// positivo: sobre fundos claros · negativo: sobre fundos escuros (verde profundo, fotografia escurecida).
export function Simbolo({ variante = "positivo", className = "h-9 w-auto", titulo, idRecorte = "marca-folha" }: SimboloProps) {
  const escuro = variante === "negativo";
  const tinta = escuro ? "#eaf4ee" : "#082f1a";
  return (
    <svg viewBox="2 9 60 46" className={className} role={titulo ? "img" : undefined} aria-hidden={titulo ? undefined : true} aria-label={titulo}>
      <defs>
        <clipPath id={idRecorte}>
          <path d={FOLHA} />
        </clipPath>
      </defs>
      <path d="M7.5 27C19 16.5 41 12 60.5 19C43 16.5 24.5 19.5 11 29.5Z" fill={tinta} />
      <g clipPath={`url(#${idRecorte})`}>
        <rect x="0" y="0" width="64" height="64" fill={escuro ? "#3e9b5e" : "#1b6b3a"} />
        <path d="M0 41.5C10 38.5 19 43 30 40S50 32.5 64 34.5V64H0Z" fill={escuro ? "#3a9cc0" : "#247c9b"} />
        <path d="M0 47.5C11 44.5 20 49 31 46S52 39 64 41" fill="none" stroke="#eaf4ee" strokeOpacity=".4" strokeWidth="1.1" />
        <path d="M0 34C12 31 22 34 32 31S52 25 64 27" fill="none" stroke="#eaf4ee" strokeOpacity=".3" strokeWidth="1.1" />
      </g>
      <path d={FOLHA} fill="none" stroke={tinta} strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="31" cy="37.5" r="9.6" fill="#eaf4ee" stroke={tinta} strokeWidth="2.2" />
      <circle cx="31" cy="37.5" r="6.4" fill="none" stroke={escuro ? "#0f4c28" : "#1b6b3a"} strokeWidth="1" strokeOpacity=".5" />
      <circle cx="31" cy="37.5" r="3.9" fill="#f97316" />
    </svg>
  );
}

type LogotipoProps = {
  variante?: Variante;
  orientacao?: "horizontal" | "vertical";
  assinatura?: boolean;
  idRecorte?: string;
  className?: string;
};

// Logotipo: símbolo + nome (Manrope ExtraBold) + assinatura opcional (IBM Plex Mono).
export function Logotipo({ variante = "positivo", orientacao = "horizontal", assinatura = true, idRecorte, className = "" }: LogotipoProps) {
  const escuro = variante === "negativo";
  const nome = escuro ? "text-white" : "text-verde-950";
  const linha = escuro ? "text-verde-200" : "text-verde-600";
  if (orientacao === "vertical") {
    return (
      <span className={`inline-flex flex-col items-center text-center ${className}`}>
        <Simbolo variante={variante} idRecorte={idRecorte} className="h-14 w-auto" />
        <span className={`mt-3 font-display text-3xl font-extrabold leading-none tracking-[-0.03em] ${nome}`}>Bem-te-vi</span>
        {assinatura && <span className={`mt-2 font-mono text-[0.62rem] font-medium uppercase tracking-[0.2em] ${linha}`}>Inteligência da biodiversidade</span>}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Simbolo variante={variante} idRecorte={idRecorte} className="h-8 w-auto shrink-0 sm:h-9" />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.35rem] font-extrabold tracking-[-0.03em] ${nome}`}>Bem-te-vi</span>
        {assinatura && <span className={`mt-1 hidden font-mono text-[0.58rem] font-medium uppercase tracking-[0.2em] sm:block ${linha}`}>Inteligência da biodiversidade</span>}
      </span>
    </span>
  );
}
