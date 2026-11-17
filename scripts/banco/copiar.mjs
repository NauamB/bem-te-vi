// Cópia em massa (COPY, formato texto do PostgreSQL) para o banco local PGlite.
// Valores: null → \N; arrays → literal de array; demais → texto, com barra, tabulação e quebras escapadas.

const escaparTexto = (s) => s.replace(/\\/g, "\\\\").replace(/\t/g, "\\t").replace(/\n/g, "\\n").replace(/\r/g, "\\r");
const literalArray = (itens) => `{${itens.map((i) => `"${String(i).replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(",")}}`;

export function campoCopy(valor) {
  if (valor === null || valor === undefined) return "\\N";
  if (Array.isArray(valor)) return escaparTexto(literalArray(valor));
  return escaparTexto(String(valor));
}

// Copia `linhas` (arrays na ordem de `colunas`) para `tabela`. Retorna o número de linhas copiadas.
export async function copiar(db, tabela, colunas, linhas) {
  if (linhas.length === 0) return 0;
  const corpo = linhas.map((l) => l.map(campoCopy).join("\t")).join("\n") + "\n";
  await db.query(`copy ${tabela} (${colunas.join(", ")}) from '/dev/blob'`, [], { blob: new Blob([corpo]) });
  return linhas.length;
}
