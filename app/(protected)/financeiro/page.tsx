import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { FinanceSubnav } from "./FinanceSubnav";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { Wallet, TrendingDown, PiggyBank, AlertTriangle, Target, Receipt, BadgeDollarSign } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  calculateAverageTicket,
  calculateCashBalance,
  calculateCommissions,
  calculateConversionRate,
  calculateForecastRevenue,
  calculateMRR,
  calculateNetProfit,
  calculateOperationalExpenses,
  calculateOverdue,
  calculateProLabore,
  calculateRevenue,
  calculateTaxes,
} from "@/lib/finance/calculations";

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default async function FinanceiroPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;

  const [{ data: payments, error: paymentsError }, { data: commissions, error: commissionsError }, { data: contracts, error: contractsError }, { data: cashMovements, error: cashError }, { data: opportunities, error: opportunitiesError }] = await Promise.all([
    s.from("payments").select("id,client_name,type,amount,due_date,status,paid_at").order("due_date", { ascending: false }).limit(500),
    s.from("commissions").select("id,amount,status"),
    s.from("contracts").select("client_name,value,frequency,status,created_at"),
    s.from("cash_movements").select("amount,direction,category"),
    s.from("opportunities").select("client_name,stage,created_at").order("created_at", { ascending: false }).limit(500),
  ]);

  const error = paymentsError ?? commissionsError ?? contractsError ?? cashError ?? opportunitiesError;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">Erro ao carregar financeiro: {error.message}</div>;

  const rows = payments ?? [];
  const movements = cashMovements ?? [];
  const revenue = calculateRevenue(rows);
  const forecast = calculateForecastRevenue(rows);
  const overdue = calculateOverdue(rows);
  const commissionTotal = calculateCommissions(commissions ?? []);
  const expenses = calculateOperationalExpenses(movements);
  const taxes = calculateTaxes(movements);
  const proLabore = calculateProLabore(revenue);
  const netProfit = calculateNetProfit(revenue, commissionTotal, expenses, proLabore, taxes);
  const mrr = calculateMRR(contracts ?? []);
  const cashBalance = calculateCashBalance(movements);

  const won = (opportunities ?? []).filter((o) => o.stage === "ganho" || o.stage === "fechado_ganho");
  const lost = (opportunities ?? []).filter((o) => o.stage === "perdido" || o.stage === "fechado_perdido");
  const conversion = calculateConversionRate(won.length, lost.length);

  const wonClientNames = new Set(won.map((o) => o.client_name?.trim().toLowerCase()).filter(Boolean));
  const wonContractValues = (contracts ?? [])
    .filter((c) => c.status !== "cancelado" && wonClientNames.has(c.client_name.trim().toLowerCase()))
    .map((c) => Number(c.value ?? 0))
    .filter((v) => v > 0);
  const ticket = calculateAverageTicket(wonContractValues);

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const closedThisMonth = (contracts ?? []).filter((c) => c.status !== "cancelado" && new Date(c.created_at) >= monthStart).length;
  const goal = 5;
  const remaining = Math.max(goal - closedThisMonth, 0);

  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Cliente", cell: (p) => p.client_name },
    { header: "Tipo", cell: (p) => p.type, hideOnMobile: true },
    { header: "Valor", cell: (p) => money(Number(p.amount)) },
    { header: "Vencimento", cell: (p) => new Date(p.due_date).toLocaleDateString("pt-BR"), hideOnMobile: true },
    { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-semibold tracking-tight text-ink-900">Financeiro</h2><p className="text-sm text-ink-500">Visão financeira baseada nos dados reais da operação.</p></div>
      <FinanceSubnav active="/financeiro" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Receita recebida" value={money(revenue)} icon={Wallet} />
        <StatCard label="Receita prevista" value={money(forecast)} icon={Receipt} />
        <StatCard label="MRR" value={money(mrr)} icon={BadgeDollarSign} />
        <StatCard label="Inadimplência" value={money(overdue)} icon={AlertTriangle} />
        <StatCard label="Comissões" value={money(commissionTotal)} icon={TrendingDown} />
        <StatCard label="Despesas" value={money(expenses)} icon={TrendingDown} />
        <StatCard label="Impostos" value={money(taxes)} icon={TrendingDown} />
        <StatCard label="Pró-labore (20%)" value={money(proLabore)} icon={PiggyBank} />
        <StatCard label="Lucro líquido" value={money(netProfit)} icon={PiggyBank} />
        <StatCard label="Saldo em caixa" value={money(cashBalance)} icon={Wallet} />
        <StatCard label="Contratos no mês" value={`${closedThisMonth}/${goal}`} icon={Target} />
        <StatCard label="Faltam para meta" value={String(remaining)} icon={Target} />
        <StatCard label="Conversão" value={`${conversion.toFixed(1)}%`} icon={Target} />
        <StatCard label="Ticket médio" value={money(ticket)} icon={BadgeDollarSign} />
      </div>
      <Card><CardHeader title="Indicadores comerciais" subtitle="Contratos fechados e ticket médio" /><CardBody className="grid grid-cols-1 gap-3 sm:grid-cols-3"><div><p className="text-xs text-ink-500">Contratos fechados</p><p className="text-xl font-semibold">{won.length}</p></div><div><p className="text-xs text-ink-500">Ticket médio</p><p className="text-xl font-semibold">{money(ticket)}</p></div><div><p className="text-xs text-ink-500">Planos de referência</p><p className="text-xl font-semibold">R$ 1.000 · R$ 2.000 · R$ 3.000</p></div></CardBody></Card>
      <Card><CardHeader title="Últimos pagamentos" subtitle="Pagamentos reais armazenados no Supabase" /><DataTable columns={columns} rows={rows} emptyLabel="Nenhum pagamento registrado." /></Card>
    </div>
  );
}
