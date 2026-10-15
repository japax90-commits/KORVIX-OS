"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { todayISO } from "@/lib/format";
import { KORVIX_PLANS, type KorvixPlanName } from "@/lib/business/plans";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { FREQUENCIES, CONTRACT_STATUSES } from "@/lib/options";

export type ContractRecord = { id: string; client_name: string; plan_name: string; value: number; frequency: string; status: string; start_date: string; next_billing_date: string | null };
type Client = { id: string; company_name: string };

const plans = Object.values(KORVIX_PLANS);

function ContractModal({ open, onClose, clients, contract }: { open: boolean; onClose: () => void; clients: Client[]; contract?: ContractRecord }) {
  const { run, busy, error, setError } = useAction();
  const [value, setValue] = useState(String(contract?.value ?? KORVIX_PLANS.Essencial.price));

  async function save(fd: FormData) {
    const clientName = String(fd.get("client_name") || "");
    const amount = Number(value);
    const startDate = String(fd.get("start_date") || "");
    if (!clientName) return setError("Selecione o cliente.");
    if (!Number.isFinite(amount) || amount <= 0) return setError("Informe um valor maior que zero.");
    if (!startDate) return setError("Informe a data de início.");
    const data = {
      client_name: clientName,
      plan_name: String(fd.get("plan_name")),
      value: amount,
      frequency: String(fd.get("frequency")),
      status: String(fd.get("status")),
      start_date: startDate,
      next_billing_date: String(fd.get("next_billing_date") || "") || startDate,
    };
    const supabase = createClient();
    await run(async () => (contract ? supabase.from("contracts").update(data).eq("id", contract.id) : supabase.from("contracts").insert(data)), { onSuccess: onClose });
  }

  // Clientes renomeados/removidos continuam selecionáveis no contrato existente.
  const clientOptions = contract && !clients.some((c) => c.company_name === contract.client_name) ? [...clients, { id: "current", company_name: contract.client_name }] : clients;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={contract ? "Editar contrato" : "Novo contrato"}
      description="O contrato ativo atualiza automaticamente o plano e o valor exibidos na ficha do cliente."
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form={`contract-${contract?.id ?? "new"}`} disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar"}</button></>}
    >
      <form id={`contract-${contract?.id ?? "new"}`} action={save} className="grid gap-4 sm:grid-cols-2">
        <Field label="Cliente" className="sm:col-span-2">
          <Select name="client_name" defaultValue={contract?.client_name || ""} required>
            <option value="" disabled>Selecione o cliente</option>
            {clientOptions.map((c) => <option key={c.id} value={c.company_name}>{c.company_name}</option>)}
          </Select>
        </Field>
        <Field label="Plano">
          <Select name="plan_name" defaultValue={contract?.plan_name || "Essencial"} onChange={(e) => { const plan = KORVIX_PLANS[e.target.value as KorvixPlanName]; if (plan) setValue(String(plan.price)); }} required>
            {plans.map((plan) => <option key={plan.name} value={plan.name}>{plan.name} — R$ {plan.price.toLocaleString("pt-BR")}/mês</option>)}
            {contract && !plans.some((p) => p.name === contract.plan_name) && <option value={contract.plan_name}>{contract.plan_name}</option>}
          </Select>
        </Field>
        <Field label="Valor (R$)" hint="Pode ser ajustado para contrato personalizado."><Input value={value} onChange={(e) => setValue(e.target.value)} type="number" step="0.01" min="0.01" required /></Field>
        <Field label="Frequência"><Select name="frequency" defaultValue={contract?.frequency || "mensal"}>{FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</Select></Field>
        <Field label="Status"><Select name="status" defaultValue={contract?.status || "ativo"}>{CONTRACT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</Select></Field>
        <Field label="Início"><Input name="start_date" type="date" defaultValue={contract?.start_date || todayISO()} required /></Field>
        <Field label="Próxima cobrança"><Input name="next_billing_date" type="date" defaultValue={contract?.next_billing_date || todayISO()} /></Field>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  );
}

export function CreateContractButton({ clients }: { clients: Client[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Novo contrato</button>
      {open && <ContractModal open onClose={() => setOpen(false)} clients={clients} />}
    </>
  );
}

export function ContractRowActions({ clients, contract, canDelete = false }: { clients: Client[]; contract: ContractRecord; canDelete?: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, busy, error } = useAction();
  async function remove() {
    if (!window.confirm(`Excluir o contrato de ${contract.client_name}? Pagamentos históricos não serão apagados.`)) return;
    await run(async () => createClient().from("contracts").delete().eq("id", contract.id));
  }
  return (
    <span className="inline-flex items-center gap-1">
      <IconButton label="Editar contrato" onClick={() => setOpen(true)}><Pencil size={15} /></IconButton>
      {canDelete && <IconButton label="Excluir contrato" tone="danger" disabled={busy} onClick={remove}><Trash2 size={15} /></IconButton>}
      {error && <span role="alert" className="max-w-[200px] text-xs text-danger">{error}</span>}
      {open && <ContractModal open onClose={() => setOpen(false)} clients={clients} contract={contract} />}
    </span>
  );
}
