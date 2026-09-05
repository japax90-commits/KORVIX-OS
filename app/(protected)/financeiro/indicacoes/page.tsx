import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { FinanceSubnav } from "../FinanceSubnav";
import { Plus } from "lucide-react";
import { referralCommissions, formatCurrency } from "@/lib/mock-data";
import type { ReferralCommission } from "@/lib/types";

export default function IndicacoesPage() {
  const columns: Column<ReferralCommission>[] = [
    { header: "Cliente", cell: (r) => r.clientName },
    { header: "Indicador", cell: (r) => r.referrerName },
    {
      header: "Valor",
      cell: (r) =>
        r.commissionType === "fixo"
          ? formatCurrency(r.commissionValue)
          : `${r.commissionValue}%`,
    },
    { header: "Negociado por", cell: (r) => r.negotiatedBy, hideOnMobile: true },
    { header: "Status", cell: (r) => <StatusBadge status={r.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Financeiro</h2>
          <p className="text-sm text-ink-500">
            Indicações negociadas caso a caso — sempre sai da parte da Korvix, nunca da do vendedor.
          </p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} /> Registrar indicação
        </button>
      </div>

      <FinanceSubnav active="/financeiro/indicacoes" />

      <Card>
        <CardHeader
          title="Comissões de indicação"
          subtitle="Valor fixo ou percentual, sem percentual padrão obrigatório"
        />
        <DataTable columns={columns} rows={referralCommissions} emptyLabel="Nenhuma indicação registrada." />
      </Card>
    </div>
  );
}
