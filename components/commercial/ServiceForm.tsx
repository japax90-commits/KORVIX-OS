"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, Textarea, buttonClass } from "@/components/ui/Form";
import { MoneyInput } from "@/components/commercial/MoneyInput";
import { ICON_LABELS, ServiceIcon } from "@/components/commercial/ServiceIcon";
import { BILLING_TYPES, SERVICE_ICONS, SERVICE_KINDS, SERVICE_STATUSES, billingSuffix, isRecurringBilling, type BillingType, type ServiceKind, type ServiceStatus } from "@/lib/commercial/options";
import { estimatedMargin } from "@/lib/commercial/calc";
import type { PackageItem, Service, ServiceCategory, ServiceInternal } from "@/lib/commercial/types";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ServiceDraft = {
  id?: string;
  updated_at?: string;
  kind: ServiceKind;
  category_id: string;
  name: string;
  short_description: string;
  description: string;
  icon: string;
  image_url: string;
  price: number | null;
  billing_type: BillingType;
  billing_unit: string;
  billing_period: string;
  delivery_estimate: string;
  scope: string;
  deliverables: string;
  limits: string;
  commercial_terms: string;
  status: ServiceStatus;
  featured: boolean;
  package_items: PackageItem[];
  source_service_id: string | null;
  internal_cost: number | null;
  internal_notes: string;
};

export function draftFromService(service?: Service | null, internal?: ServiceInternal | null, copy = false): ServiceDraft {
  return {
    id: copy ? undefined : service?.id,
    updated_at: copy ? undefined : service?.updated_at,
    kind: service?.kind ?? "servico",
    category_id: service?.category_id ?? "",
    name: service ? (copy ? `${service.name} (cópia)` : service.name) : "",
    short_description: service?.short_description ?? "",
    description: service?.description ?? "",
    icon: service?.icon ?? "briefcase",
    image_url: service?.image_url ?? "",
    price: service ? Number(service.price) : null,
    billing_type: service?.billing_type ?? "mensal",
    billing_unit: service?.billing_unit ?? "",
    billing_period: service?.billing_period ?? "",
    delivery_estimate: service?.delivery_estimate ?? "",
    scope: service?.scope ?? "",
    deliverables: (service?.deliverables ?? []).join("\n"),
    limits: service?.limits ?? "",
    commercial_terms: service?.commercial_terms ?? "",
    // Cópia começa inativa para não aparecer em propostas antes de revisada.
    status: copy ? "inativo" : service?.status ?? "ativo",
    featured: copy ? false : service?.featured ?? false,
    package_items: service?.package_items ?? [],
    source_service_id: copy ? service?.id ?? null : service?.source_service_id ?? null,
    internal_cost: internal?.internal_cost ?? null,
    internal_notes: internal?.internal_notes ?? "",
  };
}

function Section({ title, description, defaultOpen = true, children }: { title: string; description?: string; defaultOpen?: boolean; children: React.ReactNode }) {
  return (
    <details open={defaultOpen} className="group rounded-xl border border-ink-200 [&_summary::-webkit-details-marker]:hidden">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-ink-900">{title}</span>
          {description && <span className="block text-xs text-ink-500">{description}</span>}
        </span>
        <ChevronDown size={16} className="shrink-0 text-ink-500 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 border-t border-ink-100 px-4 py-4">{children}</div>
    </details>
  );
}

