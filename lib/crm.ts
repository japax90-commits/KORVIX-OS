import { dayKey } from "@/lib/format";

// Regras do funil comercial compartilhadas entre o quadro (cliente) e os
// indicadores do CRM (servidor). Valores legados "fechado_*" são equivalentes.

export const STAGES = ["lead", "qualificacao", "proposta", "negociacao", "ganho", "perdido"] as const;
export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = { lead: "Lead", qualificacao: "Qualificação", proposta: "Proposta", negociacao: "Negociação", ganho: "Ganho", perdido: "Perdido" };
/** Probabilidade padrão sugerida ao mover de etapa (editável na oportunidade). */
export const STAGE_PROBABILITY: Record<Stage, number> = { lead: 10, qualificacao: 25, proposta: 50, negociacao: 70, ganho: 100, perdido: 0 };

export function normalizeStage(value: string): Stage {
  if (value === "fechado_ganho") return "ganho";
  if (value === "fechado_perdido") return "perdido";
  return (STAGES as readonly string[]).includes(value) ? (value as Stage) : "lead";
}

export const isOpenStage = (stage: string) => !["ganho", "perdido"].includes(normalizeStage(stage));

export type CrmOpportunity = {
  id: string;
  client_name: string;
  stage: string;
  estimated_value: number | string | null;
  probability: number | null;
  next_followup_at: string | null;
  next_action?: string | null;
};

const num = (v: number | string | null | undefined) => Number(v ?? 0) || 0;

/**
 * Indicadores do CRM, todos derivados dos registros:
 * - pipeline aberto: soma do valor estimado das etapas abertas;
 * - previsão ponderada: soma de valor × probabilidade das etapas abertas;
 * - follow-ups atrasados/hoje: data de próximo contato (fuso de São Paulo);
 * - conversão: ganhas ÷ (ganhas + perdidas).
 */
export function crmMetrics(rows: CrmOpportunity[], now = new Date()) {
  const open = rows.filter((r) => isOpenStage(r.stage));
  const won = rows.filter((r) => normalizeStage(r.stage) === "ganho").length;
  const lost = rows.filter((r) => normalizeStage(r.stage) === "perdido").length;
  const today = dayKey(now);
  const withFollowup = open.filter((r) => r.next_followup_at);
  return {
    openCount: open.length,
    openValue: open.reduce((s, r) => s + num(r.estimated_value), 0),
    weightedValue: open.reduce((s, r) => s + (num(r.estimated_value) * Math.min(Math.max(num(r.probability), 0), 100)) / 100, 0),
    overdueFollowups: withFollowup.filter((r) => new Date(r.next_followup_at!).getTime() < now.getTime()).length,
    todayFollowups: withFollowup.filter((r) => dayKey(r.next_followup_at!) === today && new Date(r.next_followup_at!).getTime() >= now.getTime()).length,
    withoutFollowup: open.length - withFollowup.length,
    won,
    lost,
    conversion: won + lost ? (won / (won + lost)) * 100 : 0,
    byStage: STAGES.map((stage) => ({ stage, count: rows.filter((r) => normalizeStage(r.stage) === stage).length })),
  };
}

export type FollowupItem = CrmOpportunity & { bucket: "atrasado" | "hoje" | "proximos" };

/** Próximos contatos das oportunidades abertas: atrasados, hoje e próximos `days` dias. */
export function followupAgenda(rows: CrmOpportunity[], now = new Date(), days = 7): FollowupItem[] {
  const today = dayKey(now);
  const limit = now.getTime() + days * 86_400_000;
  return rows
    .filter((r) => isOpenStage(r.stage) && r.next_followup_at)
    .map((r) => {
      const t = new Date(r.next_followup_at!).getTime();
      const bucket: FollowupItem["bucket"] = t < now.getTime() ? "atrasado" : dayKey(r.next_followup_at!) === today ? "hoje" : "proximos";
      return { ...r, bucket, t };
    })
    .filter((r) => r.t <= limit)
    .sort((a, b) => a.t - b.t)
    .map(({ t: _t, ...r }) => r);
}
