"use client";

import { useState } from "react";
import { CheckCircle2, Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { todayISO } from "@/lib/format";
import { KORVIX_PLAN_PRICES } from "@/lib/finance/calculations";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { PlanShortcuts } from "@/components/operations/PlanShortcuts";
import { PAYMENT_TYPES, PAYMENT_METHODS, PAYMENT_STATUSES } from "@/lib/options";

type Client = { id: string; company_name: string };
export type PaymentRecord = { id: string; amount: number; type: string; method: string; status: string; due_date: string; paid_at: string | null };

export function CreatePaymentButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(KORVIX_PLAN_PRICES.Essencial));
  const { run, busy, error, setError } = useAction();

  async function submit(fd: FormData) {
    const clientId = String(fd.get("client_id") || "");
    const value = Number(amount || 0);
    if (!clientId) return setError("Selecione o cliente.");
    if (!Number.isFinite(value) || value <= 0) return setError("Informe um valor maior que zero.");
    const client = clients.find((c) => c.id === clientId);
    await run(
      async () =>
        createClient().from("payments").insert({
          client_id: clientId,
          client_name: client?.company_name ?? "",
          amount: value,
          type: String(fd.get("type") || "avulso"),
          method: String(fd.get("method") || "pix"),
          status: "pendente",
          due_date: String(fd.get("due_date") || todayISO()),
        }),
      { onSuccess: () => setOpen(false) },
    );
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Registrar pagamento</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar pagamento"
        description="Entra como pendente. Ao confirmar, caixa e comissões são gerados automaticamente."
        footer={<><button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form="payment-form" disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button></>}
      >
        <form id="payment-form" action={submit} className="space-y-4">
          {clients.length === 0 && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Cadastre um cliente antes de registrar pagamentos.</p>}
          <Field label="Cliente">
            <Select name="client_id" required defaultValue="">
              <option value="" disabled>Selecione o cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </Select>
          </Field>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Valor cobrado</span>
            <PlanShortcuts value={amount} onChange={setAmount} />
            <Input aria-label="Valor" value={amount} onChange={(e) => setAmount(e.target.value)} type="number" min="0.01" step="0.01" required className="mt-2" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo"><Select name="type" defaultValue="avulso">{PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
            <Field label="Método"><Select name="method" defaultValue="pix">{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          </div>
          <Field label="Vencimento"><Input name="due_date" type="date" defaultValue={todayISO()} required /></Field>
          <FormError message={error} />
        </form>
      </Modal>
    </>
  );
}

export function ConfirmPaymentButton({ id }: { id: string }) {
  const { run, busy, error } = useAction();
  async function confirm() {
    if (!window.confirm("Confirmar este pagamento como pago? O caixa e as comissões serão gerados.")) return;
    await run(async () => createClient().rpc("confirm_payment_and_sync_finance", { p_payment_id: id }));
  }
  return (
    <span className="inline-flex items-center gap-2">
      <button disabled={busy} onClick={confirm} className="focus-ring inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-60">
        <CheckCircle2 size={14} /> {busy ? "Confirmando..." : "Confirmar"}
      </button>
      {error && <span role="alert" className="max-w-[220px] whitespace-normal text-xs text-danger">{error}</span>}
    </span>
  );
}

export function PaymentEditButton({ payment, canDelete = false }: { payment: PaymentRecord; canDelete?: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, busy, error, setError } = useAction();
  const del = useAction();

  async function save(fd: FormData) {
    const amount = Number(fd.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0) return setError("Informe um valor maior que zero.");
    await run(
      async () =>
        createClient().rpc("update_payment_and_sync_finance", {
          p_payment_id: payment.id,
          p_amount: amount,
          p_type: String(fd.get("type")),
          p_method: String(fd.get("method")),
          p_status: String(fd.get("status")),
          p_due_date: String(fd.get("due_date")),
          p_paid_at: payment.paid_at,
        }),
      { onSuccess: () => setOpen(false) },
    );
  }

  async function remove() {
    if (!window.confirm("Excluir este pagamento? As comissões e os lançamentos de caixa vinculados também serão removidos.")) return;
    await del.run(async () => createClient().rpc("delete_payment_and_sync_finance", { p_payment_id: payment.id }));
  }

  return (
    <span className="inline-flex items-center gap-1">
      <IconButton label="Editar pagamento" onClick={() => setOpen(true)}><Pencil size={15} /></IconButton>
      {canDelete && <IconButton label="Excluir pagamento" tone="danger" disabled={del.busy} onClick={remove}><Trash2 size={15} /></IconButton>}
      {del.error && <span role="alert" className="max-w-[220px] whitespace-normal text-xs text-danger">{del.error}</span>}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Editar pagamento"
        description="Alterar o status recalcula caixa e comissões deste pagamento."
        size="sm"
        footer={<><button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`payment-${payment.id}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button></>}
      >
        <form id={`payment-${payment.id}`} action={save} className="space-y-4">
          <Field label="Valor (R$)"><Input name="amount" type="number" step="0.01" min="0.01" defaultValue={payment.amount} required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo"><Select name="type" defaultValue={payment.type}>{PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
            <Field label="Método"><Select name="method" defaultValue={payment.method}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Status"><Select name="status" defaultValue={payment.status}>{PAYMENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
            <Field label="Vencimento"><Input name="due_date" type="date" defaultValue={payment.due_date} required /></Field>
          </div>
          <FormError message={error} />
        </form>
      </Modal>
    </span>
  );
}
