import { dayKey, todayISO } from "@/lib/format";

/** Meta empresarial de contratos fechados por mês (regra comercial vigente). */
export const MONTHLY_CONTRACT_GOAL = 5;

/** true se o timestamp cai no mês corrente, no fuso da operação. */
export function isClosedThisMonth(createdAt: string) {
  return dayKey(createdAt).slice(0, 7) === todayISO().slice(0, 7);
}
