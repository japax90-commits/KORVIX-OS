"use client";

import { useState } from "react";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { todayISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";

export type CashMovementRecord = { id: string; category: string; direction: string; amount: number; description: string; movement_date: string; source_type: string | null };

// Os valores existentes (minúsculos) foram mantidos para compatibilidade com
// lançamentos antigos; "Impostos" e "Pró-labore" alimentam indicadores próprios.
export const CASH_CATEGORIES = [
  { value: "reserva", label: "Reserva" },
  { value: "marketing", label: "Marketing" },
  { value: "comercial", label: "Comercial" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "contratacao", label: "Contratação" },
  { value: "expansao", label: "Expansão" },
  { value: "Impostos", label: "Impostos" },
  { value: "Pró-labore", label: "Pró-labore" },
  { value: "outros", label: "Outros" },
];

function CashModal({ open, onClose, userId, movement }: { open: boolean; onClose: () => void; userId?: string; movement?: CashMovementRecord }) {
  const { run, busy, error, setError } = useAction();
  async function submit(fd: FormData) {
    const amount = Number(fd.get("amount") || 0);
    const description = String(fd.get("description") || "").trim();
    if (!Number.isFinite(amount) || amount <= 0) return setError("Informe um valor maior que zero.");
    if (!description) return setError("Informe a descrição.");
    const payload = {
      category: String(fd.get("category") || "outros"),
      direction: String(fd.get("direction") || "entrada"),
      amount,
      description,
      movement_date: String(fd.get("movement_date") || todayISO()),
    };
    const supabase = createClient();
    await run(async () => (movement ? supabase.from("cash_movements").update(payload).eq("id", movement.id) : supabase.from("cash_movements").insert({ ...payload, created_by: userId })), { onSuccess: onClose });
  }
  const categories = movement && !CASH_CATEGORIES.some((c) => c.value === movement.category) ? [...CASH_CATEGORIES, { value: movement.category, label: movement.category }] : CASH_CATEGORIES;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={movement ? "Editar movimento" : "Lançar movimento de caixa"}
      description="Entradas e saídas manuais. Receitas de pagamentos e comissões são lançadas automaticamente."
      size="sm"
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`cash-${movement?.id ?? "new"}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button></>}
    >
      <form id={`cash-${movement?.id ?? "new"}`} action={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo"><Select name="direction" defaultValue={movement?.direction ?? "entrada"}><option value="entrada">Entrada</option><option value="saida">Saída</option></Select></Field>
          <Field label="Categoria"><Select name="category" defaultValue={movement?.category ?? "outros"}>{categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
        </div>
        <Field label="Valor (R$)"><Input name="amount" type="number" min="0.01" step="0.01" defaultValue={movement?.amount} required /></Field>
        <Field label="Descrição"><Input name="description" defaultValue={movement?.description} required /></Field>
        <Field label="Data"><Input name="movement_date" type="date" defaultValue={movement?.movement_date ?? todayISO()} required /></Field>
        <FormError message={error} />
      </form>
    </Modal>
  );
}

export function CreateCashMovementButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Lançar movimento</button>
      {open && <CashModal open onClose={() => setOpen(false)} userId={userId} />}
    </>
  );
}

export function CashMovementActions({ movement, canDelete = false }: { movement: CashMovementRecord; canDelete?: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, busy, error } = useAction();
  // Lançamentos gerados por pagamentos/comissões são mantidos pelas RPCs financeiras;
  // editá-los aqui deixaria caixa e pagamento divergentes.
  if (movement.source_type) {
    return <span title="Lançamento automático: edite o pagamento de origem" className="inline-flex h-8 w-8 items-center justify-center text-ink-400"><Lock size={14} /></span>;
  }
  async function remove() {
    if (!window.confirm("Excluir este movimento de caixa?")) return;
    await run(async () => createClient().from("cash_movements").delete().eq("id", movement.id));
  }
  return (
    <span className="inline-flex items-center gap-1">
      <IconButton label="Editar movimento" onClick={() => setOpen(true)}><Pencil size={15} /></IconButton>
      {canDelete && <IconButton label="Excluir movimento" tone="danger" disabled={busy} onClick={remove}><Trash2 size={15} /></IconButton>}
      {error && <span role="alert" className="max-w-[200px] text-xs text-danger">{error}</span>}
      {open && <CashModal open onClose={() => setOpen(false)} movement={movement} />}
    </span>
  );
}
