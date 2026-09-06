"use client";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export function AgendaActions({id}:{id:string}){async function remove(){if(!window.confirm("Excluir este evento da agenda?"))return;const{error}=await createClient().from("agenda_events").delete().eq("id",id);if(error){window.alert(error.message);return;}window.location.reload();}return <button type="button" onClick={remove} className="rounded-md p-1.5 text-red-500 hover:bg-red-50" title="Excluir evento" aria-label="Excluir evento"><Trash2 size={14}/></button>;}
