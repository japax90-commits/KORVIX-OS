import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { FinanceSubnav } from "../FinanceSubnav";
import { commissions, formatCurrency, formatDate } from "@/lib/mock-data";
import type { Commission } from "@/lib/types";

export default function ComissoesPage() {
  const columns: Column<Commission>[] = [
    { header: "Vendedor", cell: (c) => c.vendorName },
    { header: "Cliente", cell: (c) => c.clientName },
    { header: "Percentual", cell: (c) => `${c.percentage}%`, hideOnMobile: true },
    { header: "Valor", cell: (c) => formatCurrency(c.amount) },
    { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { header: "Data", cell: (c) => formatDate(c.createdAt), hideOnMobile: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">Financeiro</h2>
        <p className="text-sm text-ink-500">
          50% na primeira venda, 10% na recorrência — liberada apenas na confirmação do pagamento.
        </p>
      </div>

      <FinanceSubnav active="/financeiro/comissoes" />

      <Card>
        <CardHeader
          title="Comissões por vendedor"
          subtitle="Propriedade de origem nunca muda automaticamente"
        />
        <DataTable columns={columns} rows={commissions} emptyLabel="Nenhuma comissão gerada ainda." />
      </Card>
    </div>
  );
}
