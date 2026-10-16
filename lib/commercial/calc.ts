import type { DiscountTarget, DiscountType } from "./options";

// Regras de cálculo da proposta. A mesma regra roda no banco
// (private.compute_proposal_totals), que é a fonte oficial dos totais salvos;
// aqui ela serve para mostrar o resumo enquanto o usuário edita.
//
// - Linha = quantidade × preço negociado − desconto da linha (nunca negativa).
// - Recorrentes e únicos são somados separadamente e nunca misturados.
// - Desconto geral: percentual (sobre recorrentes, únicos ou ambos) ou valor
//   fixo (sobre recorrentes OU únicos, limitado ao subtotal).
// - Implantação e taxas adicionais são valores únicos.
// - Nenhum imposto ou margem é presumido.

export type CalcItem = { quantity: number; unit_price: number; discount?: number; recurring: boolean };
export type CalcOptions = {
  discount_type?: DiscountType | null;
  discount_value?: number;
  discount_target?: DiscountTarget;
  setup_fee?: number;
  extra_fees?: number;
};
export type Totals = {
  subtotal_once: number;
  subtotal_recurring: number;
  discount_once: number;
  discount_recurring: number;
  setup_fee: number;
  extra_fees: number;
  total_once: number;
  total_recurring: number;
};

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const num = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0);

export function lineTotal(item: Pick<CalcItem, "quantity" | "unit_price" | "discount">) {
  return Math.max(round2(num(item.quantity) * num(item.unit_price)) - num(item.discount), 0);
}

export function computeTotals(items: CalcItem[], opts: CalcOptions = {}): Totals {
  let subtotal_once = 0;
  let subtotal_recurring = 0;
  for (const item of items) {
    const total = lineTotal(item);
    if (item.recurring) subtotal_recurring += total;
    else subtotal_once += total;
  }
  subtotal_once = round2(subtotal_once);
  subtotal_recurring = round2(subtotal_recurring);

  const value = num(opts.discount_value);
  const target = opts.discount_target ?? "ambos";
  let discount_once = 0;
  let discount_recurring = 0;
  if (opts.discount_type === "percentual" && value > 0) {
    const pct = Math.min(value, 100);
    if (target === "unico" || target === "ambos") discount_once = round2((subtotal_once * pct) / 100);
    if (target === "recorrente" || target === "ambos") discount_recurring = round2((subtotal_recurring * pct) / 100);
  } else if (opts.discount_type === "valor" && value > 0) {
    if (target === "unico") discount_once = Math.min(value, subtotal_once);
    if (target === "recorrente") discount_recurring = Math.min(value, subtotal_recurring);
  }

  const setup_fee = num(opts.setup_fee);
  const extra_fees = num(opts.extra_fees);
  return {
    subtotal_once,
    subtotal_recurring,
    discount_once,
    discount_recurring,
    setup_fee,
    extra_fees,
    total_once: round2(subtotal_once - discount_once + setup_fee + extra_fees),
    total_recurring: round2(subtotal_recurring - discount_recurring),
  };
}

/** Margem estimada (%) — só quando há preço e custo informados. */
export function estimatedMargin(price: number | null | undefined, cost: number | null | undefined) {
  if (price === null || price === undefined || cost === null || cost === undefined) return null;
  const p = Number(price);
  const c = Number(cost);
  if (!Number.isFinite(p) || !Number.isFinite(c) || p <= 0) return null;
  return Math.round(((p - c) / p) * 1000) / 10;
}

/**
 * Lê valores digitados em reais: "1.997,50", "1997.5", "R$ 997" → número.
 * Retorna null para texto vazio e NaN para valor inválido.
 */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "number") return Number.isFinite(input) ? input : NaN;
  let s = input.replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return NaN;
  return round2(Number(s));
}

/** Formata número para edição em campo ("1997.5" → "1.997,50"). */
export function moneyToInput(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
