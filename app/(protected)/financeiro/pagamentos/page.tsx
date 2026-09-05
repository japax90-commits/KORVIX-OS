import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { FinanceSubnav } from "../page";
import { CheckCircle2, Plus } from "lucide-react";
import { payments, formatCurrency, formatDate } from "@/lib/mock-data";
import type { Payment } from "@/lib/types";

export default function PagamentosPage() {
  const columns: Column<Payment>[] = [
    { header: "Cliente", cell: (p) => p.clientName },
    {
      header: "Tipo",
      cell: (p) => (p.type === "primeira_venda" ? "Primeira venda" : "Recorrência"),
    },
    { header: "Método", cell: (p) => p.method, hideOnMobile: true },
    { header: "Valor", cell: (p) => formatCurrency(p.amount) },
    { header: "Vencimento", cell: (p) => formatDate(p.dueDate), hideOnMobile: true },
    { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    {
      header: "",
      cell: (p) =>
        p.status === "pendente" || p.status === "atrasado" ? (
          <button className="focus-ring flex items-center gap-1 text-xs font-medium text-korvix-600 hover:text-korvix-700">
            <CheckCircle2 size={14} /> Confirmar
          </button>
        ) : (
          <span className="text-xs text-ink-500">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Financeiro</h2>
          <p className="text-sm text-ink-500">Pagamentos registrados manualmente.</p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} /> Registrar pagamento
        </button>
      </div>

      <FinanceSubnav active="/financeiro/pagamentos" />

      <Card>
        <CardHeader
          title="Todos os pagamentos"
          subtitle="Confirmar exige permissão can_confirm_payment; gera comissão automaticamente"
        />
        <DataTable columns={columns} rows={payments} />
      </Card>
    </div>
  );
}
