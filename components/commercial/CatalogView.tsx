"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Archive, ArchiveRestore, Copy, Eye, LayoutGrid, List, Pencil, Plus, Power, PowerOff, Search, Star, Tags, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { useConfirm, useToast } from "@/components/ui/Feedback";
import { Field, FormError, IconButton, Input, Select, buttonClass, inputClass } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/Badge";
import { ServiceIcon } from "@/components/commercial/ServiceIcon";
import { ServiceFormModal, ServicePreview, draftFromService, packagePriceLabel, type ServiceDraft } from "@/components/commercial/ServiceForm";
import { BILLING_TYPES, SERVICE_KINDS, SERVICE_STATUSES, billingSuffix, label } from "@/lib/commercial/options";
import type { Service, ServiceCategory, ServiceInternal } from "@/lib/commercial/types";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type SortKey = "nome" | "preco" | "atualizado";

function priceLabel(s: Service) {
  if (s.package_items?.length) return packagePriceLabel(s.package_items);
  if (s.billing_type === "personalizado" && !Number(s.price)) return "Sob consulta";
  return `${formatMoney(s.price)}${billingSuffix(s.billing_type, s.billing_unit)}`;
}

const normalize = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function CatalogView({
  services,
  categories,
  internals,
  canEdit,
  usage,
}: {
  services: Service[];
  categories: ServiceCategory[];
  internals: ServiceInternal[];
  canEdit: boolean;
  /** Quantas propostas usam cada serviço (só para a administração). */
  usage: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState(canEdit ? "visiveis" : "ativo");
  const [billing, setBilling] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState<SortKey>("nome");
  const [view, setView] = useState<"cards" | "tabela">("cards");
  const [form, setForm] = useState<{ key: number; draft: ServiceDraft } | null>(null);
  const [preview, setPreview] = useState<Service | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  const categoryName = (id: string | null) => categories.find((c) => c.id === id)?.name ?? "Sem categoria";
  const internalOf = (id: string) => internals.find((i) => i.service_id === id) ?? null;
  const openForm = (draft: ServiceDraft) => setForm({ key: Date.now(), draft });

  const filtered = useMemo(() => {
    const term = normalize(q.trim());
    const rows = services.filter((s) => {
      if (status === "visiveis" ? s.status === "arquivado" : status && s.status !== status) return false;
      if (category && (category === "none" ? s.category_id : s.category_id !== category)) return false;
      if (billing && s.billing_type !== billing) return false;
      if (kind && s.kind !== kind) return false;
      if (term && !normalize(`${s.name} ${s.short_description ?? ""} ${s.description ?? ""}`).includes(term)) return false;
      return true;
    });
    return rows.sort((a, b) => {
      if (sort === "preco") return Number(a.price) - Number(b.price);
      if (sort === "atualizado") return b.updated_at.localeCompare(a.updated_at);
      return Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, "pt-BR");
    });
  }, [services, q, category, status, billing, kind, sort]);

  const clear = () => { setQ(""); setCategory(""); setStatus(canEdit ? "visiveis" : "ativo"); setBilling(""); setKind(""); };
  const hasFilters = q || category || billing || kind || status !== (canEdit ? "visiveis" : "ativo");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative lg:w-80">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou descrição" aria-label="Buscar serviços" className={cn(inputClass, "pl-9")} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && <button type="button" onClick={() => setCategoriesOpen(true)} className={buttonClass("secondary", undefined, "sm")}><Tags size={14} /> Categorias</button>}
          <Link href="/comercial/propostas/nova?personalizada=1" className={buttonClass("secondary", undefined, "sm")}><Plus size={14} /> Criar serviço personalizado</Link>
          {canEdit && <button type="button" onClick={() => openForm(draftFromService())} className={buttonClass("primary", undefined, "sm")}><Plus size={14} /> Novo serviço</button>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:[&_select]:w-auto">
        <Select aria-label="Filtrar por categoria" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          <option value="none">Sem categoria</option>
        </Select>
        <Select aria-label="Filtrar por status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {canEdit && <option value="visiveis">Ativos e inativos</option>}
          {SERVICE_STATUSES.filter((s) => canEdit || s.value === "ativo").map((s) => <option key={s.value} value={s.value}>{s.label}s</option>)}
          {canEdit && <option value="">Todos</option>}
        </Select>
        <Select aria-label="Filtrar por tipo de cobrança" value={billing} onChange={(e) => setBilling(e.target.value)}>
          <option value="">Toda cobrança</option>
          {BILLING_TYPES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </Select>
        <Select aria-label="Filtrar por tipo" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">Serviços e pacotes</option>
          {SERVICE_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}s</option>)}
        </Select>
        <Select aria-label="Ordenar" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="nome">Ordenar por nome</option>
          <option value="preco">Ordenar por preço</option>
          <option value="atualizado">Atualizados recentemente</option>
        </Select>
        <div className="col-span-2 flex items-center justify-end gap-1 sm:ml-auto" role="group" aria-label="Modo de visualização">
          <IconButton label="Ver em cards" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={cn("border border-ink-200", view === "cards" && "bg-ink-100 text-ink-900")}><LayoutGrid size={15} /></IconButton>
          <IconButton label="Ver em tabela" aria-pressed={view === "tabela"} onClick={() => setView("tabela")} className={cn("border border-ink-200", view === "tabela" && "bg-ink-100 text-ink-900")}><List size={15} /></IconButton>
        </div>
      </div>

      <p className="text-xs text-ink-500" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "item" : "itens"}
        {hasFilters && <> · <button type="button" onClick={clear} className="font-medium text-korvix-600 hover:underline">Limpar filtros</button></>}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-300 p-10 text-center">
          <p className="text-sm font-medium text-ink-900">{services.length ? "Nenhum serviço encontrado com esses filtros." : "Nenhum serviço cadastrado ainda."}</p>
          {canEdit && !services.length && <button type="button" onClick={() => openForm(draftFromService())} className={buttonClass("primary", "mt-4", "sm")}><Plus size={14} /> Cadastrar o primeiro serviço</button>}
        </div>
      ) : view === "cards" ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <article key={s.id} aria-label={s.name} className={cn("flex flex-col rounded-xl border bg-surface p-4 shadow-panel", s.featured ? "border-korvix-300" : "border-ink-200", s.status !== "ativo" && "opacity-80")}>
              <div className="flex items-start gap-3">
                <ServiceIcon icon={s.icon} imageUrl={s.image_url} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold leading-snug text-ink-900">{s.name}</h3>
                    {s.featured && <Star size={15} className="mt-0.5 shrink-0 fill-warning text-warning" aria-label="Destaque" />}
                  </div>
                  <p className="text-xs text-ink-500">{categoryName(s.category_id)} · {label(SERVICE_KINDS, s.kind)}</p>
                </div>
              </div>
              {s.short_description && <p className="mt-3 line-clamp-3 text-sm text-ink-600">{s.short_description}</p>}
              <p className="mt-3 text-xl font-bold tabular-nums text-korvix-700">{priceLabel(s)}</p>
              <p className="text-xs text-ink-500">{label(BILLING_TYPES, s.billing_type)}</p>
              <div className="mt-auto flex items-center justify-between gap-2 pt-4">
                <StatusBadge status={s.status} />
                <ServiceActions service={s} canEdit={canEdit} usage={usage[s.id] ?? 0} onEdit={() => openForm(draftFromService(s, internalOf(s.id)))} onDuplicate={() => openForm(draftFromService(s, internalOf(s.id), true))} onPreview={() => setPreview(s)} />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-200 bg-surface">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-ink-50 text-left text-xs uppercase tracking-wide text-ink-500">
              <tr><th className="px-4 py-3">Serviço</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3">Preço</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Atualizado</th><th className="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><ServiceIcon icon={s.icon} imageUrl={s.image_url} className="h-8 w-8" size={16} /><div className="min-w-0"><p className="font-medium text-ink-900">{s.name}</p><p className="max-w-xs truncate text-xs text-ink-500">{s.short_description}</p></div></div></td>
                  <td className="px-4 py-3 text-ink-600">{categoryName(s.category_id)}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums">{priceLabel(s)}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="px-4 py-3 text-ink-500">{formatDate(s.updated_at)}</td>
                  <td className="px-4 py-3"><div className="flex justify-end"><ServiceActions service={s} canEdit={canEdit} usage={usage[s.id] ?? 0} onEdit={() => openForm(draftFromService(s, internalOf(s.id)))} onDuplicate={() => openForm(draftFromService(s, internalOf(s.id), true))} onPreview={() => setPreview(s)} /></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && <ServiceFormModal key={form.key} open onClose={() => setForm(null)} initial={form.draft} categories={categories} canSeeInternal={canEdit} />}
      {preview && <ServicePreview open service={preview} onClose={() => setPreview(null)} />}
      {categoriesOpen && <CategoryManager open categories={categories} services={services} onClose={() => setCategoriesOpen(false)} />}
    </div>
  );
}

