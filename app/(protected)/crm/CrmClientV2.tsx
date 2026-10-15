"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Archive, CalendarClock, Search, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { friendlyError } from "@/lib/hooks/useAction";
import { formatDateTime, formatMoney, fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, Textarea, buttonClass, inputClass } from "@/components/ui/Form";
import { CHANNELS, PRIORITIES } from "./CrmClient";
import { cn } from "@/lib/utils";

const stages = ["lead", "qualificacao", "proposta", "negociacao", "ganho", "perdido"] as const;
type Stage = (typeof stages)[number];
const labels: Record<Stage, string> = { lead: "Lead", qualificacao: "Qualificação", proposta: "Proposta", negociacao: "Negociação", ganho: "Ganho", perdido: "Perdido" };
const probabilities: Record<Stage, number> = { lead: 10, qualificacao: 25, proposta: 50, negociacao: 70, ganho: 100, perdido: 0 };
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

function normalizeStage(v: string): Stage {
  if (v === "fechado_ganho") return "ganho";
  if (v === "fechado_perdido") return "perdido";
  return (stages as readonly string[]).includes(v) ? (v as Stage) : "lead";
}

export function CrmClientV2({ opportunities, users, currentUserId, isAdmin = false }: { opportunities: Row[]; users: User[]; currentUserId: string; isAdmin?: boolean }) {
  const [items, setItems] = useState(opportunities);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const [lossStage, setLossStage] = useState<Stage>("lead");

  // Novos registros criados pelo botão "Nova oportunidade" chegam via router.refresh().
  useEffect(() => setItems(opportunities), [opportunities]);

  const userName = (id: string | null) => users.find((u) => u.id === id)?.name ?? "—";
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => (!q || i.client_name.toLowerCase().includes(q) || (i.next_action ?? "").toLowerCase().includes(q)) && (!owner || i.origin_owner_id === owner || i.closing_user_id === owner));
  }, [items, query, owner]);

  function open(item: Row) {
    setFormError("");
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
    if (data) setItems((c) => c.map((i) => (i.id === item.id ? (data as Row) : i)));
  }

  async function archive(item: Row) {
    if (!window.confirm(`Arquivar o lead "${item.client_name}"? Ele sai do funil, mas o registro é preservado.`)) return;
    setError("");
    const { error: e } = await createClient().from("opportunities").update({ archived_at: new Date().toISOString(), archived_by: currentUserId }).eq("id", item.id);
    if (e) return setError(friendlyError(e.message));
    setItems((c) => c.filter((i) => i.id !== item.id));
  }

  async function remove(item: Row) {
    if (!window.confirm(`Excluir definitivamente o lead "${item.client_name}"? Esta ação não pode ser desfeita.`)) return;
    setError("");
    const { error: e } = await createClient().from("opportunities").delete().eq("id", item.id);
    if (e) return setError(friendlyError(e.message));
    setItems((c) => c.filter((i) => i.id !== item.id));
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    setFormError("");
    const f = new FormData(e.currentTarget);
    const stage = normalizeStage(String(f.get("stage") || "lead"));
    const clientName = String(f.get("client_name") || "").trim();
    const lossReason = String(f.get("loss_reason") || "").trim();
    if (!clientName) return setFormError("Informe o cliente.");
    if (stage === "perdido" && !lossReason) return setFormError("Informe o motivo da perda.");
    const estimatedValue = Number(f.get("estimated_value") || 0);
    const probability = Number(f.get("probability") ?? probabilities[stage]);
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0 || !Number.isFinite(probability) || probability < 0 || probability > 100) return setFormError("Informe valor e probabilidade válidos (0 a 100%).");
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
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-ink-600 ring-1 ring-ink-200">{list.length}</span>
                </div>
                <p className="-mt-2 mb-3 text-xs text-ink-500">{formatMoney(total)}</p>
                <div className="space-y-2.5">
                  {list.map((item) => {
                    const overdue = item.next_followup_at && new Date(item.next_followup_at).getTime() < now && !["ganho", "perdido"].includes(normalizeStage(item.stage));
                    return (
                      <article key={item.id} className="rounded-lg border border-ink-200 bg-white p-3 shadow-sm">
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
                        <div className="mt-2 flex items-center gap-1 border-t border-ink-100 pt-2">
                          <select aria-label={`Mover ${item.client_name} de etapa`} className="focus-ring min-w-0 flex-1 rounded-md border border-ink-200 bg-white px-1.5 py-1 text-xs text-ink-700" value={normalizeStage(item.stage)} onChange={(e) => move(item, normalizeStage(e.target.value))}>
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
            <Field label="Cliente"><Input name="client_name" defaultValue={selected.client_name} required /></Field>
            <Field label="Etapa">
              <Select name="stage" value={lossStage} onChange={(e) => setLossStage(normalizeStage(e.target.value))}>{stages.map((s) => <option key={s} value={s}>{labels[s]}</option>)}</Select>
            </Field>
            <Field label="Prioridade"><Select name="priority" defaultValue={selected.priority || "media"}>{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
            <Field label="Responsável pelo fechamento" hint={isAdmin ? undefined : "Somente a administração redistribui leads."}>
              <Select name="closing_user_id" defaultValue={selected.closing_user_id || currentUserId} disabled={!isAdmin}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
            </Field>
            <Field label="Canal">
              <Select name="channel" defaultValue={selected.channel || "whatsapp"}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                {selected.channel && !channelLabel[selected.channel] && <option value={selected.channel}>{selected.channel}</option>}
              </Select>
            </Field>
            <Field label="Valor estimado (R$)"><Input name="estimated_value" type="number" min="0" step="0.01" defaultValue={selected.estimated_value || 0} /></Field>
            <Field label="Probabilidade (%)"><Input name="probability" type="number" min="0" max="100" defaultValue={selected.probability ?? probabilities[normalizeStage(selected.stage)]} /></Field>
            <Field label="Próximo follow-up"><Input name="next_followup_at" type="datetime-local" defaultValue={toDateTimeLocal(selected.next_followup_at)} /></Field>
            <Field label="Próxima ação" className="md:col-span-2"><Input name="next_action" defaultValue={selected.next_action || ""} placeholder="Ex.: enviar proposta revisada" /></Field>
            {lossStage === "perdido" && (
              <Field label="Motivo da perda" className="md:col-span-2"><Textarea name="loss_reason" defaultValue={selected.loss_reason || ""} required /></Field>
            )}
            <div className="md:col-span-2"><FormError message={formError} /></div>
          </form>
        )}
      </Modal>
    </div>
  );
}
