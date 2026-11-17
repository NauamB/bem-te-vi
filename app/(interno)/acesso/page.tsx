import type { Metadata } from "next";
import { lerConfiguracaoPublicaSupabase } from "@/lib/supabase/config";
import { rotas } from "@/lib/config/site";
import { BotaoLink } from "@/components/ui/botao-link";
import { Rotulo } from "@/components/ui/rotulo";

export const metadata: Metadata = {
  title: "Acesso interno",
  description: "O acesso interno do Bem-te-vi está em construção.",
  robots: { index: false, follow: false },
};

const previsto = [
  "Entrada com conta Google, por meio do Supabase Auth.",
  "Autenticar não dará acesso automático: cada pessoa precisará de um perfil concedido por quem administra a plataforma.",
  "Perfis previstos para avaliação: administração, gestão, análise, revisão e consulta interna.",
  "Revisão e validação humanas, com justificativa e trilha de auditoria.",
];

export default function PaginaAcesso() {
  const supabaseConfigurado = lerConfiguracaoPublicaSupabase() !== null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Rotulo className="text-verde-200">Acesso interno</Rotulo>
      <h1 className="mt-4 font-display text-4xl font-extrabold tracking-[-0.035em] text-white sm:text-6xl">Em construção</h1>
      <p className="mt-6 text-lg leading-relaxed text-verde-100">
        O ambiente interno ainda não existe. Não há login nesta versão, e nenhuma tela de acesso é simulada.
      </p>

      <h2 className="mt-12 font-display text-2xl font-bold text-white">Como o acesso vai funcionar</h2>
      <ul className="mt-5 space-y-4">
        {previsto.map((item) => (
          <li key={item} className="flex gap-3 text-base leading-relaxed text-verde-100">
            <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-laranja-500" />
            {item}
          </li>
        ))}
      </ul>

      <dl className="mt-12 rounded-cartao border border-white/12 bg-verde-900/70 p-6 font-mono text-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:justify-between">
          <dt className="text-verde-300">Infraestrutura de autenticação</dt>
          <dd className="text-white">{supabaseConfigurado ? "Configuração pública presente; login ainda não implementado" : "Não configurada"}</dd>
        </div>
      </dl>

      <div className="mt-10">
        <BotaoLink href={rotas.inicio} variante="claro">
          Voltar à apresentação
        </BotaoLink>
      </div>
    </div>
  );
}
