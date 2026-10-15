"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, IconButton, Input, Select, buttonClass } from "@/components/ui/Form";
import { REFERRAL_STATUSES } from "@/lib/options";

export function CreateReferralButton({ userName }: { userName: string }) {
  const [open, setOpen] = useState(false);
  const { run, busy, error, setError } = useAction();
  async function submit(fd: FormData) {
    const client = String(fd.get("client_name") || "").trim();
    const referrer = String(fd.get("referrer_name") || "").trim();
    const type = String(fd.get("commission_type") || "fixo");
    const value = Number(fd.get("commission_value") || 0);
    if (!client || !referrer) return setError("Informe cliente e indicador.");
    if (!Number.isFinite(value) || value <= 0) return setError("Informe um valor maior que zero.");
    if (type === "percentual" && value > 100) return setError("O percentual não pode passar de 100%.");
    await run(
      async () => createClient().from("referral_commissions").insert({ client_name: client, referrer_name: referrer, commission_type: type, commission_value: value, status: "pendente", negotiated_by: userName }),
      { onSuccess: () => setOpen(false) },
    );
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Registrar indicação</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Registrar indicação"
        description={`Negociada por ${userName}.`}
        size="sm"
        footer={<><button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>Cancelar</button><button type="submit" form="referral-form" disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Salvar indicação"}</button></>}
      >
        <form id="referral-form" action={submit} className="space-y-4">
          <Field label="Cliente indicado"><Input name="client_name" required /></Field>
          <Field label="Indicador"><Input name="referrer_name" required /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Tipo"><Select name="commission_type" defaultValue="fixo"><option value="fixo">Valor fixo (R$)</option><option value="percentual">Percentual (%)</option></Select></Field>
            <Field label="Valor"><Input name="commission_value" type="number" min="0.01" step="0.01" required /></Field>
          </div>
          <FormError message={error} />
        </form>
      </Modal>
    </>
  );
}

export function ReferralActions({ id, status, canDelete = false }: { id: string; status: string; canDelete?: boolean }) {
  const { run, busy, error } = useAction();
  return (
    <span className="inline-flex items-center gap-1">
      <select
        aria-label="Status da indicação"
        value={status}
        disabled={busy}
        onChange={(e) => run(async () => createClient().from("referral_commissions").update({ status: e.target.value }).eq("id", id))}
        className="focus-ring rounded-md border border-ink-200 bg-white px-2 py-1 text-xs text-ink-700"
      >
        {REFERRAL_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        {!REFERRAL_STATUSES.some((s) => s.value === status) && <option value={status}>{status}</option>}
      </select>
      {canDelete && (
        <IconButton label="Excluir indicação" tone="danger" disabled={busy} onClick={() => window.confirm("Excluir esta indicação?") && run(async () => createClient().from("referral_commissions").delete().eq("id", id))}>
          <Trash2 size={14} />
        </IconButton>
      )}
      {error && <span role="alert" className="max-w-[200px] whitespace-normal text-xs text-danger">{error}</span>}
    </span>
  );
}
