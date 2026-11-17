// Conversão das linhas do banco. O driver de produção devolve bigint e numeric como texto; o PGlite dos testes,
// como número. Os módulos convertem explicitamente para o mesmo formato nos dois casos.

export const numero = (v: unknown): number => Number(v);
export const numeroOuNulo = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));
export const textoOuNulo = (v: unknown): string | null => (v === null || v === undefined ? null : String(v));
export const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : []);
