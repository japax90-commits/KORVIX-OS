"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Archive, CalendarClock, Search, Trash2, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/hooks/useAction";
import { formatDateTime, formatMoney, fromDateTimeLocal, toDateTimeLocal, todayISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, Textarea, buttonClass, inputClass } from "@/components/ui/Form";

import { cn } from "@/lib/utils";
import { STAGES, STAGE_LABELS, STAGE_PROBABILITY, normalizeStage, type Stage } from "@/lib/crm";
import { CHANNELS, PRIORITIES } from "@/lib/options";
import { useConfirm, useToast } from "@/components/ui/Feedback";

const stages = STAGES;
const labels = STAGE_LABELS;
const probabilities = STAGE_PROBABILITY;
const stageAccent: Record<Stage, string> = { lead: "bg-ink-400", qualificacao: "bg-korvix-400", proposta: "bg-warning", negociacao: "bg-warning", ganho: "bg-success", perdido: "bg-danger" };
const priorityLabel = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label]));
const channelLabel = Object.fromEntries(CHANNELS.map((c) => [c.value, c.label]));

type Row = {
  id: string;
  client_name: string;
  origin_owner_id: string | null;
  closing_user_id: string | null;
  channel: string | null;
  stage: string;
  priority: string | null;
  estimated_value: number | null;
  probability: number | null;
  next_action: string | null;
  next_followup_at: string | null;
  loss_reason: string | null;
};
type User = { id: string; name: string };


type ClientRef = { id: string; company_name: string };
const normalizeName = (name: string) => name.trim().toLowerCase();

