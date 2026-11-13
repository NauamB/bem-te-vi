// Marca do Bem-te-vi: uma lente circular atravessada por faixas de relevo.
// As três faixas remetem aos biomas de Mato Grosso (Amazônia, Cerrado, Pantanal); o ponto amarelo é o
// ponto de observação. O símbolo não usa a figura do pássaro.

type MarcaProps = { className?: string; titulo?: string; idRecorte?: string };

export function Marca({ className = "h-9 w-9", titulo, idRecorte = "marca-lente" }: MarcaProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={titulo ? "img" : undefined}
      aria-hidden={titulo ? undefined : true}
      aria-label={titulo}
    >
      <defs>
        <clipPath id={idRecorte}>
          <circle cx="24" cy="24" r="21" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${idRecorte})`}>
        <path d="M0 0H48V15C36 22 26 11 13 17C8 19.5 4 20 0 19Z" fill="#2f6b4a" />
        <path d="M0 19C4 20 8 19.5 13 17C26 11 36 22 48 15V29C38 35 27 26 16 31C10 33.5 5 33 0 32Z" fill="#c9894a" />
        <path d="M0 32C5 33 10 33.5 16 31C27 26 38 35 48 29V48H0Z" fill="#2f6f73" />
        <path d="M0 25.5C6 26.5 11 25 17 23C27 19.5 36 27 48 22" fill="none" stroke="#fbf9f4" strokeOpacity=".55" strokeWidth="1" />
        <path d="M0 39C8 39.5 14 38 21 36.5C30 34.5 38 40 48 36" fill="none" stroke="#fbf9f4" strokeOpacity=".45" strokeWidth="1" />
        <path d="M0 10.5C9 12 16 8 25 8.5C33 9 40 12 48 8" fill="none" stroke="#fbf9f4" strokeOpacity=".4" strokeWidth="1" />
      </g>
      <circle cx="24" cy="24" r="21" fill="none" stroke="#0b2117" strokeWidth="2" />
      <circle cx="31.5" cy="19.5" r="3" fill="#e6b83d" stroke="#0b2117" strokeWidth="1.25" />
    </svg>
  );
}
