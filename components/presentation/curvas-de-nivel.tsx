// Curvas de nível decorativas, servidas como SVG estático (public/decoracao/, gerado por scripts/gerar-decoracao.mjs).
// É uma composição gráfica: não representa relevo, território ou dado real. Como fundo CSS, fica fora do HTML,
// do payload do React e da árvore de acessibilidade; o aria-hidden reforça que é puramente decorativa.

const arquivos = {
  hero: "/decoracao/curvas-hero.svg",
  painel: "/decoracao/curvas-painel.svg",
  "mato-grosso": "/decoracao/curvas-mato-grosso.svg",
} as const;

type CurvasDeNivelProps = { composicao: keyof typeof arquivos; className?: string };

export function CurvasDeNivel({ composicao, className = "" }: CurvasDeNivelProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 bg-no-repeat [background-size:100%_100%] ${className}`}
      style={{ backgroundImage: `url(${arquivos[composicao]})` }}
    />
  );
}
