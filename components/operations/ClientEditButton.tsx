"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, X } from "lucide-react";

type Client = {
  id: string;
  company_name: string;
  contact_name: string;
  phone: string | null;
  niche: string | null;
  operational_status: string;
};

export function ClientEditButton({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(formData: FormData) {
    setSaving(true); setError("");
    const company = String(formData.get("company_name") || "").trim();
    const contact = String(formData.get("contact_name") || "").trim();
    if (!company || !contact) { setError("Informe empresa e contato."); setSaving(false); return; }
    const { error: e } = await createClient().from("clients").update({
      company_name: company,
      contact_name: contact,
      phone: String(formData.get("phone") || "").trim() || null,
      niche: String(formData.get("niche") || "").trim() || null,
      operational_status: String(formData.get("operational_status") || "onboarding"),
    }).eq("id", client.id);
    if (e) { setError(e.message); setSaving(false); return; }
    window.location.reload();
  }

  async function remove() {
    if (!window.confirm("Excluir este cliente? Esta ação não pode ser desfeita.")) return;
    setSaving(true); setError("");
    const { error: e } = await createClient().from("clients").delete().eq("id", client.id);
    if (e) { setError(e.message); setSaving(false); return; }
    window.location.reload();
  }

  return <>
    <div className="flex items-center gap-1">
      <button type="button" onClick={() => setOpen(true)} aria-label="Editar cliente" className="rounded-lg p-2 text-ink-500 hover:bg-ink-50 hover:text-ink-900"><Pencil size={15}/></button>
      <button type="button" onClick={remove} disabled={saving} aria-label="Excluir cliente" className="rounded-lg p-2 text-ink-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={15}/></button>
    </div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form action={save} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex justify-between"><div><h3 className="text-lg font-semibold">Editar cliente</h3><p className="text-sm text-ink-500">Atualize os dados da operação.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Fechar"><X/></button></div>
        <input name="company_name" defaultValue={client.company_name} required placeholder="Empresa" className="w-full rounded-lg border p-2.5"/>
        <input name="contact_name" defaultValue={client.contact_name} required placeholder="Nome do contato" className="w-full rounded-lg border p-2.5"/>
        <input name="phone" defaultValue={client.phone || ""} placeholder="Telefone" className="w-full rounded-lg border p-2.5"/>
        <input name="niche" defaultValue={client.niche || ""} placeholder="Nicho" className="w-full rounded-lg border p-2.5"/>
        <select name="operational_status" defaultValue={client.operational_status} className="w-full rounded-lg border p-2.5"><option value="onboarding">Onboarding</option><option value="operacao">Operação</option><option value="renovacao">Renovação</option><option value="pausado">Pausado</option></select>
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border px-4 py-2">Cancelar</button><button disabled={saving} className="rounded-lg bg-korvix-900 px-4 py-2 text-white">{saving ? "Salvando..." : "Salvar"}</button></div>
      </form>
    </div>}
  </>;
}
