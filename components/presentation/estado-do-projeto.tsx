import { rotas, site } from "@/lib/config/site";
import { BotaoLink } from "@/components/ui/botao-link";
import { IconeSeta } from "@/components/ui/icones";
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
    <section id="estado" aria-labelledby="estado-titulo" className="border-t border-linha bg-papel-50">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
          <div className="lg:col-span-5">
            <Rotulo>Estado do projeto</Rotulo>
            <h2 id="estado-titulo" className="mt-4 font-display text-4xl font-extrabold tracking-[-0.03em] text-verde-950 sm:text-5xl">
              Em que ponto estamos
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-tinta-600">
              Esta é a versão {site.versao}, de fundação. Nenhum dado de biodiversidade é exibido ainda: as fontes serão integradas uma a uma,
              com verificação de licença e de qualidade.
            </p>
            <div className="mt-8">
              <BotaoLink href={rotas.explorar}>
                Explorar biodiversidade
                <IconeSeta />
              </BotaoLink>
            </div>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:col-span-7">
            <div className="rounded-cartao border border-linha bg-white p-6">
              <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-verde-700">Disponível agora</h3>
              <ul className="mt-4 space-y-3">
                {disponivel.map((item) => (
                  <li key={item} className="flex gap-3 text-base text-tinta-800">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-verde-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-cartao border border-linha bg-white p-6">
              <h3 className="font-mono text-xs font-medium uppercase tracking-[0.14em] text-laranja-600">Em preparação</h3>
              <ul className="mt-4 space-y-3">
                {emPreparacao.map((item) => (
                  <li key={item} className="flex gap-3 text-base text-tinta-600">
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full border border-laranja-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm leading-relaxed text-tinta-500 sm:col-span-2">{site.aviso}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
