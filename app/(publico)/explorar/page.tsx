import type { Metadata } from "next";
import { rotas } from "@/lib/config/site";
import { BotaoLink } from "@/components/ui/botao-link";
import { Rotulo } from "@/components/ui/rotulo";

export const metadata: Metadata = {
  title: "Explorar biodiversidade",
  description: "Área de exploração pública do Bem-te-vi. Os dados de biodiversidade ainda estão sendo preparados.",
};

const modulos = [
  { nome: "Espécies", texto: "Busca por nome científico ou popular, com taxonomia e fontes." },
  { nome: "Registros de ocorrência", texto: "Registros de fauna e flora com data, origem, licença e incerteza da coordenada." },
  { nome: "Mapa", texto: "Distribuição geográfica com camadas de municípios, biomas e áreas protegidas." },
  { nome: "Territórios", texto: "Leitura por município, bioma ou área protegida." },
  { nome: "Fontes e metadados", texto: "Cobertura, licença e última atualização de cada fonte." },
] as const;

export default function PaginaExplorar() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
      <Rotulo>Observatório público</Rotulo>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-floresta-950 sm:text-5xl">Explorar biodiversidade</h1>

      <div role="status" className="mt-10 rounded-2xl border border-sol-400/60 bg-sol-300/20 p-6 sm:p-8">
        <p className="font-display text-xl font-medium text-floresta-950">Os dados ainda estão sendo preparados.</p>
        <p className="mt-3 text-base leading-relaxed text-pedra-700">
          Nesta versão de fundação, nenhuma consulta está disponível e nenhum dado é exibido. Cada fonte científica será integrada com
          verificação de licença, origem e qualidade antes de aparecer aqui.
        </p>
      </div>

      <h2 className="mt-14 font-display text-2xl font-medium text-floresta-950">O que esta área vai oferecer</h2>
      <ul className="mt-6 divide-y divide-floresta-900/10 border-y border-floresta-900/10">
        {modulos.map((m) => (
          <li key={m.nome} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-baseline sm:gap-6">
            <span className="font-display text-lg font-medium text-floresta-950 sm:w-56 sm:shrink-0">{m.nome}</span>
            <span className="flex-1 text-base leading-relaxed text-pedra-700">{m.texto}</span>
            <span className="w-fit rounded-full border border-cerrado-600/40 px-2.5 py-0.5 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-cerrado-600">
              Previsto
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <BotaoLink href={rotas.inicio} variante="secundario">
          Voltar à apresentação
        </BotaoLink>
        <BotaoLink href="/#principios" variante="secundario">
          Conhecer os princípios
        </BotaoLink>
      </div>
    </div>
  );
}
