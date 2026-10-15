"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const subnav = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/pagamentos", label: "Pagamentos" },
  { href: "/financeiro/contratos", label: "Contratos" },
  { href: "/financeiro/caixa", label: "Caixa" },
  { href: "/financeiro/comissoes", label: "Comissões" },
  { href: "/financeiro/indicacoes", label: "Indicações" },
];

export function FinanceSubnav({ active }: { active: string }) {
  return (
    <nav aria-label="Seções do financeiro" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max gap-1 border-b border-ink-200">
        {subnav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active === item.href ? "page" : undefined}
            className={cn("-mb-px whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium transition-colors", active === item.href ? "border-korvix-600 text-korvix-700" : "border-transparent text-ink-500 hover:text-ink-900")}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
