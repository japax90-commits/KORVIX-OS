"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { onSubmitForm, useAction } from "@/lib/hooks/useAction";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { useConfirm } from "@/components/ui/Feedback";

export type GoalRecord = { id: string; vendor_id: string | null; vendor_name: string; metric: string; period: string; target: number; achieved: number };
type User = { id: string; name: string };

function GoalModal({ open, onClose, goal, users }: { open: boolean; onClose: () => void; goal?: GoalRecord; users: User[] }) {
  const { run, busy, error, fieldErrors, fail } = useAction();
  async function submit(fd: FormData) {
    const vendorId = String(fd.get("vendor_id") || "");
    const metric = String(fd.get("metric") || "").trim();
    const period = String(fd.get("period") || "").trim();
    const target = Number(fd.get("target"));
    const achieved = Number(fd.get("achieved") || 0);
    const errors: Record<string, string> = {};
    if (!vendorId) errors.vendor_id = "Selecione o vendedor.";
    if (!metric) errors.metric = "Informe a métrica.";
    if (!period) errors.period = "Informe o período.";
    if (!Number.isFinite(target) || target <= 0) errors.target = "A meta deve ser maior que zero.";
    if (!Number.isFinite(achieved) || achieved < 0) errors.achieved = "Informe um valor válido.";
    if (Object.keys(errors).length) return fail(errors);
    const payload = { vendor_id: vendorId, vendor_name: users.find((u) => u.id === vendorId)?.name ?? goal?.vendor_name ?? "", metric, period, target, achieved };
    const supabase = createClient();
    await run(async () => (goal ? supabase.from("goals").update(payload).eq("id", goal.id) : supabase.from("goals").insert(payload)), { onSuccess: onClose, success: goal ? "Meta atualizada." : "Meta criada." });
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={goal ? "Editar meta" : "Nova meta"}
      size="sm"
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`goal-${goal?.id ?? "new"}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button></>}
    >
      <form id={`goal-${goal?.id ?? "new"}`} onSubmit={onSubmitForm(submit)} className="space-y-4">
        <Field label="Vendedor" error={fieldErrors.vendor_id}>
          <Select name="vendor_id" defaultValue={goal?.vendor_id ?? ""} required>
            <option value="" disabled>Selecione</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        </Field>
        <Field label="Métrica" error={fieldErrors.metric}><Input name="metric" defaultValue={goal?.metric ?? "Contratos fechados"} required /></Field>
        <Field label="Período" error={fieldErrors.period}><Input name="period" defaultValue={goal?.period ?? new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" })} required /></Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meta" error={fieldErrors.target}><Input name="target" type="number" min="1" step="any" defaultValue={goal?.target} required /></Field>
          <Field label="Realizado" error={fieldErrors.achieved}><Input name="achieved" type="number" min="0" step="any" defaultValue={goal?.achieved ?? 0} /></Field>
        </div>
        <FormError message={error} />
      </form>
    </Modal>
  );
}

export function CreateGoalButton({ users }: { users: User[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("secondary", undefined, "sm")}><Plus size={14} /> Nova meta</button>
      {open && <GoalModal open onClose={() => setOpen(false)} users={users} />}
    </>
  );
}

export function GoalActions({ goal, users }: { goal: GoalRecord; users: User[] }) {
  const confirmDialog = useConfirm();
  const [open, setOpen] = useState(false);
  const { run, busy, error } = useAction();
  return (
    <span className="inline-flex items-center gap-1">
      <IconButton label="Editar meta" onClick={() => setOpen(true)}><Pencil size={14} /></IconButton>
      <IconButton label="Excluir meta" tone="danger" disabled={busy} onClick={async () => (await confirmDialog({ description: "Excluir esta meta?" })) && run(async () => createClient().from("goals").delete().eq("id", goal.id), { success: "Meta excluída." })}><Trash2 size={14} /></IconButton>
      {error && <span role="alert" className="text-xs text-danger">{error}</span>}
      {open && <GoalModal open onClose={() => setOpen(false)} goal={goal} users={users} />}
    </span>
  );
}
