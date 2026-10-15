import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  /** Oculta a coluna no celular (no modo cartão e na tabela). */
  hideOnMobile?: boolean;
}

/**
 * Tabela padrão. No celular (< sm) cada linha vira um cartão empilhado — a
 * primeira coluna é o título e as demais aparecem como pares rótulo/valor —
 * para que valores, status e ações nunca fiquem fora da tela.
 */
export function DataTable<T extends { id: string }>({
  columns,
  rows,
  emptyLabel = "Nenhum registro encontrado.",
}: {
  columns: Column<T>[];
  rows: T[];
  emptyLabel?: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-5 py-14 text-center">
        <p className="text-sm font-medium text-ink-700">{emptyLabel}</p>
        <p className="text-xs text-ink-500">Assim que houver dados, eles aparecem aqui automaticamente.</p>
      </div>
    );
  }

  const [first, ...rest] = columns;
  const mobileColumns = rest.filter((col) => !col.hideOnMobile);

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
                      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{col.header}</dt>
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
            <tr className="border-b border-ink-100">
              {columns.map((col) => (
                <th key={col.header} scope="col" className={cn("whitespace-nowrap bg-ink-50/60 px-4 py-3 text-xs font-medium text-ink-500 first:pl-5 last:pr-5", col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-ink-100 last:border-0 hover:bg-korvix-50/50">
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
    </>
  );
}
