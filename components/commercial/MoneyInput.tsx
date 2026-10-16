"use client";

import { forwardRef, useEffect, useState } from "react";
import { Input } from "@/components/ui/Form";
import { moneyToInput, parseMoney } from "@/lib/commercial/calc";
import { cn } from "@/lib/utils";

type Props = Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "defaultValue"> & {
  value: number | null;
  onValueChange: (value: number | null) => void;
};

/**
 * Campo de valor em reais: aceita "1.997,50", "1997.5" ou "997" e formata ao
 * sair do campo. Valor inválido fica no campo (não é perdido) e é marcado.
 */
export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput({ value, onValueChange, className, onBlur, ...props }, ref) {
  const [text, setText] = useState(moneyToInput(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(moneyToInput(value));
  }, [value, focused]);
  const parsed = parseMoney(text);
  const invalid = Number.isNaN(parsed) || (parsed !== null && parsed < 0);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-ink-500">R$</span>
      <Input
        ref={ref}
        inputMode="decimal"
        autoComplete="off"
        {...props}
        aria-invalid={invalid || props["aria-invalid"] ? true : undefined}
        className={cn("pl-9 tabular-nums", className)}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const v = parseMoney(e.target.value);
          if (v === null) onValueChange(null);
          else if (!Number.isNaN(v) && v >= 0) onValueChange(v);
        }}
        onBlur={(e) => {
          setFocused(false);
          const v = parseMoney(text);
          if (v !== null && !Number.isNaN(v) && v >= 0) setText(moneyToInput(v));
          onBlur?.(e);
        }}
      />
    </div>
  );
});