export function ServiceFormModal({
  open,
  onClose,
  initial,
  categories,
  canSeeInternal,
}: {
  open: boolean;
  onClose: () => void;
  initial: ServiceDraft;
  categories: ServiceCategory[];
  canSeeInternal: boolean;
}) {
  const [d, setD] = useState<ServiceDraft>(initial);
  const { run, busy, error, fieldErrors, fail } = useAction();
  const set = <K extends keyof ServiceDraft>(key: K, value: ServiceDraft[K]) => setD((cur) => ({ ...cur, [key]: value }));
  const isNew = !d.id;
  const margin = estimatedMargin(d.price, d.internal_cost);
  const hasItems = d.package_items.length > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errors: Record<string, string> = {};
    const name = d.name.trim();
    if (name.length < 2) errors.name = "Informe o nome do serviço (mínimo 2 caracteres).";
    if (name.length > 120) errors.name = "Use no máximo 120 caracteres.";
    if (!hasItems && d.billing_type !== "personalizado" && (d.price === null || d.price < 0)) errors.price = "Informe o preço de venda.";
    if (d.short_description.length > 280) errors.short_description = "Use no máximo 280 caracteres.";
    if (d.image_url && !/^https:\/\/\S+$/.test(d.image_url.trim())) errors.image_url = "Use um endereço que comece com https://";
    if (d.internal_cost !== null && d.internal_cost < 0) errors.internal_cost = "O custo não pode ser negativo.";
    if (Object.keys(errors).length) return fail(errors);

    const payload: Record<string, unknown> = {
      id: d.id ?? null,
      expected_updated_at: d.updated_at ?? null,
      kind: d.kind,
      category_id: d.category_id || null,
      name,
      short_description: d.short_description,
      description: d.description,
      icon: d.icon,
      image_url: d.image_url.trim(),
      price: hasItems ? packageRecurring(d.package_items) : d.price ?? 0,
      billing_type: d.billing_type,
      billing_unit: d.billing_unit,
      billing_period: d.billing_period,
      delivery_estimate: d.delivery_estimate,
      scope: d.scope,
      deliverables: d.deliverables.split("\n").map((s) => s.trim()).filter(Boolean),
      limits: d.limits,
      commercial_terms: d.commercial_terms,
      status: d.status,
      featured: d.featured,
      package_items: d.package_items,
      source_service_id: d.source_service_id,
    };
    if (canSeeInternal) {
      payload.internal_cost = d.internal_cost;
      payload.internal_notes = d.internal_notes;
    }
    await run(async () => createClient().rpc("save_service", { p: payload }), {
      onSuccess: onClose,
      success: isNew ? (d.source_service_id ? "Cópia criada. Ela começa inativa até você revisá-la." : "Serviço cadastrado.") : "Alterações salvas.",
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={isNew ? (d.source_service_id ? "Duplicar serviço" : "Novo serviço") : "Editar serviço"}
      description={d.source_service_id && isNew ? "A cópia é um registro novo; o original não muda." : undefined}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button>
          <button type="submit" form="service-form" disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button>
        </>
      }
    >
      <form id="service-form" onSubmit={submit} className="space-y-4" noValidate>
        <Section title="Informações básicas">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome" error={fieldErrors.name} className="sm:col-span-2">
              <Input value={d.name} onChange={(e) => set("name", e.target.value)} maxLength={120} required />
            </Field>
            <Field label="Tipo">
              <Select value={d.kind} onChange={(e) => set("kind", e.target.value as ServiceKind)}>
                {SERVICE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </Select>
            </Field>
            <Field label="Categoria" hint={categories.length ? undefined : "Crie categorias em “Categorias”."}>
              <Select value={d.category_id} onChange={(e) => set("category_id", e.target.value)}>
                <option value="">Sem categoria</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label="Descrição curta" hint="Aparece nos cards e na proposta." error={fieldErrors.short_description} className="sm:col-span-2">
              <Textarea rows={2} value={d.short_description} onChange={(e) => set("short_description", e.target.value)} maxLength={280} />
            </Field>
            <Field label="Status">
              <Select value={d.status} onChange={(e) => set("status", e.target.value as ServiceStatus)}>
                {SERVICE_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </Field>
            <label className="flex items-center gap-2 self-end pb-2.5 text-sm text-ink-700">
              <input type="checkbox" checked={d.featured} onChange={(e) => set("featured", e.target.checked)} className="h-4 w-4 rounded border-ink-300 accent-[rgb(var(--primary))]" />
              Destaque comercial
            </label>
          </div>
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium text-ink-700">Ícone</legend>
            <div className="flex flex-wrap gap-2">
              {SERVICE_ICONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => set("icon", key)}
                  aria-pressed={d.icon === key}
                  aria-label={ICON_LABELS[key]}
                  title={ICON_LABELS[key]}
                  className={cn("focus-ring rounded-lg p-0.5", d.icon === key ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100")}
                >
                  <ServiceIcon icon={key} className="h-9 w-9" size={17} />
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Imagem (opcional)" hint="Endereço https de uma imagem já publicada. Substitui o ícone." error={fieldErrors.image_url}>
            <Input value={d.image_url} onChange={(e) => set("image_url", e.target.value)} placeholder="https://" inputMode="url" />
          </Field>
        </Section>

        <Section title="Preço e cobrança">
          {hasItems ? (
            <PackageItemsEditor items={d.package_items} onChange={(items) => set("package_items", items)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Preço de venda" error={fieldErrors.price} hint={d.billing_type === "personalizado" ? "Deixe em branco para “sob consulta”." : undefined}>
                <MoneyInput value={d.price} onValueChange={(v) => set("price", v)} />
              </Field>
              <Field label="Tipo de cobrança" hint={isRecurringBilling(d.billing_type) ? "Entra no valor recorrente das propostas." : "Entra nos valores únicos das propostas."}>
                <Select value={d.billing_type} onChange={(e) => set("billing_type", e.target.value as BillingType)}>
                  {BILLING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
                </Select>
              </Field>
              <Field label="Unidade de cobrança" hint="Ex.: mês, vídeo, hora, página.">
                <Input value={d.billing_unit} onChange={(e) => set("billing_unit", e.target.value)} maxLength={60} />
              </Field>
              <Field label="Periodicidade / duração" hint="Ex.: contrato mínimo de 3 meses.">
                <Input value={d.billing_period} onChange={(e) => set("billing_period", e.target.value)} maxLength={120} />
              </Field>
            </div>
          )}
          {d.billing_type !== "mensal" && !hasItems && (
            <Field label="Prazo estimado de entrega" hint="Ex.: 15 dias úteis.">
              <Input value={d.delivery_estimate} onChange={(e) => set("delivery_estimate", e.target.value)} maxLength={120} />
            </Field>
          )}
        </Section>

        <Section title="Escopo e entregáveis" description="Opcional — preencha o que fizer sentido para este serviço." defaultOpen={!isNew && Boolean(d.description || d.scope || d.deliverables)}>
          <Field label="Descrição completa"><Textarea rows={4} value={d.description} onChange={(e) => set("description", e.target.value)} /></Field>
          <Field label="Escopo"><Textarea rows={3} value={d.scope} onChange={(e) => set("scope", e.target.value)} /></Field>
          <Field label="Entregáveis incluídos" hint="Um por linha."><Textarea rows={4} value={d.deliverables} onChange={(e) => set("deliverables", e.target.value)} /></Field>
          <Field label="Limites, quantidades ou condições do pacote"><Textarea rows={2} value={d.limits} onChange={(e) => set("limits", e.target.value)} /></Field>
          <Field label="Condições comerciais"><Textarea rows={2} value={d.commercial_terms} onChange={(e) => set("commercial_terms", e.target.value)} /></Field>
        </Section>

        {canSeeInternal && (
          <Section title="Uso interno" description="Nunca aparece para o cliente." defaultOpen={d.internal_cost !== null || Boolean(d.internal_notes)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Custo interno estimado" error={fieldErrors.internal_cost}>
                <MoneyInput value={d.internal_cost} onValueChange={(v) => set("internal_cost", v)} />
              </Field>
              <div>
                <p className="mb-1.5 text-sm font-medium text-ink-700">Margem estimada</p>
                <p className="rounded-lg bg-ink-50 px-3 py-2.5 text-sm tabular-nums text-ink-700">
                  {margin === null ? "Informe preço e custo para calcular." : `${margin.toLocaleString("pt-BR")}%`}
                </p>
              </div>
            </div>
            <Field label="Observações internas"><Textarea rows={3} value={d.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} /></Field>
          </Section>
        )}
        <FormError message={error} />
      </form>
    </Modal>
  );
}

const packageRecurring = (items: PackageItem[]) => items.filter((i) => i.recurring).reduce((s, i) => s + i.quantity * i.unit_price, 0);
const packageOnce = (items: PackageItem[]) => items.filter((i) => !i.recurring).reduce((s, i) => s + i.quantity * i.unit_price, 0);

/** Resumo de preço de um pacote montado a partir de proposta. */
export function packagePriceLabel(items: PackageItem[]) {
  const rec = packageRecurring(items);
  const once = packageOnce(items);
  return [rec ? `${formatMoney(rec)}/mês` : "", once ? `${formatMoney(once)} único` : ""].filter(Boolean).join(" + ") || formatMoney(0);
}

function PackageItemsEditor({ items, onChange }: { items: PackageItem[]; onChange: (items: PackageItem[]) => void }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-ink-500">Pacote com itens próprios: ao ser usado numa proposta, cada item entra com o seu valor.</p>
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2">
          <span className="min-w-0 flex-1 truncate text-sm">{item.quantity}× {item.name}</span>
          <span className="w-32 shrink-0 text-right text-sm tabular-nums text-ink-700">{formatMoney(item.unit_price)}{billingSuffix(item.billing_type)}</span>
          <IconButton label={`Remover ${item.name}`} tone="danger" onClick={() => onChange(items.filter((_, i) => i !== idx))}><Trash2 size={14} /></IconButton>
        </div>
      ))}
      <p className="text-sm font-medium text-ink-900">Total: {packagePriceLabel(items)}</p>
    </div>
  );
}

/** Como o serviço aparece para o cliente (sem custos nem observações internas). */
export function ServicePreview({ service, open, onClose }: { service: Service; open: boolean; onClose: () => void }) {
  const items = service.package_items ?? [];
  return (
    <Modal open={open} onClose={onClose} title="Visualização para o cliente" description="Dados internos não aparecem aqui." size="md">
      <article className="rounded-2xl border border-ink-200 p-5">
        <div className="flex items-start gap-3">
          <ServiceIcon icon={service.icon} imageUrl={service.image_url} className="h-12 w-12" size={22} />
          <div className="min-w-0">
            <h4 className="text-lg font-semibold text-ink-900">{service.name}</h4>
            {service.short_description && <p className="mt-1 text-sm text-ink-600">{service.short_description}</p>}
          </div>
        </div>
        <p className="mt-4 text-2xl font-bold tabular-nums text-korvix-700">
          {items.length ? packagePriceLabel(items) : service.billing_type === "personalizado" && !Number(service.price) ? "Sob consulta" : <>{formatMoney(service.price)}<span className="text-sm font-normal text-ink-500">{billingSuffix(service.billing_type, service.billing_unit)}</span></>}
        </p>
        {service.billing_period && <p className="text-xs text-ink-500">{service.billing_period}</p>}
        {service.description && <p className="mt-4 whitespace-pre-line text-sm text-ink-700">{service.description}</p>}
        {(service.deliverables?.length > 0 || items.length > 0) && (
          <ul className="mt-4 space-y-1.5 text-sm text-ink-700">
            {(items.length ? items.map((i) => `${i.quantity > 1 ? `${i.quantity}× ` : ""}${i.name}`) : service.deliverables).map((x) => <li key={x} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-korvix-500" />{x}</li>)}
          </ul>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          {service.scope && <div><dt className="font-medium text-ink-900">Escopo</dt><dd className="whitespace-pre-line text-ink-600">{service.scope}</dd></div>}
          {service.delivery_estimate && <div><dt className="font-medium text-ink-900">Prazo estimado</dt><dd className="text-ink-600">{service.delivery_estimate}</dd></div>}
          {service.limits && <div><dt className="font-medium text-ink-900">Condições do pacote</dt><dd className="whitespace-pre-line text-ink-600">{service.limits}</dd></div>}
          {service.commercial_terms && <div><dt className="font-medium text-ink-900">Condições comerciais</dt><dd className="whitespace-pre-line text-ink-600">{service.commercial_terms}</dd></div>}
        </dl>
      </article>
    </Modal>
  );
}