function ServiceActions({ service, canEdit, usage, onEdit, onDuplicate, onPreview }: { service: Service; canEdit: boolean; usage: number; onEdit: () => void; onDuplicate: () => void; onPreview: () => void }) {
  const { run, busy } = useAction();
  const confirm = useConfirm();
  const toast = useToast();

  async function setStatus(status: Service["status"], success: string) {
    const ok = await run(async () => {
      const { data, error } = await createClient().from("services").update({ status }).eq("id", service.id).eq("updated_at", service.updated_at).select("id").maybeSingle();
      if (error) return { error };
      if (!data) return { error: { message: "Este serviço foi alterado em outro lugar. A lista foi atualizada; tente de novo." } };
    }, { success });
    if (!ok) toast(`Não foi possível alterar "${service.name}".`, "error");
  }

  async function remove() {
    if (usage > 0) {
      toast(`"${service.name}" está em ${usage} proposta(s) e não pode ser excluído. Arquive-o para tirá-lo do catálogo.`, "error");
      return;
    }
    if (!(await confirm({ title: "Excluir serviço", description: `Excluir "${service.name}" definitivamente? Esta ação não pode ser desfeita. Para apenas tirá-lo do catálogo, use Arquivar.`, confirmLabel: "Excluir" }))) return;
    const ok = await run(async () => createClient().from("services").delete().eq("id", service.id), { success: "Serviço excluído." });
    if (!ok) toast(`Não foi possível excluir "${service.name}".`, "error");
  }

  return (
    <div className="flex items-center gap-0.5">
      <IconButton label={`Visualizar ${service.name} como cliente`} onClick={onPreview}><Eye size={15} /></IconButton>
      {canEdit && (
        <>
          <IconButton label={`Editar ${service.name}`} onClick={onEdit} disabled={busy}><Pencil size={15} /></IconButton>
          <IconButton label={`Duplicar ${service.name}`} onClick={onDuplicate} disabled={busy}><Copy size={15} /></IconButton>
          {service.status === "ativo" && <IconButton label={`Desativar ${service.name}`} onClick={() => setStatus("inativo", "Serviço desativado.")} disabled={busy}><PowerOff size={15} /></IconButton>}
          {service.status === "inativo" && <IconButton label={`Ativar ${service.name}`} onClick={() => setStatus("ativo", "Serviço ativado.")} disabled={busy}><Power size={15} /></IconButton>}
          {service.status !== "arquivado" ? (
            <IconButton label={`Arquivar ${service.name}`} onClick={async () => { if (await confirm({ title: "Arquivar serviço", description: `"${service.name}" sai do catálogo e das novas propostas. Propostas antigas continuam intactas.`, confirmLabel: "Arquivar", tone: "default" })) setStatus("arquivado", "Serviço arquivado."); }} disabled={busy}><Archive size={15} /></IconButton>
          ) : (
            <IconButton label={`Restaurar ${service.name}`} onClick={() => setStatus("inativo", "Serviço restaurado como inativo.")} disabled={busy}><ArchiveRestore size={15} /></IconButton>
          )}
          <IconButton label={`Excluir ${service.name}`} tone="danger" onClick={remove} disabled={busy}><Trash2 size={15} /></IconButton>
        </>
      )}
    </div>
  );
}

