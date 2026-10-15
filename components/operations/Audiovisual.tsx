"use client";

import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { onSubmitForm, useAction } from "@/lib/hooks/useAction";
import { formatDate, humanize, isPastDay, todayISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { cn } from "@/lib/utils";
import { AV_STAGES } from "@/lib/options";

const DONE = ["FINALIZED", "PUBLISHED", "CANCELLED"];

export type AvDemand = { id: string; client_name: string; demand_type: string; responsible_name: string; responsible_user_id: string | null; status: string; deadline: string; quantity: number };
type User = { id: string; name: string };

function DemandModal({ open, onClose, demand, users, clients, userId, userName }: { open: boolean; onClose: () => void; demand?: AvDemand; users: User[]; clients: string[]; userId: string; userName: string }) {
  const { run, busy, error, fieldErrors, fail } = useAction();
  async function submit(fd: FormData) {
    const client = String(fd.get("client_name") || "").trim();
    const type = String(fd.get("demand_type") || "").trim();
    const quantity = Number(fd.get("quantity") || 1);
    const errors: Record<string, string> = {};
    if (!client) errors.client_name = "Informe o cliente.";
    if (!type) errors.demand_type = "Informe o tipo de conteúdo.";
    if (!Number.isInteger(quantity) || quantity < 1) errors.quantity = "Use um número inteiro maior que zero.";
    if (Object.keys(errors).length) return fail(errors);
    const responsibleId = String(fd.get("responsible_user_id") || userId);
    const payload = {
      client_name: client,
      demand_type: type,
      quantity,
      deadline: String(fd.get("deadline") || todayISO()),
      status: String(fd.get("status") || "DEMAND"),
      responsible_user_id: responsibleId,
      responsible_name: users.find((u) => u.id === responsibleId)?.name ?? userName,
    };
    const supabase = createClient();
    await run(async () => (demand ? supabase.from("av_demands").update(payload).eq("id", demand.id) : supabase.from("av_demands").insert({ ...payload, created_by: userId })), { onSuccess: onClose });
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={demand ? "Editar demanda" : "Nova demanda audiovisual"}
      description="Arquivos pesados ficam fora do KORVIX OS; registre aqui demanda, prazo e etapa."
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`av-${demand?.id ?? "new"}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : demand ? "Salvar" : "Criar demanda"}</button></>}
    >
      <form id={`av-${demand?.id ?? "new"}`} onSubmit={onSubmitForm(submit)} className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" className="sm:col-span-2" error={fieldErrors.client_name}>
          <Input name="client_name" list="av-clients" defaultValue={demand?.client_name} required />
          <datalist id="av-clients">{clients.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        <Field label="Tipo de conteúdo" className="sm:col-span-2" error={fieldErrors.demand_type}><Input name="demand_type" defaultValue={demand?.demand_type ?? ""} placeholder="Ex.: Reels, fotos de produto, vídeo institucional" required /></Field>
        <Field label="Quantidade" error={fieldErrors.quantity}><Input name="quantity" type="number" min="1" step="1" defaultValue={demand?.quantity ?? 1} /></Field>
        <Field label="Prazo" error={fieldErrors.deadline}><Input name="deadline" type="date" defaultValue={demand?.deadline ?? todayISO()} required /></Field>
        <Field label="Responsável" error={fieldErrors.responsible_user_id}>
          <Select name="responsible_user_id" defaultValue={demand?.responsible_user_id ?? userId}>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            {!users.some((u) => u.id === userId) && <option value={userId}>{userName}</option>}
          </Select>
        </Field>
        <Field label="Etapa" error={fieldErrors.status}><Select name="status" defaultValue={demand?.status ?? "DEMAND"}>{AV_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  );
}

type Shared = { users: User[]; clients: string[]; userId: string; userName: string };

export function CreateAvDemandButton(props: Shared) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Nova demanda</button>
      {open && <DemandModal open onClose={() => setOpen(false)} {...props} />}
    </>
  );
}

export function AvBoard({ demands, ...shared }: Shared & { demands: AvDemand[] }) {
  const [items, setItems] = useState(demands);
  const [editing, setEditing] = useState<AvDemand | null>(null);
  const { run, error } = useAction();
  useEffect(() => setItems(demands), [demands]);

  async function move(d: AvDemand, status: string) {
    setItems((list) => list.map((i) => (i.id === d.id ? { ...i, status } : i)));
    await run(async () => createClient().from("av_demands").update({ status }).eq("id", d.id));
  }
  async function remove(d: AvDemand) {
    if (!window.confirm(`Excluir a demanda de ${d.client_name}?`)) return;
    await run(async () => createClient().from("av_demands").delete().eq("id", d.id));
  }

  return (
    <div className="space-y-3">
      <FormError message={error} />
      <div className="-mx-4 overflow-x-auto px-4 pb-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <div className="flex gap-3">
          {AV_STAGES.map((stage) => {
            const list = items.filter((x) => x.status === stage.value);
            return (
              <section key={stage.value} className="w-[220px] shrink-0 rounded-xl border border-ink-200 bg-ink-50 p-2.5">
                <div className="mb-2 flex items-center justify-between px-1">
                  <h3 className="text-[12.5px] font-semibold text-ink-900">{stage.label}</h3>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-ink-600 ring-1 ring-ink-200">{list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.map((d) => {
                    const late = !DONE.includes(d.status) && isPastDay(d.deadline);
                    return (
                      <article key={d.id} className="rounded-lg border border-ink-200 bg-white p-3 shadow-sm">
                        <div className="flex items-start justify-between gap-1">
                          <button type="button" onClick={() => setEditing(d)} className="min-w-0 text-left">
                            <p className="truncate text-[13px] font-medium text-ink-900">{d.client_name}</p>
                            <p className="mt-0.5 truncate text-[11px] text-ink-500">{humanize(d.demand_type)} · {d.quantity}x</p>
                          </button>
                          <div className="-mr-1 -mt-1 flex">
                            <IconButton label="Editar demanda" onClick={() => setEditing(d)} className="h-7 w-7"><Pencil size={13} /></IconButton>
                            <IconButton label="Excluir demanda" tone="danger" onClick={() => remove(d)} className="h-7 w-7"><Trash2 size={13} /></IconButton>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 text-[11px]">
                          <span className="truncate text-ink-500">{d.responsible_name}</span>
                          <span className={cn("shrink-0", late ? "font-medium text-danger" : "text-ink-500")}>{formatDate(d.deadline)}</span>
                        </div>
                        <select aria-label={`Mover demanda de ${d.client_name}`} value={d.status} onChange={(e) => move(d, e.target.value)} className="focus-ring mt-2 w-full rounded-md border border-ink-200 bg-white px-1.5 py-1 text-xs text-ink-700">
                          {AV_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </article>
                    );
                  })}
                  {list.length === 0 && <p className="rounded-lg border border-dashed border-ink-300 p-3 text-center text-[11px] text-ink-500">Vazio</p>}
                </div>
              </section>
            );
          })}
        </div>
      </div>
      {editing && <DemandModal open onClose={() => setEditing(null)} demand={editing} {...shared} />}
    </div>
  );
}
