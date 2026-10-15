"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search } from "lucide-react";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Busca de navegação (⌘K / Ctrl+K) restrita aos módulos que o usuário pode acessar. */
export function CommandPalette({ open, onClose, allowedModules }: { open: boolean; onClose: () => void; allowedModules: string[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);

  const items = useMemo(() => {
    const nav = [
      ...primaryNav,
      ...secondaryNav,
      { href: "/financeiro/pagamentos", label: "Pagamentos", module: "financeiro", icon: primaryNav[4].icon, description: "Financeiro · cobranças e confirmações" },
      { href: "/financeiro/contratos", label: "Contratos", module: "financeiro", icon: primaryNav[4].icon, description: "Financeiro · recorrência" },
      { href: "/financeiro/caixa", label: "Caixa", module: "financeiro", icon: primaryNav[4].icon, description: "Financeiro · entradas e saídas" },
      { href: "/financeiro/comissoes", label: "Comissões", module: "financeiro", icon: primaryNav[4].icon, description: "Financeiro · remuneração" },
      { href: "/financeiro/indicacoes", label: "Indicações", module: "financeiro", icon: primaryNav[4].icon, description: "Financeiro · comissões de indicação" },
    ].filter((item) => allowedModules.includes(item.module));
    const q = query.trim().toLowerCase();
    if (!q) return nav;
    // Correspondência no nome da página vem antes da correspondência na descrição.
    const byLabel = nav.filter((item) => item.label.toLowerCase().includes(q));
    const byDescription = nav.filter((item) => !byLabel.includes(item) && item.description.toLowerCase().includes(q));
    return [...byLabel, ...byDescription];
  }, [allowedModules, query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => setIndex(0), [query]);

  if (!open) return null;

  function go(href: string) {
    onClose();
    router.push(href);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/55 px-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Buscar módulo" className="w-full max-w-lg overflow-hidden rounded-2xl bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-ink-100 px-4">
          <Search size={17} className="text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "ArrowDown") { e.preventDefault(); setIndex((i) => Math.min(i + 1, items.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIndex((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter" && items[index]) go(items[index].href);
            }}
            placeholder="Ir para módulo ou página…"
            className="h-12 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
          />
          <kbd className="rounded border border-ink-300 bg-ink-50 px-1.5 py-0.5 text-[10px] text-ink-500">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <button
                  type="button"
                  onMouseEnter={() => setIndex(i)}
                  onClick={() => go(item.href)}
                  className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left", i === index ? "bg-korvix-50" : "hover:bg-ink-50")}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-korvix-50 text-korvix-600"><Icon size={16} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink-900">{item.label}</span>
                    <span className="block truncate text-xs text-ink-500">{item.description}</span>
                  </span>
                  {i === index && <CornerDownLeft size={14} className="text-ink-400" />}
                </button>
              </li>
            );
          })}
          {items.length === 0 && <li className="px-3 py-6 text-center text-sm text-ink-500">Nenhum módulo encontrado.</li>}
        </ul>
      </div>
    </div>
  );
}
