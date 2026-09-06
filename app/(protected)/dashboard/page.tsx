import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Wallet, Users, ClipboardList, Target, Receipt, PiggyBank, AlertTriangle, BadgeDollarSign, TrendingDown } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { calculateAverageTicket, calculateCashBalance, calculateCommissions, calculateConversionRate, calculateForecastRevenue, calculateMRR, calculateNetProfit, calculateOperationalExpenses, calculateOverdue, calculateProLabore, calculateRevenue, calculateTaxes } from "@/lib/finance/calculations";

const money=(n:number)=>n.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default async function DashboardPage(){
  const s=await createClient();
  const {data:{user}}=await s.auth.getUser();
  if(!user)return null;
  const [{data:opp,error:oe},{data:clients,error:ce},{data:payments,error:pe},{data:commissions,error:me},{data:contracts,error:cte},{data:tasks,error:te},{data:avDemands,error:ae},{data:movements,error:cashError}]=await Promise.all([
    s.from("opportunities").select("id,client_name,stage,estimated_value,created_at").order("created_at",{ascending:false}).limit(500),
    s.from("clients").select("id,operational_status"),
    s.from("payments").select("amount,status,due_date,paid_at"),
    s.from("commissions").select("amount,status"),
    s.from("contracts").select("value,frequency,status"),
    s.from("tasks").select("id,status,due_date"),
    s.from("av_demands").select("id,status"),
    s.from("cash_movements").select("amount,direction,category"),
  ]);
  const error=oe??ce??pe??me??cte??te??ae??cashError;
  if(error)return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">Erro ao carregar dashboard: {error.message}</div>;
  const opportunities=opp??[], paymentRows=payments??[], cash=movements??[];
  const won=opportunities.filter(x=>x.stage==="ganho"||x.stage==="fechado_ganho");
  const lost=opportunities.filter(x=>x.stage==="perdido"||x.stage==="fechado_perdido");
  const open=opportunities.filter(x=>!["ganho","perdido","fechado_ganho","fechado_perdido"].includes(x.stage));
  const revenue=calculateRevenue(paymentRows), forecast=calculateForecastRevenue(paymentRows), overdue=calculateOverdue(paymentRows);
  const commissionsTotal=calculateCommissions(commissions??[]), expenses=calculateOperationalExpenses(cash), taxes=calculateTaxes(cash);
  const proLabore=calculateProLabore(revenue), netProfit=calculateNetProfit(revenue,commissionsTotal,expenses,proLabore,taxes);
  const cashBalance=calculateCashBalance(cash), mrr=calculateMRR(contracts??[]), conversion=calculateConversionRate(won.length,lost.length);
  const ticket=calculateAverageTicket(won.map(x=>Number(x.estimated_value??0)).filter(v=>v>0));
  const monthStart=new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const closedThisMonth=won.filter(x=>new Date(x.created_at)>=monthStart).length, goal=5, remaining=Math.max(goal-closedThisMonth,0);
  const clientRows=clients??[], taskRows=tasks??[], avRows=avDemands??[];
  return <div className="space-y-6">
    <div><h2 className="text-xl font-semibold tracking-tight text-ink-900">Korvix Command Center</h2><p className="text-sm text-ink-500">Visão operacional e financeira em tempo real.</p></div>
    <section><div className="mb-3 flex items-center gap-2"><Wallet size={15}/><h3 className="text-sm font-semibold">Financeiro</h3></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Faturamento recebido" value={money(revenue)} icon={Wallet}/><StatCard label="Faturamento previsto" value={money(forecast)} icon={Receipt}/><StatCard label="MRR" value={money(mrr)} icon={BadgeDollarSign}/><StatCard label="Inadimplência" value={money(overdue)} icon={AlertTriangle}/>
      <StatCard label="Despesas" value={money(expenses)} icon={TrendingDown}/><StatCard label="Comissões" value={money(commissionsTotal)} icon={TrendingDown}/><StatCard label="Pró-labore" value={money(proLabore)} icon={PiggyBank}/><StatCard label="Impostos" value={money(taxes)} icon={TrendingDown}/>
      <StatCard label="Lucro líquido" value={money(netProfit)} icon={PiggyBank}/><StatCard label="Saldo em caixa" value={money(cashBalance)} icon={Wallet}/>
    </div></section>
    <section><div className="mb-3 flex items-center gap-2"><Target size={15}/><h3 className="text-sm font-semibold">Comercial</h3></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Pipeline aberto" value={money(open.reduce((sum,x)=>sum+Number(x.estimated_value??0),0))} icon={Target}/><StatCard label="Vendas ganhas" value={String(won.length)} icon={Target}/><StatCard label="Conversão" value={`${conversion.toFixed(1)}%`} icon={Target}/><StatCard label="Ticket médio" value={money(ticket)} icon={BadgeDollarSign}/><StatCard label="Meta do mês" value={`${closedThisMonth}/${goal}`} icon={Target}/><StatCard label="Faltam para meta" value={String(remaining)} icon={Target}/>
    </div></section>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card><CardHeader title="Clientes"/><CardBody className="space-y-3"><Mini label="Operação" v={clientRows.filter(x=>x.operational_status==="operacao").length}/><Mini label="Onboarding" v={clientRows.filter(x=>x.operational_status==="onboarding").length}/><Mini label="Renovação" v={clientRows.filter(x=>x.operational_status==="renovacao").length}/></CardBody></Card>
      <Card><CardHeader icon={<ClipboardList size={16}/>} title="Operação"/><CardBody className="space-y-3"><Mini label="Tarefas abertas" v={taskRows.filter(x=>x.status!=="concluida").length}/><Mini label="Tarefas atrasadas" v={taskRows.filter(x=>x.status!=="concluida"&&new Date(x.due_date+"T23:59:59")<new Date()).length}/><Mini label="Audiovisual pendente" v={avRows.filter(x=>!["PUBLISHED","CANCELLED","FINALIZED"].includes(x.status)).length}/></CardBody></Card>
      <Card><CardHeader icon={<Users size={16}/>} title="Equipe"/><CardBody><p className="text-sm text-ink-500">Metas individuais podem ser configuradas no módulo de Metas.</p><div className="mt-4 rounded-lg bg-ink-50 p-4"><p className="text-xs text-ink-500">Meta empresarial</p><p className="mt-1 text-2xl font-semibold">{closedThisMonth} / {goal}</p><p className="text-xs text-ink-500">contratos fechados no mês</p></div></CardBody></Card>
    </div>
    <Card><CardHeader title="Últimas oportunidades"/><CardBody className="!p-0"><div className="divide-y divide-ink-100">{opportunities.slice(0,10).map(x=><div key={x.id} className="flex items-center justify-between px-5 py-3.5"><div><p className="font-medium">{x.client_name}</p><p className="text-xs text-ink-500">{money(Number(x.estimated_value??0))}</p></div><StatusBadge status={x.stage}/></div>)}</div>{opportunities.length===0&&<p className="p-5 text-sm text-ink-500">Nenhuma oportunidade ainda. Vá ao CRM e crie a primeira.</p>}</CardBody></Card>
  </div>;
}
function Mini({label,v}:{label:string;v:number}){return <div className="flex justify-between"><span className="text-sm text-ink-700">{label}</span><span className="text-lg font-semibold">{v}</span></div>}
