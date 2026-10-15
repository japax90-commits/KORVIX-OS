import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { FinanceSubnav } from "./FinanceSubnav";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { PageHeader, ErrorState, SectionTitle } from "@/components/ui/PageHeader";
import { Wallet, TrendingDown, PiggyBank, AlertTriangle, Target, Receipt, BadgeDollarSign, Landmark, Scale } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KORVIX_PLANS } from "@/lib/business/plans";
import { formatDate, formatMoney, humanize, isPastDay } from "@/lib/format";
import { MONTHLY_CONTRACT_GOAL, isClosedThisMonth } from "@/lib/business/goals";
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
import { requireModule } from "@/lib/auth/server";

export default async function FinanceiroPage() {
  await requireModule("financeiro");
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
  if (error) return <ErrorState title="Erro ao carregar o financeiro" message={error.message} />;

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
  const closedThisMonth = (contracts ?? []).filter((c) => c.status !== "cancelado" && isClosedThisMonth(c.created_at)).length;
  const remaining = Math.max(MONTHLY_CONTRACT_GOAL - closedThisMonth, 0);

  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Cliente", cell: (p) => <span className="font-medium">{p.client_name}</span> },
    { header: "Tipo", cell: (p) => humanize(p.type), hideOnMobile: true },
    { header: "Valor", cell: (p) => formatMoney(p.amount) },
    { header: "Vencimento", cell: (p) => formatDate(p.due_date), hideOnMobile: true },
    { header: "Status", cell: (p) => <StatusBadge status={p.status === "pendente" && isPastDay(p.due_date) ? "atrasado" : p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Financeiro" description="Visão financeira baseada nos dados reais da operação." />
      <FinanceSubnav active="/financeiro" />
      <section>
        <SectionTitle icon={<Wallet size={15} />}>Receita</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Receita recebida" value={formatMoney(revenue)} icon={Wallet} />
          <StatCard label="Receita prevista" value={formatMoney(forecast)} icon={Receipt} helper="Pendentes + atrasados" />
          <StatCard label="MRR" value={formatMoney(mrr)} icon={BadgeDollarSign} helper="Contratos ativos" />
          <StatCard label="Inadimplência" value={formatMoney(overdue)} icon={AlertTriangle} />
        </div>
      </section>
      <section>
        <SectionTitle icon={<Scale size={15} />}>Resultado</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Comissões" value={formatMoney(commissionTotal)} icon={TrendingDown} />
          <StatCard label="Despesas" value={formatMoney(expenses)} icon={TrendingDown} />
          <StatCard label="Impostos" value={formatMoney(taxes)} icon={Landmark} />
          <StatCard label="Pró-labore (20%)" value={formatMoney(proLabore)} icon={PiggyBank} />
          <StatCard label="Lucro líquido" value={formatMoney(netProfit)} icon={PiggyBank} />
          <StatCard label="Saldo em caixa" value={formatMoney(cashBalance)} icon={Wallet} />
        </div>
      </section>
      <section>
        <SectionTitle icon={<Target size={15} />}>Comercial</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Contratos no mês" value={`${closedThisMonth}/${MONTHLY_CONTRACT_GOAL}`} icon={Target} helper={remaining ? `Faltam ${remaining} para a meta` : "Meta atingida"} />
          <StatCard label="Conversão" value={`${conversion.toFixed(1)}%`} icon={Target} helper={`${won.length} ganhas · ${lost.length} perdidas`} />
          <StatCard label="Ticket médio" value={formatMoney(ticket)} icon={BadgeDollarSign} />
          <StatCard label="Planos de referência" value={`${KORVIX_PLANS.Essencial.price.toLocaleString("pt-BR")} · ${KORVIX_PLANS.Intermediário.price.toLocaleString("pt-BR")} · ${KORVIX_PLANS.Completo.price.toLocaleString("pt-BR")}`} helper="Essencial · Intermediário · Completo (R$)" />
        </div>
      </section>
      <Card>
        <CardHeader title="Últimos pagamentos" subtitle="10 mais recentes por vencimento" action={<Link href="/financeiro/pagamentos" className="text-sm font-medium text-korvix-600 hover:text-korvix-800">Ver todos</Link>} />
        <DataTable columns={columns} rows={rows.slice(0, 10)} emptyLabel="Nenhum pagamento registrado." />
      </Card>
    </div>
  );
}
