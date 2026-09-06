import { createClient } from "@/lib/supabase/server";
import { CreateAgendaButton } from "@/components/operations/CreateAgendaButton";
import { AgendaView } from "@/components/operations/AgendaView";

type Event={id:string;title:string;type:string;start_at:string;end_at:string|null;responsible_name:string;status:string;related_to:string|null};

export default async function AgendaPage(){
 const supabase=await createClient();
 const{data:{user}}=await supabase.auth.getUser();
 if(!user)return null;
 const[{data:events,error},{data:profile}]=await Promise.all([
  supabase.from("agenda_events").select("id,title,type,start_at,end_at,responsible_name,status,related_to").order("start_at",{ascending:true}),
  supabase.from("users").select("name").eq("id",user.id).maybeSingle()
 ]);
 if(error)return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar a agenda: {error.message}</div>;
 const rows=(events??[]) as Event[];
 return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold tracking-tight text-ink-900">Agenda</h2><p className="text-sm text-ink-500">Visão unificada de compromissos.</p></div><CreateAgendaButton userName={profile?.name??user.email??"Usuário"}/></div><AgendaView events={rows}/></div>;
}
