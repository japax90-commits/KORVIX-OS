import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { createClient } from "@/lib/supabase/server";
import { CreateTaskButton } from "@/components/operations/CreateTaskButton";
import { TaskActions } from "@/components/operations/TaskActions";
import { isKorvixAdmin } from "@/lib/auth/permissions";

const entityLabel: Record<string,string>={lead_oportunidade:"Oportunidade",cliente:"Cliente",contrato:"Contrato",audiovisual:"Audiovisual",agenda:"Agenda",usuario:"Usuário"};
const formatDate=(v:string)=>new Date(v).toLocaleDateString("pt-BR");
type User={id:string;name:string};

export default async function TarefasPage(){
 const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser(); if(!user)return null;
 const [{data:tasks,error},{data:profile},{data:users}]=await Promise.all([
  supabase.from("tasks").select("id,title,assigned_to_id,assigned_to_name,priority,status,due_date,related_entity_type,related_entity_label").order("due_date",{ascending:true}),
  supabase.from("users").select("id,name,email,role,active").eq("id",user.id).maybeSingle(),
  supabase.from("users").select("id,name").eq("active",true).order("name")
 ]);
 if(error)return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar as tarefas: {error.message}</div>;
 const rows=tasks??[]; const admin=isKorvixAdmin(profile); const assignable=(users??[]) as User[];
 const columns:Column<(typeof rows)[number]>[]=[
  {header:"Tarefa",cell:t=><div><p className="font-medium text-ink-900">{t.title}</p><p className="text-xs text-ink-500">{entityLabel[t.related_entity_type]??t.related_entity_type} · {t.related_entity_label||"—"}</p></div>},
  {header:"Responsável",cell:t=>t.assigned_to_name},
  {header:"Prioridade",cell:t=><Badge tone={t.priority==="urgente"?"danger":t.priority==="alta"?"warning":"neutral"}>{t.priority}</Badge>,hideOnMobile:true},
  {header:"Prazo",cell:t=>formatDate(t.due_date),hideOnMobile:true},
  {header:"Status",cell:t=><StatusBadge status={t.status}/>},
  {header:"Ações",cell:t=><TaskActions task={t} users={assignable} isAdmin={admin}/>,hideOnMobile:true}
 ];
 return <div className="space-y-6"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold tracking-tight text-ink-900">Tarefas</h2><p className="text-sm text-ink-500">Cada pessoa vê suas próprias tarefas; administradores podem distribuir e acompanhar todas.</p></div><CreateTaskButton userId={user.id} userName={profile?.name??user.email??"Usuário"} users={assignable} isAdmin={admin}/></div><Card><CardHeader title={admin?"Todas as tarefas":"Minhas tarefas"} subtitle="Dados reais do Supabase"/><DataTable columns={columns} rows={rows} emptyLabel="Nenhuma tarefa cadastrada. Use Nova tarefa para começar."/></Card></div>;
}
