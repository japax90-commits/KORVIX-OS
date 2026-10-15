// Formatação centralizada. Todas as datas são exibidas no fuso da operação
// (America/Sao_Paulo), independentemente do fuso do servidor (Vercel = UTC).

export const APP_TIME_ZONE = "America/Sao_Paulo";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Converte "YYYY-MM-DD" (coluna date) ou ISO timestamp em Date sem deslocar o dia. */
function toDate(value: string | Date) {
  if (value instanceof Date) return value;
  // Datas puras são interpretadas ao meio-dia UTC para nunca mudarem de dia ao exibir.
  return new Date(DATE_ONLY.test(value) ? `${value}T12:00:00Z` : value);
}

export function formatMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value: string | Date | null | undefined, options?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { timeZone: APP_TIME_ZONE, ...options });
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", { timeZone: APP_TIME_ZONE, dateStyle: "short", timeStyle: "short" });
}

export function formatTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("pt-BR", { timeZone: APP_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
}

/** Dia (YYYY-MM-DD) de um instante no fuso da operação. */
export function dayKey(value: string | Date) {
  const d = toDate(value);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Data de hoje (YYYY-MM-DD) no fuso da operação — use como valor padrão de inputs type=date. */
export function todayISO() {
  return dayKey(new Date());
}

/** Converte timestamp ISO para o valor de um input datetime-local no horário local do navegador. */
export function toDateTimeLocal(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Converte o valor de um input datetime-local (horário local do navegador) em ISO UTC. */
export function fromDateTimeLocal(value: string | null | undefined) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** true se uma data pura (YYYY-MM-DD) já passou no fuso da operação. */
export function isPastDay(value: string | null | undefined) {
  if (!value) return false;
  return value < todayISO();
}

export function humanize(value: string | null | undefined) {
  if (!value) return "—";
  const s = value.replaceAll("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
