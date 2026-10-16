"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, PackagePlus, Plus, Save, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/errors";
import { useToast } from "@/components/ui/Feedback";
import { Field, FormError, IconButton, Input, Select, Textarea, buttonClass, inputClass } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { MoneyInput } from "@/components/commercial/MoneyInput";
import { ServiceIcon } from "@/components/commercial/ServiceIcon";
import { packagePriceLabel } from "@/components/commercial/ServiceForm";
import { CreateClientButton } from "@/components/operations/ClientForm";
import { BILLING_TYPES, DISCOUNT_TARGETS, RECURRENCE_PERIODS, billingSuffix, isRecurringBilling, label, type BillingType, type DiscountTarget, type DiscountType, type RecurrencePeriod } from "@/lib/commercial/options";
import { computeTotals, lineTotal } from "@/lib/commercial/calc";
import type { PackageItem, Proposal, ProposalItem, Service, ServiceCategory } from "@/lib/commercial/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type ClientOption = { id: string; company_name: string };
type OpportunityOption = { id: string; client_name: string; stage: string };
type Row = ProposalItem & { key: string };
type ClientMode = "cliente" | "lead" | "prospect";

type FormState = {
  title: string;
  client_mode: ClientMode;
  client_id: string;
  opportunity_id: string;
  client_name: string;
  objective: string;
  description: string;
  recurrence_period: RecurrencePeriod;
  discount_type: DiscountType | "";
  discount_value: number | null;
  discount_target: DiscountTarget;
  setup_fee: number | null;
  extra_fees: number | null;
  extra_fees_label: string;
  payment_terms: string;
  delivery_terms: string;
  scope: string;
  deliverables: string;
  included: string;
  not_included: string;
  internal_notes: string;
  valid_until: string;
};

const STEPS = ["Cliente", "Itens", "Valores e condições", "Escopo e validade"] as const;
let keySeq = 0;
const newKey = () => `row-${Date.now()}-${keySeq++}`;

function rowFromService(s: Service): Row[] {
  if (s.package_items?.length) return s.package_items.map((i: PackageItem) => ({ key: newKey(), service_id: i.service_id, name: i.name, description: i.description ?? null, billing_type: i.billing_type, recurring: i.recurring, quantity: i.quantity, unit_price: i.unit_price, list_price: i.unit_price, discount: 0 }));
  const description = s.kind === "pacote" && s.deliverables?.length ? s.deliverables.join(" · ") : s.short_description;
  return [{ key: newKey(), service_id: s.id, name: s.name, description: description ?? null, billing_type: s.billing_type, recurring: isRecurringBilling(s.billing_type), quantity: 1, unit_price: Number(s.price), list_price: Number(s.price), discount: 0 }];
}

const customRow = (): Row => ({ key: newKey(), service_id: null, name: "", description: null, billing_type: "unico", recurring: false, quantity: 1, unit_price: 0, list_price: null, discount: 0 });

