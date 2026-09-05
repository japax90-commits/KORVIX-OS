import { cn } from "@/lib/utils";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

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
      <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
        <p className="text-sm font-medium text-ink-700">{emptyLabel}</p>
        <p className="text-xs text-ink-500">
          Assim que houver dados, eles aparecem aqui automaticamente.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-ink-100">
            {columns.map((col) => (
              <th
                key={col.header}
                className={cn(
                  "whitespace-nowrap px-5 py-3 text-xs font-medium text-ink-500",
                  col.hideOnMobile && "hidden sm:table-cell",
                  col.className
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-ink-100 last:border-0 hover:bg-korvix-50/50"
            >
              {columns.map((col) => (
                <td
                  key={col.header}
                  className={cn(
                    "whitespace-nowrap px-5 py-3.5 text-ink-900",
                    col.hideOnMobile && "hidden sm:table-cell",
                    col.className
                  )}
                >
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
