// Opções do módulo Comercial (catálogo e propostas). Arquivo sem "use client"
// para poder ser usado tanto em Server Components quanto no navegador.
// Os valores espelham as restrições (check) da migration 20261016120000.

export type BillingType = "mensal" | "unico" | "projeto" | "producao" | "hora" | "personalizado";
export type ServiceStatus = "ativo" | "inativo" | "arquivado";
export type ServiceKind = "servico" | "pacote";
export type ProposalStatus = "rascunho" | "enviada" | "negociacao" | "aprovada" | "recusada" | "expirada" | "cancelada";
export type RecurrencePeriod = "mensal" | "trimestral" | "semestral" | "anual";
export type DiscountType = "valor" | "percentual";
export type DiscountTarget = "unico" | "recorrente" | "ambos";

export const BILLING_TYPES: { value: BillingType; label: string; suffix: string }[] = [
  { value: "mensal", label: "Mensal (recorrente)", suffix: "/mês" },
  { value: "unico", label: "Pagamento único", suffix: " único" },
  { value: "projeto", label: "Por projeto", suffix: "/projeto" },
  { value: "producao", label: "Por produção", suffix: "/produção" },
  { value: "hora", label: "Por hora", suffix: "/hora" },
  { value: "personalizado", label: "Personalizado", suffix: "" },
];

export const SERVICE_STATUSES: { value: ServiceStatus; label: string }[] = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "arquivado", label: "Arquivado" },
];

export const SERVICE_KINDS: { value: ServiceKind; label: string }[] = [
  { value: "servico", label: "Serviço" },
  { value: "pacote", label: "Pacote" },
];

export const PROPOSAL_STATUSES: { value: ProposalStatus; label: string }[] = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviada", label: "Enviada" },
  { value: "negociacao", label: "Em negociação" },
  { value: "aprovada", label: "Aprovada" },
  { value: "recusada", label: "Recusada" },
  { value: "expirada", label: "Expirada" },
  { value: "cancelada", label: "Cancelada" },
];

/** Transições permitidas — a mesma tabela é validada no banco (private.proposal_guard). */
export const PROPOSAL_TRANSITIONS: Record<ProposalStatus, ProposalStatus[]> = {
  rascunho: ["enviada", "cancelada"],
  enviada: ["negociacao", "aprovada", "recusada", "expirada", "cancelada", "rascunho"],
  negociacao: ["enviada", "aprovada", "recusada", "expirada", "cancelada"],
  recusada: ["negociacao", "cancelada"],
  expirada: ["negociacao", "cancelada"],
  aprovada: ["cancelada"],
  cancelada: [],
};

/** Rótulo da ação que leva a cada status (botões da proposta). */
export const TRANSITION_LABELS: Record<ProposalStatus, string> = {
  rascunho: "Voltar para rascunho",
  enviada: "Marcar como enviada",
  negociacao: "Em negociação",
  aprovada: "Marcar como aprovada",
  recusada: "Marcar como recusada",
  expirada: "Marcar como expirada",
  cancelada: "Cancelar proposta",
};

export const EDITABLE_PROPOSAL_STATUSES: ProposalStatus[] = ["rascunho", "enviada", "negociacao"];

export const RECURRENCE_PERIODS: { value: RecurrencePeriod; label: string; suffix: string }[] = [
  { value: "mensal", label: "Mensal", suffix: "/mês" },
  { value: "trimestral", label: "Trimestral", suffix: "/trimestre" },
  { value: "semestral", label: "Semestral", suffix: "/semestre" },
  { value: "anual", label: "Anual", suffix: "/ano" },
];

export const DISCOUNT_TARGETS: { value: DiscountTarget; label: string }[] = [
  { value: "ambos", label: "Recorrentes e únicos" },
  { value: "recorrente", label: "Somente recorrentes" },
  { value: "unico", label: "Somente únicos" },
];

/** Ícones disponíveis para os serviços (mapeados em components/commercial/ServiceIcon). */
export const SERVICE_ICONS = ["megaphone", "share", "globe", "bot", "video", "map-pin", "layers", "briefcase", "camera", "pen", "chart", "mail", "star", "sparkles"] as const;
export type ServiceIconKey = (typeof SERVICE_ICONS)[number];

export const label = <T extends string>(list: { value: T; label: string }[], value: string | null | undefined) =>
  list.find((o) => o.value === value)?.label ?? value ?? "—";

/** Somente a cobrança mensal entra no valor recorrente; as demais são únicas. */
export const isRecurringBilling = (type: string | null | undefined) => type === "mensal";

export function billingSuffix(type: string | null | undefined, unit?: string | null) {
  if (type === "personalizado") return unit ? `/${unit}` : "";
  return BILLING_TYPES.find((b) => b.value === type)?.suffix ?? "";
}
