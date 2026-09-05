"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";
import type { OpportunityChannel, OpportunityStage } from "@/lib/types";

type User = { id: string; name: string };

type Props = {
  currentUserId: string;
  users: User[];
};

const channels: { value: OpportunityChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "instagram", label: "Instagram" },
  { value: "trafego_pago", label: "Tráfego pago" },
  { value: "indicacao", label: "Indicação" },
  { value: "parceiro", label: "Parceiro" },
  { value: "visita_presencial", label: "Visita presencial" },
  { value: "outro", label: "Outro" },
];

export function NewOpportunityButton({ currentUserId, users }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(formData: FormData) {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const clientName = String(formData.get("client_name") ?? "").trim();
    const estimatedValue = Number(formData.get("estimated_value") ?? 0);
    const originOwnerId = String(formData.get("origin_owner_id") ?? currentUserId);
    const channel = String(formData.get("channel") ?? "whatsapp") as OpportunityChannel;
    const priority = String(formData.get("priority") ?? "media");

    if (!clientName) {
      setError("Informe o nome do cliente.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("opportunities").insert({
      client_name: clientName,
      origin_owner_id: originOwnerId,
      closing_user_id: currentUserId,
      channel,
      stage: "lead" as OpportunityStage,
      priority,
      estimated_value: Number.isFinite(estimatedValue) ? estimatedValue : 0,
      probability: 10,
      entry_date: new Date().toISOString().slice(0, 10),
      last_interaction_at: new Date().toISOString(),
    });

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }

    window.location.reload();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
        <Plus size={16} />
        Nova oportunidade
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-center justify-between">
              <div><h3 className="text-lg font-semibold text-ink-900">Nova oportunidade</h3><p className="text-sm text-ink-500">Cadastre um lead no funil.</p></div>
              <button onClick={() => setOpen(false)} className="rounded-lg p-2 text-ink-500 hover:bg-ink-50"><X size={18} /></button>
            </div>
            <form action={submit} className="space-y-4">
              <label className="block text-sm font-medium text-ink-700">Cliente<input name="client_name" required className="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm outline-none focus:border-korvix-500" placeholder="Nome do cliente" /></label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ink-700">Responsável<select name="origin_owner_id" defaultValue={currentUserId} className="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm">{users.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label>
                <label className="block text-sm font-medium text-ink-700">Canal<select name="channel" defaultValue="whatsapp" className="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm">{channels.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}</select></label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-ink-700">Valor estimado<input name="estimated_value" type="number" min="0" step="0.01" defaultValue="0" className="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm" /></label>
                <label className="block text-sm font-medium text-ink-700">Prioridade<select name="priority" defaultValue="media" className="mt-1.5 w-full rounded-lg border border-ink-200 px-3 py-2.5 text-sm"><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option><option value="urgente">Urgente</option></select></label>
              </div>
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
              <button disabled={saving} type="submit" className="w-full rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Salvando..." : "Criar oportunidade"}</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
