// Curvas de nível decorativas, geradas de forma determinística (mesmo desenho a cada build).
// É uma composição gráfica: não representa relevo, território ou dado real.

type Centro = { x: number; y: number; raioInicial: number; passo: number; niveis: number; fase: number };

type CurvasDeNivelProps = {
  className?: string;
  largura?: number;
  altura?: number;
  centros: Centro[];
};

function curva(c: Centro, nivel: number): string {
  const r = c.raioInicial + nivel * c.passo;
  const pontos = 96;
  const coords: string[] = [];
  for (let i = 0; i <= pontos; i++) {
    const t = (i / pontos) * Math.PI * 2;
    const ondulacao = 1 + 0.11 * Math.sin(3 * t + c.fase + nivel * 0.35) + 0.06 * Math.sin(5 * t - nivel * 0.5) + 0.03 * Math.cos(7 * t + c.fase);
    const x = c.x + Math.cos(t) * r * ondulacao * 1.25;
    const y = c.y + Math.sin(t) * r * ondulacao;
    coords.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return `${coords.join("")}Z`;
}

export function CurvasDeNivel({ className, largura = 800, altura = 600, centros }: CurvasDeNivelProps) {
  return (
    <svg viewBox={`0 0 ${largura} ${altura}`} className={className} aria-hidden="true" preserveAspectRatio="xMidYMid slice" fill="none">
      {centros.map((c, ci) =>
        Array.from({ length: c.niveis }, (_, n) => (
          <path key={`${ci}-${n}`} d={curva(c, n)} stroke="currentColor" strokeWidth={n % 4 === 3 ? 1.4 : 0.8} vectorEffect="non-scaling-stroke" />
        )),
      )}
    </svg>
  );
}
