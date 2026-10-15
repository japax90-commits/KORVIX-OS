"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { onSubmitForm, useAction } from "@/lib/hooks/useAction";
import { todayISO } from "@/lib/format";
import { KORVIX_PLAN_PRICES } from "@/lib/finance/calculations";
import type { OpportunityChannel } from "@/lib/types";
import { Modal } from "@/components/ui/Modal";
import { Field, FormError, Input, Select, buttonClass } from "@/components/ui/Form";
import { PlanShortcuts } from "@/components/operations/PlanShortcuts";
import { CHANNELS, PRIORITIES } from "@/lib/options";

type User = { id: string; name: string };

export function NewOpportunityButton({ currentUserId, users, isAdmin = false }: { currentUserId: string; users: User[]; isAdmin?: boolean }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(String(KORVIX_PLAN_PRICES.Essencial));
  const { run, busy, error, fieldErrors, fail } = useAction();

  async function submit(formData: FormData) {
    const clientName = String(formData.get("client_name") ?? "").trim();
    const estimatedValue = Number(value || 0);
    if (!clientName) return fail({ client_name: "Informe o nome do cliente." });
    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) return fail({ estimated_value: "Informe um valor válido." });
    // Sem permissão de administrador, o lead sempre pertence a quem o cria (RLS).
    const ownerId = isAdmin ? String(formData.get("origin_owner_id") || currentUserId) : currentUserId;
    const now = new Date().toISOString();
    const ok = await run(async () =>
      createClient().from("opportunities").insert({
        client_name: clientName,
        origin_owner_id: ownerId,
        closing_user_id: ownerId,
        channel: String(formData.get("channel") || "whatsapp"),
        stage: "lead",
        priority: String(formData.get("priority") || "media"),
        estimated_value: estimatedValue,
        probability: 10,
        entry_date: todayISO(),
        last_interaction_at: now,
      }),
    );
    if (ok) setOpen(false);
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass("primary")}><Plus size={16} /> Nova oportunidade</button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Nova oportunidade"
        description="Cadastre um lead no funil."
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className={buttonClass("secondary")}>Cancelar</button>
            <button type="submit" form="new-opportunity" disabled={busy} className={buttonClass("primary")}>{busy ? "Salvando..." : "Criar oportunidade"}</button>
          </>
        }
      >
        <form id="new-opportunity" onSubmit={onSubmitForm(submit)} className="space-y-4">
          <Field label="Cliente" error={fieldErrors.client_name}><Input name="client_name" required placeholder="Nome do cliente ou empresa" autoFocus /></Field>
          {isAdmin && (
            <Field label="Responsável" error={fieldErrors.origin_owner_id}>
              <Select name="origin_owner_id" defaultValue={currentUserId}>{users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
            </Field>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Canal" error={fieldErrors.channel}><Select name="channel" defaultValue="whatsapp">{CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select></Field>
            <Field label="Prioridade" error={fieldErrors.priority}><Select name="priority" defaultValue="media">{PRIORITIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}</Select></Field>
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium text-ink-700">Plano / valor estimado</span>
            <PlanShortcuts value={value} onChange={setValue} />
            <Input aria-label="Valor estimado" name="estimated_value" value={value} onChange={(e) => setValue(e.target.value)} type="number" min="0" step="0.01" className="mt-2" aria-invalid={Boolean(fieldErrors.estimated_value)} />
            {fieldErrors.estimated_value && <span role="alert" className="mt-1 block text-xs font-medium text-danger">{fieldErrors.estimated_value}</span>}
          </div>
          <FormError message={error} />
        </form>
      </Modal>
    </>
  );
}
