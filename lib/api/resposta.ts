// Respostas da API pública: JSON com os dados e os metadados obrigatórios (natureza, fontes, licenças).
// Erros viram status HTTP sem detalhes internos; respostas de sucesso podem ser guardadas pela CDN por 1 hora.
import type { NaturezaInformacao } from "../../types/informacao.ts";
import { ErroBancoIndisponivel } from "../banco/tipos.ts";
import { ErroNaoEncontrado, ErroParametro } from "./parametros.ts";

export type FonteCitada = {
  tipo: "download-gbif" | "conjunto-de-dados" | "referencia";
  titulo: string;
  publicador?: string | null;
  licenca?: string | null;
  citacao?: string | null;
  doi?: string | null;
  url?: string | null;
};

export type Metadados = {
  natureza: NaturezaInformacao[];
  descricao: string;
  fontes: FonteCitada[];
  licencas: string[];
  aviso: string;
  gerado_em: string;
};

export const AVISO_LOCALIZACAO =
  "Coordenadas precisas nunca são publicadas: cada registro aparece na célula de 0,1° (cerca de 11 km) que o contém ou, se sensível, só no município.";
export const AVISO_FONTES = "A lista completa de conjuntos de dados, publicadores, licenças e citações está em /api/v1/fontes.";

export function metadados(m: Omit<Metadados, "gerado_em">): Metadados {
  return { ...m, licencas: [...new Set(m.licencas)].sort(), gerado_em: new Date().toISOString() };
}

const CABECALHOS = { "content-type": "application/json; charset=utf-8" };

export function respostaOk(corpo: object): Response {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { ...CABECALHOS, "cache-control": "public, s-maxage=3600, stale-while-revalidate=86400" },
  });
}

export function respostaErro(status: number, codigo: string, mensagem: string, parametro?: string): Response {
  return new Response(JSON.stringify({ erro: { codigo, mensagem, ...(parametro ? { parametro } : {}) } }), {
    status,
    headers: { ...CABECALHOS, "cache-control": "no-store" },
  });
}

// Executa o tratamento de uma rota e converte erros conhecidos em respostas.
export async function responder(tratar: () => Promise<Response>): Promise<Response> {
  try {
    return await tratar();
  } catch (erro) {
    if (erro instanceof ErroParametro) return respostaErro(400, "parametro_invalido", erro.message, erro.parametro);
    if (erro instanceof ErroNaoEncontrado) return respostaErro(404, "nao_encontrado", erro.message);
    if (erro instanceof ErroBancoIndisponivel) return respostaErro(503, "banco_indisponivel", "Os dados estão temporariamente indisponíveis.");
    console.error("API pública: erro inesperado", erro instanceof Error ? erro.message : erro);
    return respostaErro(500, "erro_interno", "Erro interno ao consultar os dados.");
  }
}
