"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, ChevronLeft, ChevronRight, ClipboardList, Pencil, Plus, Trash2, Users2, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { onSubmitForm, useAction } from "@/lib/hooks/useAction";
import { dayKey, formatDate, formatTime, fromDateTimeLocal, toDateTimeLocal, todayISO } from "@/lib/format";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { cn } from "@/lib/utils";

export type AgendaEvent = { id: string; title: string; type: string; start_at: string; end_at: string | null; responsible_name: string; responsible_user_id: string | null; status: string; related_to: string | null };
type User = { id: string; name: string };

const TYPES = [
  { value: "reuniao", label: "Reunião", icon: Users2 },
  { value: "visita", label: "Visita", icon: Calendar },
  { value: "gravacao", label: "Gravação", icon: Video },
  { value: "tarefa", label: "Tarefa", icon: ClipboardList },
  { value: "compromisso_interno", label: "Compromisso interno", icon: Calendar },
];
const STATUSES = [
  { value: "agendado", label: "Agendado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "realizado", label: "Realizado" },
  { value: "cancelado", label: "Cancelado" },
];
const SHARED = "__shared__";

function EventModal({ open, onClose, event, userId, userName, users, isAdmin }: { open: boolean; onClose: () => void; event?: AgendaEvent; userId: string; userName: string; users: User[]; isAdmin: boolean }) {
  const { run, busy, error, fieldErrors, fail } = useAction();

  async function submit(fd: FormData) {
    const title = String(fd.get("title") || "").trim();
    const startAt = fromDateTimeLocal(String(fd.get("start_at") || ""));
    const endAt = fromDateTimeLocal(String(fd.get("end_at") || ""));
    const errors: Record<string, string> = {};
    if (!title) errors.title = "Informe o título.";
    if (!startAt) errors.start_at = "Informe o início.";
    else if (endAt && endAt < startAt) errors.end_at = "O término deve ser depois do início.";
    if (Object.keys(errors).length) return fail(errors);
    const responsible = String(fd.get("responsible_user_id") || userId);
    const shared = responsible === SHARED;
    // Não-admins só criam eventos próprios ou compartilhados (regra do RLS).
    const responsibleId = shared ? null : isAdmin ? responsible : userId;
    const payload = {
      title,
      type: String(fd.get("type") || "reuniao"),
      start_at: startAt,
      end_at: endAt,
      responsible_user_id: responsibleId,
      responsible_name: shared ? "Equipe" : users.find((u) => u.id === responsibleId)?.name ?? userName,
      status: String(fd.get("status") || "agendado"),
      related_to: String(fd.get("related_to") || "").trim() || null,
    };
    const supabase = createClient();
    await run(async () => (event ? supabase.from("agenda_events").update(payload).eq("id", event.id) : supabase.from("agenda_events").insert({ ...payload, created_by: userId })), { onSuccess: onClose });
  }

  const defaultResponsible = event ? event.responsible_user_id ?? SHARED : userId;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={event ? "Editar evento" : "Novo evento"}
      description="Eventos compartilhados aparecem para toda a equipe."
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`event-${event?.id ?? "new"}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : event ? "Salvar" : "Criar evento"}</button></>}
    >
      <form id={`event-${event?.id ?? "new"}`} onSubmit={onSubmitForm(submit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" className="sm:col-span-2" error={fieldErrors.title}><Input name="title" defaultValue={event?.title} required autoFocus /></Field>
        <Field label="Tipo" error={fieldErrors.type}><Select name="type" defaultValue={event?.type ?? "reuniao"}>{TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <Field label="Status" error={fieldErrors.status}><Select name="status" defaultValue={event?.status ?? "agendado"}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <Field label="Início" error={fieldErrors.start_at}><Input name="start_at" type="datetime-local" defaultValue={toDateTimeLocal(event?.start_at)} required /></Field>
        <Field label="Término (opcional)" error={fieldErrors.end_at}><Input name="end_at" type="datetime-local" defaultValue={toDateTimeLocal(event?.end_at)} /></Field>
        <Field label="Responsável" error={fieldErrors.responsible_user_id}>
          <Select name="responsible_user_id" defaultValue={defaultResponsible}>
            {(isAdmin ? users : users.filter((u) => u.id === userId)).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            {!isAdmin && !users.some((u) => u.id === userId) && <option value={userId}>{userName}</option>}
            <option value={SHARED}>Compartilhado com a equipe</option>
          </Select>
        </Field>
        <Field label="Relacionado a (opcional)" hint="Use o nome do cliente para aparecer na ficha dele." error={fieldErrors.related_to}><Input name="related_to" defaultValue={event?.related_to ?? ""} /></Field>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  );
}

export function CreateAgendaButton(props: { userId: string; userName: string; users: User[]; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Novo evento</button>
      {open && <EventModal open onClose={() => setOpen(false)} {...props} />}
    </>
  );
}

type View = "Dia" | "Semana" | "Mês";

function addDays(key: string, days: number) {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function startOfWeek(key: string) {
  const day = new Date(`${key}T12:00:00Z`).getUTCDay();
  return addDays(key, day === 0 ? -6 : 1 - day);
}
function addMonths(key: string, months: number) {
  const d = new Date(`${key.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function AgendaView({ events, userId, userName, users, isAdmin }: { events: AgendaEvent[]; userId: string; userName: string; users: User[]; isAdmin: boolean }) {
  const [view, setView] = useState<View>("Semana");
  const [anchor, setAnchor] = useState(todayISO);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [items, setItems] = useState(events);
  const { run, error } = useAction();
  useEffect(() => setItems(events), [events]);

  const range = useMemo(() => {
    if (view === "Dia") return { from: anchor, to: anchor, label: formatDate(anchor, { weekday: "long", day: "2-digit", month: "long", year: "numeric" }) };
    if (view === "Semana") {
      const from = startOfWeek(anchor);
      const to = addDays(from, 6);
      return { from, to, label: `${formatDate(from, { day: "2-digit", month: "short" })} – ${formatDate(to, { day: "2-digit", month: "short", year: "numeric" })}` };
    }
    const from = `${anchor.slice(0, 7)}-01`;
    const to = addDays(addMonths(from, 1), -1);
    return { from, to, label: formatDate(from, { month: "long", year: "numeric" }) };
  }, [view, anchor]);

  const grouped = useMemo(() => {
    const groups: Record<string, AgendaEvent[]> = {};
    for (const e of items) {
      const key = dayKey(e.start_at);
      if (key >= range.from && key <= range.to) (groups[key] ??= []).push(e);
    }
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [items, range]);

  function shift(direction: 1 | -1) {
    setAnchor((a) => (view === "Dia" ? addDays(a, direction) : view === "Semana" ? addDays(a, 7 * direction) : addMonths(a, direction)));
  }

  async function setStatus(e: AgendaEvent, status: string) {
    setItems((list) => list.map((i) => (i.id === e.id ? { ...i, status } : i)));
    await run(async () => createClient().from("agenda_events").update({ status }).eq("id", e.id));
  }

  async function remove(e: AgendaEvent) {
    if (!window.confirm(`Excluir o evento "${e.title}"?`)) return;
    await run(async () => createClient().from("agenda_events").delete().eq("id", e.id));
  }

  const today = todayISO();
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-fit gap-1 rounded-lg border border-ink-300 bg-white p-1 text-xs">
          {(["Dia", "Semana", "Mês"] as View[]).map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} aria-pressed={view === v} className={cn("rounded-md px-3 py-1.5 font-medium", view === v ? "bg-korvix-900 text-white" : "text-ink-500 hover:text-ink-900")}>{v}</button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <IconButton label="Período anterior" onClick={() => shift(-1)} className="border border-ink-300 bg-white"><ChevronLeft size={16} /></IconButton>
          <button type="button" onClick={() => setAnchor(todayISO())} className={buttonClass("secondary", "px-3 py-1.5 text-xs")}>Hoje</button>
          <IconButton label="Próximo período" onClick={() => shift(1)} className="border border-ink-300 bg-white"><ChevronRight size={16} /></IconButton>
          <span className="ml-1 text-sm font-medium capitalize text-ink-900">{range.label}</span>
        </div>
      </div>
      <FormError message={error} />
      {grouped.map(([day, list]) => (
        <Card key={day}>
          <CardHeader title={`${formatDate(day, { weekday: "long", day: "2-digit", month: "long" })}${day === today ? " · hoje" : ""}`} />
          <CardBody className="!p-0">
            <ul className="divide-y divide-ink-100">
              {list.map((e) => {
                const Icon = TYPES.find((t) => t.value === e.type)?.icon ?? Calendar;
                return (
                  <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap sm:gap-4">
                    <div className="w-12 shrink-0 text-xs tabular-nums text-ink-500">{formatTime(e.start_at)}{e.end_at ? <span className="block text-ink-400">{formatTime(e.end_at)}</span> : null}</div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-korvix-50 text-korvix-600"><Icon size={15} /></div>
                    <div className="min-w-0 flex-1">
                      <p className={cn("truncate text-sm font-medium text-ink-900", e.status === "cancelado" && "line-through opacity-60")}>{e.title}</p>
                      <p className="truncate text-xs text-ink-500">{TYPES.find((t) => t.value === e.type)?.label ?? e.type} · {e.responsible_name}{e.related_to ? ` · ${e.related_to}` : ""}</p>
                    </div>
                    <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
                      <select aria-label={`Status de ${e.title}`} value={e.status} onChange={(ev) => setStatus(e, ev.target.value)} className="focus-ring rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700">
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        {!STATUSES.some((s) => s.value === e.status) && <option value={e.status}>{e.status}</option>}
                      </select>
                      <IconButton label="Editar evento" onClick={() => setEditing(e)}><Pencil size={14} /></IconButton>
                      <IconButton label="Excluir evento" tone="danger" onClick={() => remove(e)}><Trash2 size={14} /></IconButton>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      ))}
      {grouped.length === 0 && (
        <Card><CardBody><p className="py-6 text-center text-sm text-ink-500">Nenhum evento neste período.</p></CardBody></Card>
      )}
      {editing && <EventModal open onClose={() => setEditing(null)} event={editing} userId={userId} userName={userName} users={users} isAdmin={isAdmin} />}
    </div>
  );
}