function CategoryManager({ open, onClose, categories, services }: { open: boolean; onClose: () => void; categories: ServiceCategory[]; services: Service[] }) {
  const { run, busy, error, setError } = useAction();
  const confirm = useConfirm();
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const value = name.trim();
    if (!value) return setError("Informe o nome da categoria.");
    await run(async () => createClient().from("service_categories").insert({ name: value, sort_order: categories.length + 1 }), { success: "Categoria criada.", onSuccess: () => setName("") });
  }
  async function rename() {
    if (!editing) return;
    const value = editing.name.trim();
    if (!value) return setError("Informe o nome da categoria.");
    await run(async () => createClient().from("service_categories").update({ name: value }).eq("id", editing.id), { success: "Categoria renomeada.", onSuccess: () => setEditing(null) });
  }
  async function remove(c: ServiceCategory) {
    const count = services.filter((s) => s.category_id === c.id).length;
    if (!(await confirm({ title: "Excluir categoria", description: count ? `${count} serviço(s) desta categoria ficarão “Sem categoria”. Nenhum serviço é excluído.` : `Excluir a categoria "${c.name}"?`, confirmLabel: "Excluir" }))) return;
    await run(async () => createClient().from("service_categories").delete().eq("id", c.id), { success: "Categoria excluída." });
  }

  return (
    <Modal open={open} onClose={onClose} title="Categorias" description="Organize o catálogo sem depender de programação." size="sm">
      <div className="space-y-4">
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded-lg border border-ink-100 p-2">
              {editing?.id === c.id ? (
                <>
                  <Input aria-label="Novo nome da categoria" value={editing.name} onChange={(e) => setEditing({ id: c.id, name: e.target.value })} className="py-1.5" />
                  <button type="button" onClick={rename} disabled={busy} className={buttonClass("primary", undefined, "sm")}>Salvar</button>
                  <button type="button" onClick={() => setEditing(null)} className={buttonClass("ghost", undefined, "sm")}>Cancelar</button>
                </>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm">{c.name} <span className="text-xs text-ink-500">({services.filter((s) => s.category_id === c.id).length})</span></span>
                  <IconButton label={`Renomear ${c.name}`} onClick={() => setEditing({ id: c.id, name: c.name })}><Pencil size={14} /></IconButton>
                  <IconButton label={`Excluir ${c.name}`} tone="danger" onClick={() => remove(c)} disabled={busy}><Trash2 size={14} /></IconButton>
                </>
              )}
            </li>
          ))}
          {!categories.length && <li className="text-sm text-ink-500">Nenhuma categoria.</li>}
        </ul>
        <form onSubmit={create} className="flex items-end gap-2">
          <Field label="Nova categoria" className="flex-1"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} /></Field>
          <button type="submit" disabled={busy} className={buttonClass("primary")}>Adicionar</button>
        </form>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
