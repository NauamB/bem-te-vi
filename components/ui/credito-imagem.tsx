import { AVISO_IMAGEM, type ImagemPaisagem } from "@/lib/conteudo/imagens";

// Crédito obrigatório de cada fotografia (CC BY-SA 4.0), no formato título–autor–fonte–licença, mais as alterações:
// natureza ilustrativa e local; obra (link para a página do arquivo no Wikimedia Commons, a fonte original);
// autor; licença com link; e o que o projeto modificou. Links com 44 px de altura para toque.
export function CreditoImagem({ imagem, tom = "claro", className = "" }: { imagem: ImagemPaisagem; tom?: "claro" | "escuro"; className?: string }) {
  const cor = tom === "claro" ? "text-white/85" : "text-tinta-600";
  const link = tom === "claro" ? "text-white decoration-white/50 hover:decoration-white" : "text-verde-800 decoration-verde-800/40 hover:decoration-verde-800";
  return (
    <div className={`font-mono text-[0.68rem] leading-snug ${cor} ${className}`}>
      <p>
        {AVISO_IMAGEM} · {imagem.local}
      </p>
      <p className="flex flex-wrap items-center gap-x-1.5">
        <a href={imagem.fonte} className={`inline-flex min-h-11 items-center underline underline-offset-2 ${link}`}>
          “{imagem.obra}”
        </a>
        <span>
          de {imagem.autor}, via Wikimedia Commons, licença
        </span>
        <a href={imagem.urlLicenca} rel="license" className={`inline-flex min-h-11 items-center underline underline-offset-2 ${link}`}>
          {imagem.licenca}
        </a>
      </p>
      <p>Alterações: {imagem.alteracoes}.</p>
    </div>
  );
}
