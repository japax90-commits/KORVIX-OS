import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { PageHeader, ErrorState, SectionTitle } from "@/components/ui/PageHeader";
import { Wallet, Users, ClipboardList, Target, Receipt, PiggyBank, AlertTriangle, BadgeDollarSign, TrendingDown, Landmark } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, isPastDay } from "@/lib/format";
import { MONTHLY_CONTRACT_GOAL, isClosedThisMonth } from "@/lib/business/goals";
import { calculateAverageTicket, calculateCashBalance, calculateCommissions, calculateConversionRate, calculateForecastRevenue, calculateMRR, calculateNetProfit, calculateOperationalExpenses, calculateOverdue, calculateProLabore, calculateRevenue, calculateTaxes } from "@/lib/finance/calculations";
import { requireModule } from "@/lib/auth/server";

function Mini({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = <><span className="text-sm text-ink-700">{label}</span><span className="text-lg font-semibold tabular-nums text-ink-900">{value}</span></>;
  return href ? <Link href={href} className="-mx-2 flex items-center justify-between rounded-lg px-2 py-1 hover:bg-ink-50">{content}</Link> : <div className="flex items-center justify-between py-1">{content}</div>;
}

export default async function DashboardPage() {
  await requireModule("dashboard");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: opp, error: oe }, { data: clients, error: ce }, { data: payments, error: pe }, { data: commissions, error: me }, { data: contracts, error: cte }, { data: tasks, error: te }, { data: avDemands, error: ae }, { data: movements, error: cashError }] = await Promise.all([
    s.from("opportunities").select("id,client_name,stage,estimated_value,created_at").order("created_at", { ascending: false }).limit(500),
    s.from("clients").select("id,operational_status"),
    s.from("payments").select("amount,status,due_date,paid_at"),
    s.from("commissions").select("amount,status"),
    s.from("contracts").select("client_name,value,frequency,status,start_date,created_at"),
    s.from("tasks").select("id,status,due_date"),
    s.from("av_demands").select("id,status"),
    s.from("cash_movements").select("amount,direction,category"),
  ]);
  const error = oe ?? ce ?? pe ?? me ?? cte ?? te ?? ae ?? cashError;
  if (error) return <ErrorState title="Erro ao carregar o dashboard" message={error.message} />;

  const opportunities = opp ?? [], paymentRows = payments ?? [], cash = movements ?? [], contractRows = contracts ?? [];
  const won = opportunities.filter((x) => x.stage === "ganho" || x.stage === "fechado_ganho");
  const lost = opportunities.filter((x) => x.stage === "perdido" || x.stage === "fechado_perdido");
  const open = opportunities.filter((x) => !["ganho", "perdido", "fechado_ganho", "fechado_perdido"].includes(x.stage));
  const revenue = calculateRevenue(paymentRows), forecast = calculateForecastRevenue(paymentRows), overdue = calculateOverdue(paymentRows);
  const commissionsTotal = calculateCommissions(commissions ?? []), expenses = calculateOperationalExpenses(cash), taxes = calculateTaxes(cash);
  const proLabore = calculateProLabore(revenue), netProfit = calculateNetProfit(revenue, commissionsTotal, expenses, proLabore, taxes);
  const cashBalance = calculateCashBalance(cash), mrr = calculateMRR(contractRows), conversion = calculateConversionRate(won.length, lost.length);
  const wonClientNames = new Set(won.map((x) => x.client_name.trim().toLowerCase()));
  const ticket = calculateAverageTicket(contractRows.filter((x) => x.status !== "cancelado" && wonClientNames.has(x.client_name.trim().toLowerCase())).map((x) => Number(x.value ?? 0)).filter((v) => v > 0));
  const closedThisMonth = contractRows.filter((x) => x.status !== "cancelado" && isClosedThisMonth(x.created_at)).length;
  const remaining = Math.max(MONTHLY_CONTRACT_GOAL - closedThisMonth, 0);
  const progress = Math.min(100, Math.round((closedThisMonth / MONTHLY_CONTRACT_GOAL) * 100));
  const clientRows = clients ?? [], taskRows = tasks ?? [], avRows = avDemands ?? [];
  const openTasks = taskRows.filter((x) => !["concluida", "cancelada"].includes(x.status));

  return (
    <div className="space-y-6">
      <PageHeader title="Korvix Command Center" description="Visão operacional e financeira com dados reais." />
      <section>
        <SectionTitle icon={<Wallet size={15} />}>Financeiro</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-5">
          <StatCard label="Faturamento recebido" value={formatMoney(revenue)} icon={Wallet} />
          <StatCard label="Faturamento previsto" value={formatMoney(forecast)} icon={Receipt} />
          <StatCard label="MRR" value={formatMoney(mrr)} icon={BadgeDollarSign} />
          <StatCard label="Inadimplência" value={formatMoney(overdue)} icon={AlertTriangle} />
          <StatCard label="Saldo em caixa" value={formatMoney(cashBalance)} icon={Wallet} />
          <StatCard label="Despesas" value={formatMoney(expenses)} icon={TrendingDown} />
          <StatCard label="Comissões" value={formatMoney(commissionsTotal)} icon={TrendingDown} />
          <StatCard label="Pró-labore" value={formatMoney(proLabore)} icon={PiggyBank} />
          <StatCard label="Impostos" value={formatMoney(taxes)} icon={Landmark} />
          <StatCard label="Lucro líquido" value={formatMoney(netProfit)} icon={PiggyBank} />
        </div>
      </section>
      <section>
        <SectionTitle icon={<Target size={15} />}>Comercial</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Pipeline aberto" value={formatMoney(open.reduce((sum, x) => sum + Number(x.estimated_value ?? 0), 0))} icon={Target} helper={`${open.length} oportunidade(s)`} />
          <StatCard label="Vendas ganhas" value={String(won.length)} icon={Target} />
          <StatCard label="Conversão" value={`${conversion.toFixed(1)}%`} icon={Target} />
          <StatCard label="Ticket médio" value={formatMoney(ticket)} icon={BadgeDollarSign} />
        </div>
      </section>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader icon={<Target size={16} />} title="Meta do mês" subtitle="Contratos fechados no mês corrente" />
          <CardBody>
            <p className="text-3xl font-semibold tabular-nums text-ink-900">{closedThisMonth}<span className="text-lg text-ink-500"> / {MONTHLY_CONTRACT_GOAL}</span></p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-korvix-500" style={{ width: `${progress}%` }} /></div>
            <p className="mt-2 text-xs text-ink-500">{remaining ? `Faltam ${remaining} contrato(s) para a meta.` : "Meta do mês atingida."}</p>
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<Users size={16} />} title="Clientes" />
          <CardBody className="space-y-1">
            <Mini label="Em operação" value={clientRows.filter((x) => x.operational_status === "operacao").length} href="/clientes?status=operacao" />
            <Mini label="Onboarding" value={clientRows.filter((x) => x.operational_status === "onboarding").length} href="/clientes?status=onboarding" />
            <Mini label="Renovação" value={clientRows.filter((x) => x.operational_status === "renovacao").length} href="/clientes?status=renovacao" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader icon={<ClipboardList size={16} />} title="Operação" />
          <CardBody className="space-y-1">
            <Mini label="Tarefas abertas" value={openTasks.length} href="/tarefas" />
            <Mini label="Tarefas atrasadas" value={openTasks.filter((x) => isPastDay(x.due_date)).length} href="/tarefas?filtro=atrasadas" />
            <Mini label="Audiovisual em produção" value={avRows.filter((x) => !["PUBLISHED", "CANCELLED", "FINALIZED"].includes(x.status)).length} href="/audiovisual" />
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Últimas oportunidades" action={<Link href="/crm" className="text-sm font-medium text-korvix-600 hover:text-korvix-800">Abrir CRM</Link>} />
        <CardBody className="!p-0">
          <ul className="divide-y divide-ink-100">
            {opportunities.slice(0, 8).map((x) => (
              <li key={x.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0"><p className="truncate font-medium text-ink-900">{x.client_name}</p><p className="text-xs text-ink-500">{formatMoney(x.estimated_value ?? 0)}</p></div>
                <StatusBadge status={x.stage} />
              </li>
            ))}
          </ul>
          {opportunities.length === 0 && <p className="p-5 text-sm text-ink-500">Nenhuma oportunidade ainda. Vá ao CRM e crie a primeira.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
