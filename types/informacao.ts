// Natureza da informação: toda informação do Bem-te-vi pertencerá a exatamente uma destas categorias,
// e elas nunca serão misturadas (no banco, na API ou na interface). Ver docs/dados/ESTRATEGIA_DE_DADOS.md.

export type NaturezaInformacao =
  | "original"
  | "normalizado"
  | "derivado"
  | "registro-usuario"
  | "interpretacao"
  | "decisao-humana";

export type DescricaoNatureza = { natureza: NaturezaInformacao; rotulo: string; descricao: string };

export const naturezasInformacao: readonly DescricaoNatureza[] = [
  { natureza: "original", rotulo: "Dado original", descricao: "Como recebido da fonte, com licença e data de obtenção." },
  { natureza: "normalizado", rotulo: "Dado tratado", descricao: "Padronizado por regras versionadas, sem perder o vínculo com o original." },
  { natureza: "derivado", rotulo: "Dado derivado", descricao: "Resultado de cruzamentos e contagens, com método e data." },
  { natureza: "registro-usuario", rotulo: "Registro de usuário", descricao: "Cadastrado por pessoa identificada, sempre marcado como tal." },
  { natureza: "interpretacao", rotulo: "Interpretação", descricao: "Leitura produzida por regras, com o que permite e não permite concluir." },
  { natureza: "decisao-humana", rotulo: "Decisão humana", descricao: "Validação feita por pessoa autorizada, com justificativa registrada." },
];
