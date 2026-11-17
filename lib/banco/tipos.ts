// Contrato de acesso ao banco usado pelos módulos da API pública.
// Os módulos (lib/modulos) não abrem conexão: recebem uma função `Consultar` que executa uma consulta
// parametrizada e devolve as linhas. Em produção ela vem de lib/banco/leitura.ts (papel de leitura do site,
// transação READ ONLY, só o schema publico); nos testes, de um PGlite com SET ROLE bemtevi_leitura.

export type Linha = Record<string, unknown>;
export type Consultar = (texto: string, parametros?: readonly unknown[]) => Promise<Linha[]>;

// Banco não configurado ou fora do ar: a API responde 503, sem detalhes internos.
export class ErroBancoIndisponivel extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroBancoIndisponivel";
  }
}
