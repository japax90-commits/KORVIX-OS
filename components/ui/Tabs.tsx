import Link from "next/link";
import { cn } from "@/lib/utils";

export type TabItem = { href: string; label: string; active: boolean; count?: number; icon?: React.ReactNode };

/** Abas de navegação (links). Rolam horizontalmente no celular, sem quebrar a página. */
export function Tabs({ items, label }: { items: TabItem[]; label: string }) {
  return (
    <nav aria-label={label} className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-ink-200">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            scroll={false}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "-mb-px inline-flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors",
              item.active ? "border-primary text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900",
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && <span className="rounded-full bg-ink-100 px-1.5 py-0.5 text-[10px] tabular-nums text-ink-600">{item.count}</span>}
          </Link>
        ))}
      </div>
    </nav>
  );
}
