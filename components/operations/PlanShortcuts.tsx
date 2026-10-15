"use client";

import { KORVIX_PLAN_PRICES } from "@/lib/finance/calculations";
import { cn } from "@/lib/utils";

const plans = [
  ["Essencial", KORVIX_PLAN_PRICES.Essencial],
  ["Intermediário", KORVIX_PLAN_PRICES.Intermediário],
  ["Completo", KORVIX_PLAN_PRICES.Completo],
] as const;

/** Atalhos com os três planos oficiais; preenche o valor, que continua editável. */
export function PlanShortcuts({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {plans.map(([name, price]) => (
        <button
          key={name}
          type="button"
          onClick={() => onChange(String(price))}
          className={cn("rounded-lg border px-2 py-2 text-xs transition-colors", value === String(price) ? "border-korvix-600 bg-korvix-50 text-korvix-700" : "border-ink-300 text-ink-700 hover:border-korvix-300")}
        >
          {name}
          <span className="block text-sm font-semibold">R$ {price.toLocaleString("pt-BR")}</span>
        </button>
      ))}
    </div>
  );
}

