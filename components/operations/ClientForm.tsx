"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { todayISO } from "@/lib/format";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";

export type ClientRecord = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  niche: string | null;
  operational_status: string;
};

export const CLIENT_STATUSES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "operacao", label: "Em operação" },
  { value: "renovacao", label: "Renovação" },
  { value: "pausado", label: "Pausado" },
];

function ClientModal({ open, onClose, client, currentUserId }: { open: boolean; onClose: () => void; client?: ClientRecord; currentUserId?: string }) {
  const { run, busy, error, setError } = useAction();

  async function submit(formData: FormData) {
    const company = String(formData.get("company_name") || "").trim();
    const contact = String(formData.get("contact_name") || "").trim();
    if (!company || !contact) return setError("Informe empresa e contato.");
    const payload = {
      company_name: company,
      contact_name: contact,
      // Coluna phone é NOT NULL no banco: vazio é salvo como string vazia.
      phone: String(formData.get("phone") || "").trim(),
      niche: String(formData.get("niche") || "").trim() || null,
      operational_status: String(formData.get("operational_status") || "onboarding"),
    };
    const supabase = createClient();
    await run(
      async () =>
        client
          ? supabase.from("clients").update(payload).eq("id", client.id)
          : supabase.from("clients").insert({ ...payload, origin_owner_id: currentUserId, account_manager_id: currentUserId, entry_date: todayISO() }),
      { onSuccess: onClose },
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={client ? "Editar cliente" : "Novo cliente"}
      description={client ? "Atualize os dados da operação." : "O cliente fica disponível para contratos e pagamentos."}
      footer={
        <>
          <button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button>
          <button type="submit" form="client-form" disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : client ? "Salvar" : "Criar cliente"}</button>
        </>
      }
    >
      <form id="client-form" action={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa" className="sm:col-span-2"><Input name="company_name" defaultValue={client?.company_name} required autoFocus /></Field>
        <Field label="Contato"><Input name="contact_name" defaultValue={client?.contact_name} required /></Field>
        <Field label="Telefone"><Input name="phone" type="tel" defaultValue={client?.phone ?? ""} placeholder="(00) 00000-0000" /></Field>
        <Field label="Nicho"><Input name="niche" defaultValue={client?.niche ?? ""} /></Field>
        <Field label="Status operacional">
          <Select name="operational_status" defaultValue={client?.operational_status ?? "onboarding"}>
            {CLIENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
        </Field>
        <div className="sm:col-span-2"><FormError message={error} /></div>
      </form>
    </Modal>
  );
}

export function CreateClientButton({ currentUserId }: { currentUserId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Novo cliente</button>
      <ClientModal open={open} onClose={() => setOpen(false)} currentUserId={currentUserId} />
    </>
  );
}

export function ClientEditButton({ client, canDelete = false }: { client: ClientRecord; canDelete?: boolean }) {
  const [open, setOpen] = useState(false);
  const { run, busy, error } = useAction();

  async function remove() {
    if (!window.confirm(`Excluir o cliente "${client.company_name}"? Esta ação não pode ser desfeita.`)) return;
    await run(async () => createClient().from("clients").delete().eq("id", client.id));
  }

  return (
    <div className="flex items-center gap-1">
      <IconButton label="Editar cliente" onClick={() => setOpen(true)}><Pencil size={15} /></IconButton>
      {canDelete && <IconButton label="Excluir cliente" tone="danger" onClick={remove} disabled={busy}><Trash2 size={15} /></IconButton>}
      {error && <span role="alert" className="max-w-[200px] text-xs text-danger">{error}</span>}
      <ClientModal open={open} onClose={() => setOpen(false)} client={client} />
    </div>
  );
}
