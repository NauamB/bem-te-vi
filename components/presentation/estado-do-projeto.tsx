import { rotas, site } from "@/lib/config/site";
import { BotaoLink } from "@/components/ui/botao-link";
import { Rotulo } from "@/components/ui/rotulo";

const disponivel = ["Apresentação da plataforma", "Documentação de produto, arquitetura, governança e dados"];
const emPreparacao = [
  "Catálogo de espécies a partir de fontes científicas",
  "Registros de ocorrência com origem e licença",
  "Mapas de distribuição e camadas territoriais",
  "Área interna com autenticação, perfis e revisão humana",
];

export function EstadoDoProjeto() {
  return (
    <section id="estado" aria-labelledby="estado-titulo" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Rotulo>Estado do projeto</Rotulo>
          <h2 id="estado-titulo" className="mt-4 font-display text-3xl font-medium tracking-tight text-floresta-950 sm:text-4xl">
            Em que ponto estamos
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-pedra-700">
            Esta é a versão {site.versao}, de fundação. Nenhum dado de biodiversidade é exibido ainda: as fontes serão integradas uma a uma,
            com verificação de licença e de qualidade.
          </p>
          <div className="mt-8">
            <BotaoLink href={rotas.explorar}>Explorar biodiversidade</BotaoLink>
          </div>
        </div>

        <div className="grid gap-10 sm:grid-cols-2 lg:col-span-7">
          <div>
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-floresta-700">Disponível agora</h3>
            <ul className="mt-4 space-y-3">
              {disponivel.map((item) => (
                <li key={item} className="flex gap-3 text-base text-grafite-900">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-floresta-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-cerrado-600">Em preparação</h3>
            <ul className="mt-4 space-y-3">
              {emPreparacao.map((item) => (
                <li key={item} className="flex gap-3 text-base text-pedra-700">
                  <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full border border-cerrado-600" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <p className="border-t border-floresta-900/10 pt-6 text-sm leading-relaxed text-pedra-500 sm:col-span-2">{site.aviso}</p>
        </div>
      </div>
    </section>
  );
}
