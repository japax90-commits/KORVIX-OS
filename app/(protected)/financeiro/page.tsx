import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { Wallet, TrendingDown, PiggyBank, AlertTriangle } from "lucide-react";
import { payments, commissions, formatCurrency, formatDate } from "@/lib/mock-data";
import type { Payment } from "@/lib/types";

const subnav = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/pagamentos", label: "Pagamentos" },
  { href: "/financeiro/comissoes", label: "Comissões" },
  { href: "/financeiro/indicacoes", label: "Indicações" },
  { href: "/financeiro/caixa", label: "Caixa" },
];

export function FinanceSubnav({ active }: { active: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex gap-1 border-b border-ink-100 pb-px">
        {subnav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium ${
              active === item.href
                ? "border-korvix-600 text-korvix-700"
                : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function FinanceiroPage() {
  const faturamento = payments.filter((p) => p.status === "pago").reduce((a, p) => a + p.amount, 0);
  const comissoesTotal = commissions.reduce((a, c) => a + c.amount, 0);
  const receitaKorvix = faturamento - comissoesTotal;
  const inadimplencia = payments.filter((p) => p.status === "atrasado").reduce((a, p) => a + p.amount, 0);

  const columns: Column<Payment>[] = [
    { header: "Cliente", cell: (p) => p.clientName },
    {
      header: "Tipo",
      cell: (p) => (p.type === "primeira_venda" ? "Primeira venda" : "Recorrência"),
      hideOnMobile: true,
    },
    { header: "Valor", cell: (p) => formatCurrency(p.amount) },
    { header: "Vencimento", cell: (p) => formatDate(p.dueDate), hideOnMobile: true },
    { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">Financeiro</h2>
        <p className="text-sm text-ink-500">
          Pagamentos, comissões, indicações e caixa — conceitos financeiros sempre separados.
        </p>
      </div>

      <FinanceSubnav active="/financeiro" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Faturamento bruto" value={formatCurrency(faturamento)} icon={Wallet} />
        <StatCard label="Receita Korvix" value={formatCurrency(receitaKorvix)} icon={PiggyBank} />
        <StatCard label="Comissões" value={formatCurrency(comissoesTotal)} icon={TrendingDown} />
        <StatCard
          label="Inadimplência"
          value={formatCurrency(inadimplencia)}
          icon={AlertTriangle}
          trend={inadimplencia > 0 ? { positive: false, label: "requer atenção" } : undefined}
        />
      </div>

      <Card>
        <CardHeader title="Últimos pagamentos" subtitle="Registro manual, confirmação exige permissão específica" />
        <DataTable columns={columns} rows={payments} />
      </Card>
    </div>
  );
}
