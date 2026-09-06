import { KORVIX_PLAN_PRICES } from "@/lib/business/plans";

export { KORVIX_PLAN_PRICES };

export type FinancialPayment = {
  amount: number | string | null;
  status: string;
  due_date: string;
  paid_at?: string | null;
};

export type FinancialContract = {
  value: number | string | null;
  frequency: string;
  status: string;
};

export type FinancialCommission = {
  amount: number | string | null;
  status?: string | null;
};

export type CashMovement = {
  amount: number | string | null;
  direction: "entrada" | "saida" | string;
  category?: string | null;
};

const n = (value: number | string | null | undefined) => Number(value ?? 0) || 0;

export function calculateRevenue(payments: FinancialPayment[]) {
  return payments.filter((p) => p.status === "pago").reduce((sum, p) => sum + n(p.amount), 0);
}

export function calculateForecastRevenue(payments: FinancialPayment[]) {
  return payments
    .filter((p) => p.status === "pendente" || p.status === "atrasado")
    .reduce((sum, p) => sum + n(p.amount), 0);
}

export function calculateOverdue(payments: FinancialPayment[], now = new Date()) {
  return payments
    .filter((p) => p.status === "atrasado" || (p.status === "pendente" && new Date(`${p.due_date}T23:59:59`) < now))
    .reduce((sum, p) => sum + n(p.amount), 0);
}

export function calculateMRR(contracts: FinancialContract[]) {
  return contracts
    .filter((c) => c.status === "ativo")
    .reduce((sum, c) => {
      const value = n(c.value);
      if (c.frequency === "mensal") return sum + value;
      if (c.frequency === "trimestral") return sum + value / 3;
      if (c.frequency === "semestral") return sum + value / 6;
      if (c.frequency === "anual") return sum + value / 12;
      return sum + value;
    }, 0);
}

export function calculateCommissions(commissions: FinancialCommission[]) {
  return commissions
    .filter((c) => c.status !== "cancelada")
    .reduce((sum, c) => sum + n(c.amount), 0);
}

export function calculateProLabore(receivedRevenue: number) {
  return receivedRevenue * 0.2;
}

export function calculateCashBalance(movements: CashMovement[]) {
  return calculateCashEntries(movements) - calculateCashExits(movements);
}

export function calculateCashEntries(movements: CashMovement[]) {
  return movements.filter((m) => m.direction === "entrada").reduce((sum, m) => sum + n(m.amount), 0);
}

export function calculateCashExits(movements: CashMovement[]) {
  return movements.filter((m) => m.direction === "saida").reduce((sum, m) => sum + n(m.amount), 0);
}

const excludedExpenseCategories = ["Comissão", "Comissões", "Pró-labore", "Imposto", "Impostos"];

export function calculateOperationalExpenses(movements: CashMovement[]) {
  return movements
    .filter((m) => m.direction === "saida")
    .filter((m) => !excludedExpenseCategories.includes(String(m.category ?? "")))
    .reduce((sum, m) => sum + n(m.amount), 0);
}

export function calculateTaxes(movements: CashMovement[]) {
  return movements
    .filter((m) => m.direction === "saida")
    .filter((m) => ["Imposto", "Impostos"].includes(String(m.category ?? "")))
    .reduce((sum, m) => sum + n(m.amount), 0);
}

export function calculateNetProfit(
  receivedRevenue: number,
  commissions: number,
  expenses: number,
  proLabore: number,
  taxes = 0,
) {
  return receivedRevenue - commissions - expenses - proLabore - taxes;
}

export function calculateAverageTicket(wonValues: number[]) {
  return wonValues.length ? wonValues.reduce((sum, value) => sum + value, 0) / wonValues.length : 0;
}

export function calculateConversionRate(won: number, lost: number) {
  const closed = won + lost;
  return closed ? (won / closed) * 100 : 0;
}

export function calculateGoalProgress(target: number, achieved: number) {
  return target ? (achieved / target) * 100 : 0;
}