export function CrmClientV2({ opportunities, users, currentUserId, isAdmin = false, clients = [], openLeadId }: { opportunities: Row[]; users: User[]; currentUserId: string; isAdmin?: boolean; clients?: ClientRef[]; openLeadId?: string }) {
  const confirmDialog = useConfirm();
  const toast = useToast();
  const [clientList, setClientList] = useState(clients);
  const [converting, setConverting] = useState<string | null>(null);
  useEffect(() => setClientList(clients), [clients]);
  const clientFor = (name: string) => clientList.find((c) => normalizeName(c.company_name) === normalizeName(name));

  // Integração CRM → Clientes: um lead ganho vira cliente (sem duplicar pelo nome).
  async function convertToClient(item: Row) {
    if (converting || clientFor(item.client_name)) return;
    setConverting(item.id);
    setError("");
    const { data, error: e } = await createClient()
      .from("clients")
      .insert({
        company_name: item.client_name.trim(),
        contact_name: item.client_name.trim(),
        phone: "",
        origin_owner_id: item.origin_owner_id,
        account_manager_id: item.closing_user_id ?? item.origin_owner_id,
        operational_status: "onboarding",
        entry_date: todayISO(),
      })
      .select("id, company_name")
      .single();
    setConverting(null);
    if (e) return setError(friendlyError(e.message));
    if (data) {
      setClientList((list) => [...list, data as ClientRef]);
      toast(`${item.client_name} agora é cliente.`);
    }
  }
  const [items, setItems] = useState(opportunities);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [lossStage, setLossStage] = useState<Stage>("lead");

  // Novos registros criados pelo botão "Nova oportunidade" chegam via router.refresh().
  useEffect(() => setItems(opportunities), [opportunities]);

  // Abre direto a oportunidade indicada na URL (?lead=id), ex.: vindo dos follow-ups.
  const openedFromUrl = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!openLeadId || openedFromUrl.current === openLeadId) return;
    const target = opportunities.find((o) => o.id === openLeadId);
    if (target) {
      openedFromUrl.current = openLeadId;
      setFormError("");
      setFieldErrors({});
      setLossStage(normalizeStage(target.stage));
      setSelected(target);
    }
  }, [openLeadId, opportunities]);

  // Ao fechar, remove ?lead da URL para que o mesmo link possa reabrir o registro.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useEffect(() => {
    if (selected || !openLeadId || openedFromUrl.current !== openLeadId) return;
    openedFromUrl.current = undefined;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("lead");
    router.replace(params.size ? `${pathname}?${params}` : pathname, { scroll: false });
  }, [selected, openLeadId, pathname, router, searchParams]);

  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? "—";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (!q || i.client_name.toLowerCase().includes(q) || (i.next_action ?? "").toLowerCase().includes(q)) && (!owner || i.origin_owner_id === owner || i.closing_user_id === owner));
  }, [items, query, owner]);

  function open(item: Row) {
    setFormError("");
    setFieldErrors({});
    setLossStage(normalizeStage(item.stage));
    setSelected(item);
  }

  async function move(item: Row, stage: Stage) {
    // Perda exige motivo: abre o formulário em vez de mover diretamente.
    if (stage === "perdido" && !item.loss_reason) {
      open(item);
      setLossStage("perdido");
      return;
    }
    setError("");
    const { data, error: e } = await createClient()
      .from("opportunities")
      .update({ stage, probability: probabilities[stage], last_interaction_at: new Date().toISOString() })
      .eq("id", item.id)
      .select("*")
      .single();
    if (e) return setError(friendlyError(e.message));
    if (data) {
      setItems((c) => c.map((i) => (i.id === item.id ? (data as Row) : i)));
      toast(`${item.client_name} movido para ${labels[stage]}.`);
    }
  }

  async function archive(item: Row) {
    if (!(await confirmDialog({ description: `Arquivar o lead "${item.client_name}"? Ele sai do funil, mas o registro é preservado.`, title: "Arquivar lead", confirmLabel: "Arquivar", tone: "default" }))) return;
    setError("");
    const { error: e } = await createClient().from("opportunities").update({ archived_at: new Date().toISOString(), archived_by: currentUserId }).eq("id", item.id);
    if (e) return setError(friendlyError(e.message));
    setItems((c) => c.filter((i) => i.id !== item.id));
    toast("Lead arquivado.");
  }

  async function remove(item: Row) {
    if (!(await confirmDialog({ description: `Excluir definitivamente o lead "${item.client_name}"? Esta ação não pode ser desfeita.` }))) return;
    setError("");
    const { error: e } = await createClient().from("opportunities").delete().eq("id", item.id);
    if (e) return setError(friendlyError(e.message));
    setItems((c) => c.filter((i) => i.id !== item.id));
    toast("Lead excluído.");
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected || saving) return;
    setFormError("");
    setFieldErrors({});
    const f = new FormData(e.currentTarget);
    const stage = normalizeStage(String(f.get("stage") || "lead"));
    const clientName = String(f.get("client_name") || "").trim();
    const lossReason = String(f.get("loss_reason") || "").trim();
    const errors: Record<string, string> = {};
    if (!clientName) errors.client_name = "Informe o cliente.";
    if (stage === "perdido" && !lossReason) errors.loss_reason = "Informe o motivo da perda.";
    const estimatedValue = Number(f.get("estimated_value") || 0);
    const probability = Number(f.get("probability") ?? probabilities[stage]);
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) errors.estimated_value = "Informe um valor válido.";
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) errors.probability = "Use um valor entre 0 e 100.";
    if (Object.keys(errors).length) return setFieldErrors(errors);
    setSaving(true);
    const payload = {
      client_name: clientName,
      stage,
      priority: String(f.get("priority") || "media"),
      channel: String(f.get("channel") || "whatsapp"),
      // Apenas administradores redistribuem o fechamento (regra também aplicada pelo RLS).
      closing_user_id: isAdmin ? String(f.get("closing_user_id") || "") || null : selected.closing_user_id,
      estimated_value: estimatedValue,
      probability,
      next_action: String(f.get("next_action") || "").trim() || null,
      next_followup_at: fromDateTimeLocal(String(f.get("next_followup_at") || "")),
      loss_reason: stage === "perdido" ? lossReason : null,
      last_interaction_at: new Date().toISOString(),
    };
    const { data, error: e2 } = await createClient().from("opportunities").update(payload).eq("id", selected.id).select("*").single();
    setSaving(false);
    if (e2) return setFormError(friendlyError(e2.message));
    if (data) {
      setItems((c) => c.map((i) => (i.id === data.id ? (data as Row) : i)));
      setSelected(null);
      toast("Oportunidade atualizada.");
    }
  }

  const now = Date.now();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative sm:flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente ou próxima ação" aria-label="Buscar oportunidades" className={cn(inputClass, "pl-9")} />
        </div>
        {isAdmin && users.length > 1 && (
          <Select value={owner} onChange={(e) => setOwner(e.target.value)} className="sm:w-56" aria-label="Filtrar por responsável">
            <option value="">Todos os responsáveis</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
      </div>
      <FormError message={error} />

      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-3">
          {stages.map((stage) => {
            const list = filtered.filter((i) => normalizeStage(i.stage) === stage);
            const total = list.reduce((sum, i) => sum + Number(i.estimated_value || 0), 0);
            return (
              <section key={stage} className="flex w-[272px] shrink-0 flex-col rounded-xl border border-ink-200 bg-ink-50 p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", stageAccent[stage])} />
                    <h3 className="text-sm font-semibold text-ink-900">{labels[stage]}</h3>
                  </div>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-ink-200">{list.length}</span>
                </div>
                <p className="-mt-2 mb-3 text-xs text-ink-500">{formatMoney(total)}</p>
                <div className="space-y-2.5">
                  {list.map((item) => {
                    const overdue = item.next_followup_at && new Date(item.next_followup_at).getTime() < now && !["ganho", "perdido"].includes(normalizeStage(item.stage));
                    return (
                      <article key={item.id} className="rounded-lg border border-ink-200 bg-surface p-3 shadow-sm">
                        <button type="button" className="w-full text-left" onClick={() => open(item)}>
                          <p className="truncate text-sm font-medium text-ink-900">{item.client_name}</p>
                          <p className="text-sm text-ink-700">{formatMoney(item.estimated_value || 0)}</p>
                          <p className="mt-1 text-xs text-ink-500">{priorityLabel[item.priority || "media"] ?? item.priority} · {item.probability ?? probabilities[stage]}% · {channelLabel[item.channel || ""] ?? item.channel ?? "—"}</p>
                          {isAdmin && <p className="mt-0.5 truncate text-xs text-ink-500">{userName(item.origin_owner_id)}</p>}
                          {item.next_followup_at && (
                            <p className={cn("mt-1.5 flex items-center gap-1 text-xs", overdue ? "font-medium text-danger" : "text-ink-500")}>
                              <CalendarClock size={12} /> {formatDateTime(item.next_followup_at)}{overdue ? " · atrasado" : ""}
                            </p>
                          )}
                        </button>
                        {normalizeStage(item.stage) === "ganho" && (
                          clientFor(item.client_name) ? (
                            <Link href={`/clientes/${clientFor(item.client_name)!.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-korvix-600 hover:text-korvix-700">Ver ficha do cliente →</Link>
                          ) : (
                            <button type="button" onClick={() => convertToClient(item)} disabled={converting === item.id} className="mt-2 inline-flex items-center gap-1 rounded-md bg-success/10 px-2 py-1 text-xs font-medium text-success hover:bg-success/15 disabled:opacity-60">
                              <UserPlus size={13} /> {converting === item.id ? "Cadastrando..." : "Cadastrar como cliente"}
                            </button>
                          )
                        )}
                        <div className="mt-2 flex items-center gap-1 border-t border-ink-100 pt-2">
                          <select aria-label={`Mover ${item.client_name} de etapa`} className="focus-ring min-w-0 flex-1 rounded-md border border-ink-200 bg-surface px-1.5 py-1 text-xs text-ink-700" value={normalizeStage(item.stage)} onChange={(e) => move(item, normalizeStage(e.target.value))}>
                            {stages.map((option) => <option key={option} value={option}>{labels[option]}</option>)}
                          </select>
                          <IconButton label="Arquivar" onClick={() => archive(item)}><Archive size={14} /></IconButton>
                          {isAdmin && <IconButton label="Excluir definitivamente" tone="danger" onClick={() => remove(item)}><Trash2 size={14} /></IconButton>}
                        </div>
                      </article>
                    );
                  })}
                  {list.length === 0 && <p className="rounded-lg border border-dashed border-ink-300 p-3 text-center text-xs text-ink-500">Nenhuma oportunidade</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Editar oportunidade"
        size="lg"
        footer={
          <>
            <button type="button" onClick={() => setSelected(null)} className={buttonClass("secondary")}>Cancelar</button>
            <button type="submit" form="edit-opportunity" disabled={saving} className={buttonClass("primary")}>{saving ? "Salvando..." : "Salvar alterações"}</button>
          </>
        }
      >
        {selected && (
          <form id="edit-opportunity" key={selected.id} onSubmit={save} className="grid gap-4 md:grid-cols-2">
            <Field label="Cliente" error={fieldErrors.client_name}><Input name="client_name" defaultValue={selected.client_name} required /></Field>
            <Field label="Etapa" error={fieldErrors.stage}>
              <Select name="stage" value={lossStage} onChange={(e) => setLossStage(normalizeStage(e.target.value))}>{stages.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</Select>
            </Field>
            <Field label="Prioridade" error={fieldErrors.priority}><Select name="priority" defaultValue={selected.priority || "media"}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
            <Field label="Responsável pelo fechamento" hint={isAdmin ? undefined : "Somente a administração redistribui leads."} error={fieldErrors.closing_user_id}>
              <Select name="closing_user_id" defaultValue={selected.closing_user_id || currentUserId} disabled={!isAdmin}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
            </Field>
            <Field label="Canal" error={fieldErrors.channel}>
              <Select name="channel" defaultValue={selected.channel || "whatsapp"}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                {selected.channel && !channelLabel[selected.channel] && <option value={selected.channel}>{selected.channel}</option>}
              </Select>
            </Field>
            <Field label="Valor estimado (R$)" error={fieldErrors.estimated_value}><Input name="estimated_value" type="number" min="0" step="0.01" defaultValue={selected.estimated_value || 0} /></Field>
            <Field label="Probabilidade (%)" error={fieldErrors.probability}><Input name="probability" type="number" min="0" max="100" defaultValue={selected.probability ?? probabilities[normalizeStage(selected.stage)]} /></Field>
            <Field label="Próximo follow-up" error={fieldErrors.next_followup_at}><Input name="next_followup_at" type="datetime-local" defaultValue={toDateTimeLocal(selected.next_followup_at)} /></Field>
            <Field label="Próxima ação" className="md:col-span-2" error={fieldErrors.next_action}><Input name="next_action" defaultValue={selected.next_action || ""} placeholder="Ex.: enviar proposta revisada" /></Field>
            {lossStage === "perdido" && (
              <Field label="Motivo da perda" className="md:col-span-2" error={fieldErrors.loss_reason}><Textarea name="loss_reason" defaultValue={selected.loss_reason || ""} required /></Field>
            )}
            <div className="md:col-span-2"><FormError message={formError} /></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