export function ProposalBuilder({
  proposal,
  initialItems,
  services,
  categories,
  clients,
  opportunities,
  prefill,
  currentUserId,
  canSaveAsPackage,
  startCustom,
}: {
  proposal: Proposal | null;
  initialItems: ProposalItem[];
  services: Service[];
  categories: ServiceCategory[];
  clients: ClientOption[];
  opportunities: OpportunityOption[];
  prefill?: { client_id?: string; opportunity_id?: string; service_id?: string };
  currentUserId: string;
  canSaveAsPackage: boolean;
  startCustom?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const requestId = useRef<string>(typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [version, setVersion] = useState(proposal?.version ?? 1);
  const [step, setStep] = useState(startCustom ? 1 : 0);
  const [packageOpen, setPackageOpen] = useState(false);

  const prefOpp = opportunities.find((o) => o.id === (proposal?.opportunity_id ?? prefill?.opportunity_id));
  const prefClient = clients.find((c) => c.id === (proposal?.client_id ?? prefill?.client_id));
  const [f, setF] = useState<FormState>({
    title: proposal?.title ?? "",
    client_mode: prefClient ? "cliente" : prefOpp ? "lead" : proposal ? "prospect" : clients.length ? "cliente" : "prospect",
    client_id: prefClient?.id ?? "",
    opportunity_id: prefOpp?.id ?? "",
    client_name: proposal?.client_name ?? prefClient?.company_name ?? prefOpp?.client_name ?? "",
    objective: proposal?.objective ?? "",
    description: proposal?.description ?? "",
    recurrence_period: proposal?.recurrence_period ?? "mensal",
    discount_type: proposal?.discount_type ?? "",
    discount_value: proposal ? Number(proposal.discount_value) : null,
    discount_target: proposal?.discount_target ?? "ambos",
    setup_fee: proposal ? Number(proposal.setup_fee) : null,
    extra_fees: proposal ? Number(proposal.extra_fees) : null,
    extra_fees_label: proposal?.extra_fees_label ?? "",
    payment_terms: proposal?.payment_terms ?? "",
    delivery_terms: proposal?.delivery_terms ?? "",
    scope: proposal?.scope ?? "",
    deliverables: proposal?.deliverables ?? "",
    included: proposal?.included ?? "",
    not_included: proposal?.not_included ?? "",
    internal_notes: proposal?.internal_notes ?? "",
    valid_until: proposal?.valid_until ?? "",
  });
  const [rows, setRows] = useState<Row[]>(() => {
    if (initialItems.length) return initialItems.map((i) => ({ ...i, key: newKey(), quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount: Number(i.discount), list_price: i.list_price === null ? null : Number(i.list_price) }));
    const pre = services.find((s) => s.id === prefill?.service_id);
    if (pre) return rowFromService(pre);
    return startCustom ? [customRow()] : [];
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => { setF((cur) => ({ ...cur, [key]: value })); setDirty(true); };
  const setRow = (key: string, patch: Partial<Row>) => { setRows((cur) => cur.map((r) => (r.key === key ? { ...r, ...patch } : r))); setDirty(true); };

  // Aviso ao sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const totals = useMemo(
    () => computeTotals(rows, { discount_type: f.discount_type || null, discount_value: f.discount_value ?? 0, discount_target: f.discount_target, setup_fee: f.setup_fee ?? 0, extra_fees: f.extra_fees ?? 0 }),
    [rows, f.discount_type, f.discount_value, f.discount_target, f.setup_fee, f.extra_fees],
  );
  const periodSuffix = RECURRENCE_PERIODS.find((p) => p.value === f.recurrence_period)?.suffix ?? "/mês";

  function validate() {
    const e: Record<string, string> = {};
    if (f.title.trim().length < 2) e.title = "Dê um nome à oferta/proposta.";
    if (f.client_mode === "cliente" && !f.client_id) e.client_id = "Selecione o cliente.";
    if (f.client_mode === "lead" && !f.opportunity_id) e.opportunity_id = "Selecione o lead do CRM.";
    if (f.client_mode === "prospect" && !f.client_name.trim()) e.client_name = "Informe o nome do cliente.";
    rows.forEach((r, idx) => {
      if (!r.name.trim()) e[`item-${idx}`] = "Informe o nome do item.";
      else if (!(r.quantity > 0)) e[`item-${idx}`] = "A quantidade deve ser maior que zero.";
      else if (r.discount > r.quantity * r.unit_price) e[`item-${idx}`] = "O desconto do item é maior que o valor do item.";
    });
    if (f.discount_type === "percentual" && (f.discount_value ?? 0) > 100) e.discount_value = "O desconto percentual vai até 100%.";
    if (f.discount_type === "valor" && f.discount_target === "ambos") e.discount_target = "Escolha se o desconto em reais vale para recorrentes ou únicos.";
    if (f.extra_fees && !f.extra_fees_label.trim()) e.extra_fees_label = "Descreva a taxa adicional.";
    return e;
  }

  const stepOfError = (key: string) => (["title", "client_id", "opportunity_id", "client_name"].includes(key) ? 0 : key.startsWith("item-") ? 1 : key.startsWith("discount") || key.startsWith("extra") ? 2 : 3);

  async function save() {
    if (saving.current) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setStep(stepOfError(Object.keys(e)[0]));
      setError("Corrija os campos destacados antes de salvar.");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    const clientName = f.client_mode === "cliente" ? clients.find((c) => c.id === f.client_id)?.company_name ?? f.client_name : f.client_mode === "lead" ? opportunities.find((o) => o.id === f.opportunity_id)?.client_name ?? f.client_name : f.client_name;
    const payload = {
      id: proposal?.id ?? null,
      request_id: proposal ? null : requestId.current,
      version,
      title: f.title.trim(),
      client_id: f.client_mode === "cliente" ? f.client_id : null,
      opportunity_id: f.client_mode === "lead" ? f.opportunity_id : proposal?.opportunity_id && f.client_mode === "cliente" ? proposal.opportunity_id : null,
      client_name: clientName.trim(),
      objective: f.objective,
      description: f.description,
      recurrence_period: f.recurrence_period,
      discount_type: f.discount_type || null,
      discount_value: f.discount_type ? f.discount_value ?? 0 : 0,
      discount_target: f.discount_target,
      setup_fee: f.setup_fee ?? 0,
      extra_fees: f.extra_fees ?? 0,
      extra_fees_label: f.extra_fees_label,
      payment_terms: f.payment_terms,
      delivery_terms: f.delivery_terms,
      scope: f.scope,
      deliverables: f.deliverables,
      included: f.included,
      not_included: f.not_included,
      internal_notes: f.internal_notes,
      valid_until: f.valid_until || null,
      items: rows.map((r) => ({ service_id: r.service_id, name: r.name.trim(), description: r.description, billing_type: r.billing_type, recurring: r.recurring, quantity: r.quantity, unit_price: r.unit_price, list_price: r.list_price, discount: r.discount })),
    };
    try {
      const { data, error: rpcError } = await createClient().rpc("save_proposal", { p: payload });
      if (rpcError) throw new Error(rpcError.message);
      const saved = data as Proposal;
      setDirty(false);
      setVersion(saved.version);
      toast(proposal ? "Proposta salva." : `Proposta ${saved.code} criada como rascunho.`);
      if (!proposal) router.replace(`/comercial/propostas/${saved.id}`);
      else router.refresh();
    } catch (err) {
      // Mantém tudo o que foi digitado; nada é descartado em caso de falha.
      setError(`Não foi possível salvar. ${friendlyError(err instanceof Error ? err.message : String(err))} Suas alterações continuam nesta tela.`);
      toast("A proposta não foi salva.", "error");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  const inError = (key: string) => errors[key];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <nav aria-label="Etapas da proposta" className="-mx-1 overflow-x-auto px-1">
          <ol className="flex min-w-max gap-2">
            {STEPS.map((s, idx) => (
              <li key={s}>
                <button type="button" onClick={() => setStep(idx)} aria-current={step === idx ? "step" : undefined} className={cn("focus-ring flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium", step === idx ? "border-primary bg-primary/10 text-ink-900" : "border-ink-200 text-ink-600 hover:bg-ink-50")}>
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-[11px]", step === idx ? "bg-primary text-primary-fg" : "bg-ink-100 text-ink-600")}>{idx + 1}</span>
                  {s}
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="rounded-xl border border-ink-200 bg-surface p-4 shadow-panel sm:p-5" aria-labelledby="step-title">
          <h2 id="step-title" className="mb-4 text-base font-semibold text-ink-900">{STEPS[step]}</h2>

          {step === 0 && (
            <div className="space-y-4">
              <Field label="Nome da oferta / proposta" error={inError("title")}>
                <Input value={f.title} onChange={(e) => set("title", e.target.value)} placeholder="Ex.: Plano de crescimento digital — Padaria Central" maxLength={160} />
              </Field>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-ink-700">Para quem é a proposta?</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {([["cliente", "Cliente cadastrado"], ["lead", "Lead do CRM"], ["prospect", "Outro / novo"]] as const).map(([value, text]) => (
                    <label key={value} className={cn("flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2.5 text-sm", f.client_mode === value ? "border-primary bg-primary/5" : "border-ink-200")}>
                      <input type="radio" name="client_mode" value={value} checked={f.client_mode === value} onChange={() => set("client_mode", value)} className="accent-[rgb(var(--primary))]" />
                      {text}
                    </label>
                  ))}
                </div>
              </fieldset>
              {f.client_mode === "cliente" && (
                <Field label="Cliente" error={inError("client_id")} hint={clients.length ? undefined : "Nenhum cliente cadastrado ainda. Cadastre abaixo ou use “Outro / novo”."}>
                  <Select value={f.client_id} onChange={(e) => { set("client_id", e.target.value); set("client_name", clients.find((c) => c.id === e.target.value)?.company_name ?? ""); }}>
                    <option value="">Selecione</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
                  </Select>
                </Field>
              )}
              {f.client_mode === "lead" && (
                <Field label="Lead / oportunidade do CRM" error={inError("opportunity_id")} hint="A proposta fica visível a partir do lead.">
                  <Select value={f.opportunity_id} onChange={(e) => { set("opportunity_id", e.target.value); set("client_name", opportunities.find((o) => o.id === e.target.value)?.client_name ?? ""); }}>
                    <option value="">Selecione</option>
                    {opportunities.map((o) => <option key={o.id} value={o.id}>{o.client_name}</option>)}
                  </Select>
                </Field>
              )}
              {f.client_mode === "prospect" && (
                <Field label="Nome do cliente" error={inError("client_name")} hint="Para gerar contrato depois, vincule a um cliente cadastrado.">
                  <Input value={f.client_name} onChange={(e) => set("client_name", e.target.value)} maxLength={160} />
                </Field>
              )}
              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink-50 p-3 text-xs text-ink-600">
                <span>Cliente ainda não cadastrado?</span>
                <CreateClientButton currentUserId={currentUserId} />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <CatalogPicker services={services} categories={categories} onAdd={(s) => { setRows((cur) => [...cur, ...rowFromService(s)]); setDirty(true); toast(`${s.name} adicionado.`, "info"); }} />
              <div className="space-y-3">
                {rows.map((r, idx) => (
                  <ItemRow
                    key={r.key}
                    row={r}
                    index={idx}
                    error={inError(`item-${idx}`)}
                    onChange={(patch) => setRow(r.key, patch)}
                    onRemove={() => { setRows((cur) => cur.filter((x) => x.key !== r.key)); setDirty(true); }}
                    onMove={(dir) => { setRows((cur) => { const next = [...cur]; const j = idx + dir; if (j < 0 || j >= next.length) return cur; [next[idx], next[j]] = [next[j], next[idx]]; return next; }); setDirty(true); }}
                    isFirst={idx === 0}
                    isLast={idx === rows.length - 1}
                  />
                ))}
                {!rows.length && <p className="rounded-lg border border-dashed border-ink-300 p-6 text-center text-sm text-ink-500">Adicione serviços do catálogo ou um item personalizado.</p>}
              </div>
              <button type="button" onClick={() => { setRows((cur) => [...cur, customRow()]); setDirty(true); }} className={buttonClass("secondary", undefined, "sm")}><Plus size={14} /> Adicionar item personalizado</button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Periodicidade dos itens recorrentes">
                  <Select value={f.recurrence_period} onChange={(e) => set("recurrence_period", e.target.value as RecurrencePeriod)}>
                    {RECURRENCE_PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </Select>
                </Field>
                <Field label="Valor de implantação / configuração" hint="Cobrança única.">
                  <MoneyInput value={f.setup_fee} onValueChange={(v) => set("setup_fee", v)} />
                </Field>
              </div>
              <fieldset className="rounded-lg border border-ink-200 p-3">
                <legend className="px-1 text-sm font-medium text-ink-700">Desconto total</legend>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Tipo de desconto">
                    <Select value={f.discount_type} onChange={(e) => { set("discount_type", e.target.value as DiscountType | ""); if (e.target.value === "valor" && f.discount_target === "ambos") set("discount_target", "recorrente"); }}>
                      <option value="">Sem desconto</option>
                      <option value="percentual">Percentual (%)</option>
                      <option value="valor">Valor (R$)</option>
                    </Select>
                  </Field>
                  {f.discount_type && (
                    <>
                      <Field label={f.discount_type === "percentual" ? "Percentual de desconto (%)" : "Valor do desconto"} error={inError("discount_value")}>
                        {f.discount_type === "percentual" ? (
                          <Input type="number" min={0} max={100} step="0.01" inputMode="decimal" value={f.discount_value ?? ""} onChange={(e) => set("discount_value", e.target.value === "" ? null : Number(e.target.value))} />
                        ) : (
                          <MoneyInput value={f.discount_value} onValueChange={(v) => set("discount_value", v)} />
                        )}
                      </Field>
                      <Field label="Aplicar em" error={inError("discount_target")}>
                        <Select value={f.discount_target} onChange={(e) => set("discount_target", e.target.value as DiscountTarget)}>
                          {DISCOUNT_TARGETS.filter((t) => f.discount_type === "percentual" || t.value !== "ambos").map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </Select>
                      </Field>
                    </>
                  )}
                </div>
              </fieldset>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Taxas adicionais" hint="Cobrança única (ex.: deslocamento).">
                  <MoneyInput value={f.extra_fees} onValueChange={(v) => set("extra_fees", v)} />
                </Field>
                <Field label="Descrição da taxa" error={inError("extra_fees_label")}>
                  <Input value={f.extra_fees_label} onChange={(e) => set("extra_fees_label", e.target.value)} maxLength={120} />
                </Field>
              </div>
              <Field label="Prazo e condições de pagamento"><Textarea rows={2} value={f.payment_terms} onChange={(e) => set("payment_terms", e.target.value)} placeholder="Ex.: implantação em 2x no Pix; mensalidade todo dia 10." /></Field>
              <Field label="Prazo de entrega"><Textarea rows={2} value={f.delivery_terms} onChange={(e) => set("delivery_terms", e.target.value)} /></Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <Field label="Objetivo da solução"><Textarea rows={2} value={f.objective} onChange={(e) => set("objective", e.target.value)} /></Field>
              <Field label="Descrição"><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} /></Field>
              <Field label="Escopo"><Textarea rows={3} value={f.scope} onChange={(e) => set("scope", e.target.value)} /></Field>
              <Field label="Entregáveis" hint="Um por linha."><Textarea rows={3} value={f.deliverables} onChange={(e) => set("deliverables", e.target.value)} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Itens incluídos"><Textarea rows={3} value={f.included} onChange={(e) => set("included", e.target.value)} /></Field>
                <Field label="Não incluídos"><Textarea rows={3} value={f.not_included} onChange={(e) => set("not_included", e.target.value)} /></Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Validade comercial"><Input type="date" value={f.valid_until} onChange={(e) => set("valid_until", e.target.value)} /></Field>
              </div>
              <Field label="Observações internas" hint="Não aparecem na versão do cliente."><Textarea rows={2} value={f.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} /></Field>
            </div>
          )}

          <div className="mt-5 flex flex-col-reverse gap-2 border-t border-ink-100 pt-4 sm:flex-row sm:justify-between">
            <button type="button" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={buttonClass("ghost")}>Voltar</button>
            {step < STEPS.length - 1 && <button type="button" onClick={() => setStep((s) => s + 1)} className={buttonClass("secondary")}>Próximo: {STEPS[step + 1]}</button>}
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-20 lg:self-start" aria-label="Resumo comercial">
        <div className="space-y-4 rounded-xl border border-ink-200 bg-surface p-4 shadow-panel">
          <h2 className="text-sm font-semibold text-ink-900">Resumo comercial</h2>
          <dl className="space-y-1.5 text-sm">
            <SummaryLine label="Itens recorrentes" value={formatMoney(totals.subtotal_recurring)} />
            {totals.discount_recurring > 0 && <SummaryLine label="Desconto (recorrente)" value={`− ${formatMoney(totals.discount_recurring)}`} tone="success" />}
            <SummaryLine label="Total recorrente" value={`${formatMoney(totals.total_recurring)}${periodSuffix}`} strong />
          </dl>
          <dl className="space-y-1.5 border-t border-ink-100 pt-3 text-sm">
            <SummaryLine label="Itens únicos" value={formatMoney(totals.subtotal_once)} />
            {totals.discount_once > 0 && <SummaryLine label="Desconto (único)" value={`− ${formatMoney(totals.discount_once)}`} tone="success" />}
            {totals.setup_fee > 0 && <SummaryLine label="Implantação" value={formatMoney(totals.setup_fee)} />}
            {totals.extra_fees > 0 && <SummaryLine label={f.extra_fees_label || "Taxas adicionais"} value={formatMoney(totals.extra_fees)} />}
            <SummaryLine label="Total único" value={formatMoney(totals.total_once)} strong />
          </dl>
          <p className="text-xs text-ink-500">Recorrente e único são cobrados separadamente e não são somados. Impostos não estão incluídos no cálculo.</p>
          <FormError message={error} />
          <button type="button" onClick={save} disabled={busy} className={buttonClass("primary", "w-full")}><Save size={15} /> {busy ? "Salvando..." : proposal ? "Salvar alterações" : "Salvar rascunho"}</button>
          {dirty && !busy && <p className="text-center text-xs text-warning">Alterações não salvas</p>}
          {canSaveAsPackage && rows.length > 0 && (
            <button type="button" onClick={() => setPackageOpen(true)} className={buttonClass("secondary", "w-full", "sm")}><PackagePlus size={14} /> Salvar composição como pacote</button>
          )}
        </div>
      </aside>

      {packageOpen && <SavePackageModal rows={rows} categories={categories} defaultName={f.title} onClose={() => setPackageOpen(false)} />}
    </div>
  );
}

function SummaryLine({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "success" }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn("text-ink-600", strong && "font-medium text-ink-900")}>{label}</dt>
      <dd className={cn("tabular-nums", strong ? "text-base font-semibold text-ink-900" : "text-ink-700", tone === "success" && "text-success")}>{value}</dd>
    </div>
  );
}

function ItemRow({ row, index, error, onChange, onRemove, onMove, isFirst, isLast }: { row: Row; index: number; error?: string; onChange: (patch: Partial<Row>) => void; onRemove: () => void; onMove: (dir: 1 | -1) => void; isFirst: boolean; isLast: boolean }) {
  const total = lineTotal(row);
  return (
    <div className={cn("rounded-lg border p-3", error ? "border-danger/50" : "border-ink-200")} role="group" aria-label={`Item ${index + 1}: ${row.name || "sem nome"}`}>
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-6">
          <Field label="Nome do item" className="sm:col-span-4">
            <Input value={row.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ex.: Treinamento da equipe" maxLength={160} aria-invalid={error && !row.name.trim() ? true : undefined} />
          </Field>
          <Field label="Cobrança" className="sm:col-span-2">
            <Select value={row.billing_type} onChange={(e) => { const billing_type = e.target.value as BillingType; onChange({ billing_type, recurring: isRecurringBilling(billing_type) }); }}>
              {BILLING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
            </Select>
          </Field>
          <Field label="Qtd." className="sm:col-span-1">
            <Input type="number" min={0.01} step="any" inputMode="decimal" value={row.quantity} onChange={(e) => onChange({ quantity: e.target.value === "" ? 0 : Number(e.target.value) })} />
          </Field>
          <Field label="Preço negociado" className="sm:col-span-2" hint={row.list_price !== null && row.list_price !== row.unit_price ? `Tabela: ${formatMoney(row.list_price)}` : undefined}>
            <MoneyInput value={row.unit_price} onValueChange={(v) => onChange({ unit_price: v ?? 0 })} />
          </Field>
          <Field label="Desconto do item" className="sm:col-span-2">
            <MoneyInput value={row.discount} onValueChange={(v) => onChange({ discount: v ?? 0 })} />
          </Field>
          <div className="sm:col-span-1">
            <p className="mb-1.5 text-sm font-medium text-ink-700">Total</p>
            <p className="py-2.5 text-sm font-semibold tabular-nums text-ink-900">{formatMoney(total)}<span className="block text-[11px] font-normal text-ink-500">{row.recurring ? "recorrente" : "único"}</span></p>
          </div>
          <Field label="Descrição / escopo do item (opcional)" className="sm:col-span-6">
            <Input value={row.description ?? ""} onChange={(e) => onChange({ description: e.target.value || null })} maxLength={2000} />
          </Field>
        </div>
        <div className="flex flex-col gap-1">
          <IconButton label={`Subir ${row.name || "item"}`} onClick={() => onMove(-1)} disabled={isFirst}><ChevronUp size={15} /></IconButton>
          <IconButton label={`Descer ${row.name || "item"}`} onClick={() => onMove(1)} disabled={isLast}><ChevronDown size={15} /></IconButton>
          <IconButton label={`Remover ${row.name || "item"}`} tone="danger" onClick={onRemove}><Trash2 size={15} /></IconButton>
        </div>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
    </div>
  );
}

function CatalogPicker({ services, categories, onAdd }: { services: Service[]; categories: ServiceCategory[]; onAdd: (s: Service) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(true);
  const term = q.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = services.filter((s) => !term || `${s.name} ${s.short_description ?? ""}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(term));
  const catName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Outros";
  return (
    <div className="rounded-lg border border-ink-200">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="focus-ring flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900">
        Adicionar do catálogo <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-2 border-t border-ink-100 p-3">
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar no catálogo" aria-label="Buscar no catálogo" className={cn(inputClass, "py-2 pl-8")} />
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto">
            {list.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => onAdd(s)} className="focus-ring flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-ink-50" aria-label={`Adicionar ${s.name}`}>
                  <ServiceIcon icon={s.icon} imageUrl={s.image_url} className="h-8 w-8" size={15} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink-900">{s.name}</span>
                    <span className="block truncate text-xs text-ink-500">{catName(s.category_id)}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs tabular-nums text-ink-700">{s.package_items?.length ? packagePriceLabel(s.package_items) : `${formatMoney(s.price)}${billingSuffix(s.billing_type, s.billing_unit)}`}</span>
                  <Plus size={15} className="shrink-0 text-primary" />
                </button>
              </li>
            ))}
            {!list.length && <li className="px-2 py-3 text-sm text-ink-500">{services.length ? "Nada encontrado." : "O catálogo não tem serviços ativos."}</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

function SavePackageModal({ rows, categories, defaultName, onClose }: { rows: Row[]; categories: ServiceCategory[]; defaultName: string; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(defaultName ? `Pacote — ${defaultName}` : "");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (name.trim().length < 2) return setError("Informe o nome do pacote.");
    const items: PackageItem[] = rows.filter((r) => r.name.trim()).map((r) => ({ service_id: r.service_id, name: r.name.trim(), description: r.description, billing_type: r.billing_type, recurring: r.recurring, quantity: r.quantity, unit_price: Math.max(lineTotal(r) / (r.quantity || 1), 0) }));
    const recurring = items.filter((i) => i.recurring).reduce((s, i) => s + i.quantity * i.unit_price, 0);
    setBusy(true);
    setError("");
    const { error: rpcError } = await createClient().rpc("save_service", { p: { kind: "pacote", name: name.trim(), category_id: category || null, short_description: items.map((i) => i.name).join(" + ").slice(0, 280), icon: "layers", price: recurring, billing_type: recurring ? "mensal" : "unico", status: "ativo", package_items: items } });
    setBusy(false);
    if (rpcError) return setError(friendlyError(rpcError.message));
    toast("Pacote salvo no catálogo.");
    router.refresh();
    onClose();
  }
  return (
    <Modal open onClose={onClose} title="Salvar como pacote" description="Cria um pacote reutilizável no catálogo com os itens e valores atuais. A proposta não muda." size="sm"
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form="package-form" disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar pacote"}</button></>}>
      <form id="package-form" onSubmit={submit} className="space-y-4">
        <Field label="Nome do pacote"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></Field>
        <Field label="Categoria">
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Sem categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
        <ul className="space-y-1 text-sm text-ink-700">{rows.filter((r) => r.name.trim()).map((r) => <li key={r.key}>{r.quantity}× {r.name} — {formatMoney(lineTotal(r))} ({label(BILLING_TYPES, r.billing_type)})</li>)}</ul>
        <FormError message={error} />
      </form>
    </Modal>
  );
}
