"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Pencil, Trash2, X } from "lucide-react";

type Client = { id:string; company_name:string; contact_name:string; phone:string|null; niche:string|null; operational_status:string; };

export function ClientActions({client}:{client:Client}) {
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  async function save(fd:FormData){
    setBusy(true);setError("");
    const company=String(fd.get("company_name")||"").trim(),contact=String(fd.get("contact_name")||"").trim();
    if(!company||!contact){setError("Informe empresa e contato.");setBusy(false);return;}
    const {error:e}=await createClient().from("clients").update({company_name:company,contact_name:contact,phone:String(fd.get("phone")||"").trim()||null,niche:String(fd.get("niche")||"").trim()||null,operational_status:String(fd.get("operational_status")||"onboarding")}).eq("id",client.id);
    if(e)setError(e.message);else location.reload();setBusy(false);
  }
  async function remove(){
    if(!confirm("Excluir este cliente? Só será permitido se não houver dados vinculados."))return;
    setBusy(true);const {error:e}=await createClient().from("clients").delete().eq("id",client.id);
    if(e)alert(e.message);else location.reload();setBusy(false);
  }
  return <div className="flex items-center gap-3"><button disabled={busy} onClick={()=>setOpen(true)} title="Editar cliente" className="text-ink-500 hover:text-korvix-700"><Pencil size={15}/></button><button disabled={busy} onClick={remove} title="Excluir cliente" className="text-danger hover:opacity-80"><Trash2 size={15}/></button>{open&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><form action={save} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between"><h3 className="text-lg font-semibold">Editar cliente</h3><button type="button" onClick={()=>setOpen(false)}><X/></button></div><input name="company_name" required defaultValue={client.company_name} placeholder="Empresa" className="w-full rounded-lg border p-2.5"/><input name="contact_name" required defaultValue={client.contact_name} placeholder="Nome do contato" className="w-full rounded-lg border p-2.5"/><input name="phone" defaultValue={client.phone||""} placeholder="Telefone" className="w-full rounded-lg border p-2.5"/><input name="niche" defaultValue={client.niche||""} placeholder="Nicho" className="w-full rounded-lg border p-2.5"/><select name="operational_status" defaultValue={client.operational_status} className="w-full rounded-lg border p-2.5"><option value="onboarding">Onboarding</option><option value="operacao">Operação</option><option value="renovacao">Renovação</option><option value="pausado">Pausado</option></select>{error&&<p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={()=>setOpen(false)} className="rounded-lg border px-4 py-2">Cancelar</button><button disabled={busy} className="rounded-lg bg-korvix-900 px-4 py-2 text-white">{busy?"Salvando...":"Salvar"}</button></div></form></div>}</div>
}
