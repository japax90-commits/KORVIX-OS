import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { ChevronRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateClientButton } from "@/components/operations/CreateClientButton";

export default async function ClientesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase.from("clients").select("id, company_name, contact_name, phone, niche, origin_owner_id, account_manager_id, operational_status, active_contract_value, active_plan_name, entry_date").order("created_at", { ascending: false });
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">Não foi possível carregar os clientes: {error.message}</div>;
  const clients = data ?? [];
  const ids = Array.from(new Set(clients.flatMap(c => [c.origin_owner_id, c.account_manager_id]).filter(Boolean)));
  const { data: people } = ids.length ? await supabase.from("users").select("id,name").in("id", ids) : { data: [] as {id:string;name:string}[] };
  const owner = (id: string | null) => people?.find(p => p.id === id)?.name ?? "—";
  const counts = { onboarding: clients.filter(c=>c.operational_status==="onboarding").length, operacao: clients.filter(c=>c.operational_status==="operacao").length, renovacao: clients.filter(c=>c.operational_status==="renovacao").length, pausado: clients.filter(c=>c.operational_status==="pausado").length };
  const money = (n:number|null) => n == null ? "—" : n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const columns: Column<(typeof clients)[number]>[] = [
    {header:"Cliente",cell:c=><div><p className="font-medium text-ink-900">{c.company_name}</p><p className="text-xs text-ink-500">{c.contact_name}</p></div>},
    {header:"Status",cell:c=><StatusBadge status={c.operational_status}/>},
    {header:"Plano",cell:c=>c.active_plan_name||"—",hideOnMobile:true},
    {header:"Valor",cell:c=>money(c.active_contract_value),hideOnMobile:true},
    {header:"Origem / Atendimento",cell:c=><span className="text-xs text-ink-500">{owner(c.origin_owner_id)} / {owner(c.account_manager_id)}</span>,hideOnMobile:true},
    {header:"",cell:c=><Link href={`/clientes/${c.id}`} className="flex items-center gap-1 text-xs font-medium text-korvix-600">Ver ficha <ChevronRight size={14}/></Link>}
  ];
  return <div className="space-y-6">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-xl font-semibold tracking-tight text-ink-900">Clientes</h2><p className="text-sm text-ink-500">Visão 360º e acompanhamento do ciclo de vida operacional.</p></div><CreateClientButton currentUserId={user.id}/></div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><StatCard label="Em onboarding" value={String(counts.onboarding)} icon={Users}/><StatCard label="Em operação" value={String(counts.operacao)}/><StatCard label="Em renovação" value={String(counts.renovacao)}/><StatCard label="Pausados" value={String(counts.pausado)}/></div>
    <Card><CardHeader title="Todos os clientes" subtitle="Dados reais do Supabase"/><DataTable columns={columns} rows={clients} emptyLabel="Nenhum cliente cadastrado. Use Novo cliente para começar."/></Card>
  </div>;
}
