// Ordenação e paginação de listas a partir dos parâmetros da URL
// (?sort=coluna&dir=asc|desc&page=2), usadas pelas tabelas no servidor.

export type SortDir = "asc" | "desc";
export type TableParams = { sort?: string; dir?: string; page?: string };

export const DEFAULT_PAGE_SIZE = 20;

function compare(a: unknown, b: unknown) {
  if (a === b) return 0;
  if (a === null || a === undefined || a === "") return 1; // vazios sempre no fim
  if (b === null || b === undefined || b === "") return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true, sensitivity: "base" });
}

export function sortRows<T>(rows: T[], getter: ((row: T) => unknown) | undefined, dir: SortDir) {
  if (!getter) return rows;
  const factor = dir === "desc" ? -1 : 1;
  return [...rows].sort((x, y) => {
    const a = getter(x), b = getter(y);
    // Vazios ficam no fim independentemente da direção.
    const emptyA = a === null || a === undefined || a === "", emptyB = b === null || b === undefined || b === "";
    if (emptyA || emptyB) return emptyA === emptyB ? 0 : emptyA ? 1 : -1;
    return compare(a, b) * factor;
  });
}

export function paginate<T>(rows: T[], pageParam: string | undefined, pageSize = DEFAULT_PAGE_SIZE) {
  const total = rows.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const requested = Number.parseInt(pageParam ?? "1", 10);
  const page = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), pageCount) : 1;
  const start = (page - 1) * pageSize;
  return { rows: rows.slice(start, start + pageSize), page, pageCount, total, from: total ? start + 1 : 0, to: Math.min(start + pageSize, total) };
}

/** Monta a URL mantendo os demais filtros e trocando apenas os parâmetros informados. */
export function withParams(pathname: string, current: Record<string, string | undefined>, changes: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...current, ...changes })) if (v) params.set(k, v);
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
