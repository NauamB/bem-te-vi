// Normalização de texto para busca: minúsculas, sem acentos, espaços simples. A mesma função é usada na
// carga (chaves gravadas no banco) e na consulta do site, para que "Jatobá", "JATOBA" e "jatoba" coincidam.
export function normalizarBusca(texto) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
