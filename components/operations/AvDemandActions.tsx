"use client";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
export function AvDemandActions({id}:{id:string}){async function remove(){if(!window.confirm("Excluir esta demanda audiovisual?"))return;const{error}=await createClient().from("av_demands").delete().eq("id",id);if(error){window.alert(error.message);return;}window.location.reload();}return <button type="button" onClick={remove} className="rounded-md p-1.5 text-red-500 hover:bg-red-50" title="Excluir demanda" aria-label="Excluir demanda"><Trash2 size={14}/></button>;}
