// Validação dos parâmetros da API pública. Tudo o que chega pela URL é validado aqui antes de qualquer
// consulta: parâmetro desconhecido, repetido ou fora do formato gera 400, sem tocar no banco.

export class ErroParametro extends Error {
  parametro: string;
  constructor(parametro: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroParametro";
    this.parametro = parametro;
  }
}

export class ErroNaoEncontrado extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroNaoEncontrado";
  }
}

export const GRUPOS = ["flora", "fauna", "fungos", "outros"] as const;
export type Grupo = (typeof GRUPOS)[number];

// Lê só os parâmetros permitidos; cada um no máximo uma vez. Valores vazios contam como ausentes.
export function lerParametros(busca: URLSearchParams, permitidos: readonly string[]): Map<string, string> {
  const valores = new Map<string, string>();
  for (const nome of new Set(busca.keys())) {
    if (!permitidos.includes(nome)) throw new ErroParametro(nome, `parâmetro desconhecido: ${nome}`);
    const todos = busca.getAll(nome);
    if (todos.length > 1) throw new ErroParametro(nome, `parâmetro repetido: ${nome}`);
    const valor = todos[0].trim();
    if (valor.length > 200) throw new ErroParametro(nome, `valor longo demais: ${nome}`);
    if (valor) valores.set(nome, valor);
  }
  return valores;
}

export function inteiro(valor: string | undefined, nome: string, minimo: number, maximo: number): number | undefined {
  if (valor === undefined) return undefined;
  if (!/^-?\d{1,10}$/.test(valor)) throw new ErroParametro(nome, `${nome} deve ser um número inteiro`);
  const n = Number(valor);
  if (n < minimo || n > maximo) throw new ErroParametro(nome, `${nome} deve estar entre ${minimo} e ${maximo}`);
  return n;
}

// Identificadores internos (bigint no banco), sempre positivos.
export const identificador = (valor: string | undefined, nome: string) => inteiro(valor, nome, 1, 2_147_483_647);

export function limite(valor: string | undefined, padrao: number, maximo: number): number {
  return inteiro(valor, "limite", 1, maximo) ?? padrao;
}

export function grupo(valor: string | undefined): Grupo | undefined {
  if (valor === undefined) return undefined;
  if (!(GRUPOS as readonly string[]).includes(valor)) throw new ErroParametro("grupo", `grupo deve ser um de: ${GRUPOS.join(", ")}`);
  return valor as Grupo;
}

// Código IBGE de município: 7 dígitos.
export function codigoMunicipio(valor: string | undefined): string | undefined {
  if (valor === undefined) return undefined;
  if (!/^\d{7}$/.test(valor)) throw new ErroParametro("municipio", "municipio deve ser o código IBGE de 7 dígitos");
  return valor;
}

// Cursor opaco de paginação (base64url de JSON). Conteúdo inválido gera 400.
export function codificarCursor(valor: unknown): string {
  return Buffer.from(JSON.stringify(valor), "utf8").toString("base64url");
}

export function decodificarCursor<T>(valor: string | undefined, valido: (v: unknown) => v is T): T | undefined {
  if (valor === undefined) return undefined;
  try {
    const v: unknown = JSON.parse(Buffer.from(valor, "base64url").toString("utf8"));
    if (valido(v)) return v;
  } catch {
    // cai no erro abaixo
  }
  throw new ErroParametro("apos", "cursor de paginação inválido");
}
