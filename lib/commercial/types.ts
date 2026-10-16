import type { BillingType, DiscountTarget, DiscountType, ProposalStatus, RecurrencePeriod, ServiceKind, ServiceStatus } from "./options";

export type ServiceCategory = { id: string; name: string; description: string | null; sort_order: number };

export type PackageItem = {
  service_id: string | null;
  name: string;
  description?: string | null;
  billing_type: BillingType;
  recurring: boolean;
  quantity: number;
  unit_price: number;
};

export type Service = {
  id: string;
  kind: ServiceKind;
  category_id: string | null;
  name: string;
  short_description: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  price: number;
  billing_type: BillingType;
  billing_unit: string | null;
  billing_period: string | null;
  delivery_estimate: string | null;
  scope: string | null;
  deliverables: string[];
  limits: string | null;
  commercial_terms: string | null;
  status: ServiceStatus;
  featured: boolean;
  package_items: PackageItem[];
  source_service_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ServiceInternal = { service_id: string; internal_cost: number | null; internal_notes: string | null };

export type ProposalItem = {
  id?: string;
  service_id: string | null;
  name: string;
  description: string | null;
  billing_type: BillingType;
  recurring: boolean;
  quantity: number;
  unit_price: number;
  list_price: number | null;
  discount: number;
  line_total?: number;
};

export type Proposal = {
  id: string;
  code: string;
  title: string;
  client_id: string | null;
  client_name: string;
  opportunity_id: string | null;
  status: ProposalStatus;
  objective: string | null;
  description: string | null;
  recurrence_period: RecurrencePeriod;
  discount_type: DiscountType | null;
  discount_value: number;
  discount_target: DiscountTarget;
  extra_fees: number;
  extra_fees_label: string | null;
  setup_fee: number;
  payment_terms: string | null;
  delivery_terms: string | null;
  scope: string | null;
  deliverables: string | null;
  included: string | null;
  not_included: string | null;
  internal_notes: string | null;
  valid_until: string | null;
  subtotal_once: number;
  subtotal_recurring: number;
  discount_once: number;
  discount_recurring: number;
  total_once: number;
  total_recurring: number;
  contract_id: string | null;
  payment_id: string | null;
  sent_at: string | null;
  decided_at: string | null;
  version: number;
  created_by: string;
  created_at: string;
  updated_at: string;
};

/** Campos do catálogo lidos pela interface (sem dados internos). */
export const SERVICE_COLUMNS =
  "id,kind,category_id,name,short_description,description,icon,image_url,price,billing_type,billing_unit,billing_period,delivery_estimate,scope,deliverables,limits,commercial_terms,status,featured,package_items,source_service_id,created_at,updated_at";

/**
 * A migration do Comercial ainda não foi aplicada neste banco?
 * (tabela inexistente: Postgres 42P01 ou PostgREST PGRST205)
 */
export function isMissingTable(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /could not find the table|does not exist/i.test(error.message ?? "");
}
