import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_PAGE_SIZE, paginate, sortRows, withParams, type SortDir } from "@/lib/table";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Oculta a coluna no celular (no modo cartão e na tabela). */
  hideOnMobile?: boolean;
  /** Permite ordenar pela coluna; a chave aparece na URL (?sort=). */
  sortKey?: string;
  sortValue?: (row: T) => unknown;
}

/** Quando informado, a tabela ordena e pagina pelos parâmetros da URL. */
export type TableNavigation = { pathname: string; params: Record<string, string | undefined>; pageSize?: number };

/**
 * Tabela padrão. No celular (< sm) cada linha vira um cartão empilhado — a
 * primeira coluna é o título e as demais aparecem como pares rótulo/valor —
 * para que valores, status e ações nunca fiquem fora da tela.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows: allRows,
  emptyLabel = "Nenhum registro encontrado.",
  navigation,
}: {
  columns: Column<T>[];
  rows: T[];
  emptyLabel?: string;
  navigation?: TableNavigation;
}) {
  if (allRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center">
        <p className="text-sm font-medium text-ink-700">{emptyLabel}</p>
        <p className="text-xs text-ink-500">Assim que houver dados, eles aparecem aqui automaticamente.</p>
      </div>
    );
  }

  const params = navigation?.params ?? {};
  const sortColumn = navigation ? columns.find((c) => c.sortKey && c.sortKey === params.sort) : undefined;
  const dir: SortDir = params.dir === "desc" ? "desc" : "asc";
  const sorted = sortColumn ? sortRows(allRows, sortColumn.sortValue, dir) : allRows;
  const pageInfo = navigation ? paginate(sorted, params.page, navigation.pageSize ?? DEFAULT_PAGE_SIZE) : null;
  const rows = pageInfo ? pageInfo.rows : sorted;

  const [first, ...rest] = columns;
  const mobileColumns = rest.filter((col) => !col.hideOnMobile);

  function header(col: Column<T>) {
    if (!navigation || !col.sortKey) return col.header;
    const active = sortColumn?.sortKey === col.sortKey;
    const nextDir = active && dir === "asc" ? "desc" : "asc";
    const Icon = active ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;
    return (
      <Link href={withParams(navigation.pathname, params, { sort: col.sortKey, dir: nextDir, page: undefined })} className={cn("inline-flex items-center gap-1 rounded hover:text-ink-900", active && "text-ink-900")} aria-label={`Ordenar por ${col.header}`} scroll={false}>
        {col.header}
        <Icon size={12} className={active ? "text-primary" : "text-ink-400"} />
      </Link>
    );
  }

  return (
    <>
      <ul className="divide-y divide-ink-100 sm:hidden">
        {rows.map((row) => (
          <li key={row.id} className="space-y-2.5 px-4 py-4">
            <div className="min-w-0 text-sm text-ink-900">{first.cell(row)}</div>
            {mobileColumns.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                {mobileColumns.map((col) =>
                  col.header === "Ações" ? (
                    <dd key={col.header} className="col-span-2 flex justify-end border-t border-ink-100 pt-2">{col.cell(row)}</dd>
                  ) : (
                    <div key={col.header} className="min-w-0">
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-500">{col.header}</dt>
                      <dd className="mt-0.5 break-words text-sm text-ink-900">{col.cell(row)}</dd>
                    </div>
                  ),
                )}
              </dl>
            )}
          </li>
        ))}
      </ul>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-ink-200">
              {columns.map((col) => (
                <th key={col.header} scope="col" aria-sort={sortColumn?.header === col.header ? (dir === "asc" ? "ascending" : "descending") : undefined} className={cn("whitespace-nowrap bg-ink-50 px-4 py-3 text-xs font-medium text-ink-500 first:pl-5 last:pr-5", col.className)}>
                  {header(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50">
                {columns.map((col) => (
                  <td key={col.header} className={cn("whitespace-nowrap px-4 py-3.5 align-middle text-ink-900 first:pl-5 last:pr-5", col.className)}>
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageInfo && navigation && pageInfo.pageCount > 1 && (
        <nav aria-label="Paginação" className="flex flex-col items-center justify-between gap-3 border-t border-ink-100 px-5 py-3 text-xs text-ink-500 sm:flex-row">
          <span>
            {pageInfo.from}–{pageInfo.to} de {pageInfo.total}
          </span>
          <div className="flex items-center gap-1">
            <PageLink disabled={pageInfo.page <= 1} href={withParams(navigation.pathname, params, { page: String(pageInfo.page - 1) })} label="Página anterior"><ChevronLeft size={15} /></PageLink>
            <span className="px-2 tabular-nums text-ink-700">Página {pageInfo.page} de {pageInfo.pageCount}</span>
            <PageLink disabled={pageInfo.page >= pageInfo.pageCount} href={withParams(navigation.pathname, params, { page: String(pageInfo.page + 1) })} label="Próxima página"><ChevronRight size={15} /></PageLink>
          </div>
        </nav>
      )}
    </>
  );
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  const cls = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-ink-200";
  if (disabled) return <span aria-disabled className={cn(cls, "text-ink-300")} aria-label={label}>{children}</span>;
  return <Link href={href} scroll={false} aria-label={label} className={cn(cls, "focus-ring text-ink-700 hover:bg-ink-100")}>{children}</Link>;
}
