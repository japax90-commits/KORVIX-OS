"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, X } from "lucide-react";

export function CreateClientButton({ currentUserId }: { currentUserId: string }) {
  const [open,setOpen]=useState(false); const [saving,setSaving]=useState(false); const [error,setError]=useState("");
  async function submit(formData: FormData) {
    setSaving(true); setError("");
    const company=String(formData.get("company_name")||"").trim(); const contact=String(formData.get("contact_name")||"").trim();
    if(!company||!contact){setError("Informe empresa e contato.");setSaving(false);return;}
    const {error:e}=await createClient().from("clients").insert({company_name:company,contact_name:contact,phone:String(formData.get("phone")||"").trim(),niche:String(formData.get("niche")||"").trim(),origin_owner_id:currentUserId,account_manager_id:currentUserId,operational_status:String(formData.get("operational_status")||"onboarding"),entry_date:new Date().toISOString().slice(0,10)});
    if(e){setError(e.message);setSaving(false);return;} window.location.reload();
  }
  return <><button onClick={()=>setOpen(true)} className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800"><Plus size={16}/> Novo cliente</button>
  {open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form action={submit} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl">
    <div className="flex justify-between"><div><h3 className="text-lg font-semibold">Novo cliente</h3><p className="text-sm text-ink-500">Cadastre o cliente diretamente no banco.</p></div><button type="button" onClick={()=>setOpen(false)}><X/></button></div>
    <input name="company_name" required placeholder="Empresa" className="w-full rounded-lg border p-2.5"/><input name="contact_name" required placeholder="Nome do contato" className="w-full rounded-lg border p-2.5"/><input name="phone" placeholder="Telefone" className="w-full rounded-lg border p-2.5"/><input name="niche" placeholder="Nicho" className="w-full rounded-lg border p-2.5"/>
    <select name="operational_status" className="w-full rounded-lg border p-2.5"><option value="onboarding">Onboarding</option><option value="operacao">Operação</option><option value="renovacao">Renovação</option><option value="pausado">Pausado</option></select>
    {error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2">Cancelar</button><button disabled={saving} className="rounded-lg bg-korvix-900 px-4 py-2 text-white">{saving?"Salvando...":"Criar cliente"}</button></div>
  </form></div>}</>;
}
