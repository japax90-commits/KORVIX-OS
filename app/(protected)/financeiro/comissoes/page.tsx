import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { FinanceSubnav } from "../FinanceSubnav";
import { createClient } from "@/lib/supabase/server";
import { calculateCommissions } from "@/lib/finance/calculations";
import { formatDate, formatMoney, humanize } from "@/lib/format";
import { requireModule } from "@/lib/auth/server";

export default async function ComissoesPage({ searchParams = {} }: { searchParams?: Record<string, string | undefined> }) {
  await requireModule("financeiro");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data, error } = await s.from("commissions").select("id,vendor_name,client_name,percentage,amount,status,created_at,commission_type,plan_name").order("created_at", { ascending: false });
  if (error) return <ErrorState title="Erro ao carregar comissões" message={error.message} />;
  const rows = data ?? [];
  const byPerson = Object.entries(rows.filter((c) => c.status !== "cancelada").reduce<Record<string, number>>((acc, c) => ({ ...acc, [c.vendor_name]: (acc[c.vendor_name] ?? 0) + Number(c.amount) }), {})).sort((a, b) => b[1] - a[1]);
  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Beneficiário", sortKey: "beneficiario", sortValue: (c) => c.vendor_name, cell: (c) => <span className="font-medium">{c.vendor_name}</span> },
    { header: "Cliente", sortKey: "cliente", sortValue: (c) => c.client_name, cell: (c) => c.client_name },
    { header: "Tipo", cell: (c) => humanize(c.commission_type), hideOnMobile: true },
    { header: "Base", cell: (c) => (c.percentage ? `${c.percentage}%` : "Valor fixo"), hideOnMobile: true },
    { header: "Valor", sortKey: "valor", sortValue: (c) => Number(c.amount), cell: (c) => formatMoney(c.amount) },
    { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { header: "Data", sortKey: "data", sortValue: (c) => c.created_at, cell: (c) => formatDate(c.created_at), hideOnMobile: true },
  ];
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Comissões" }]} title="Comissões" description="Geradas automaticamente a partir de pagamentos confirmados." />
      <FinanceSubnav active="/financeiro/comissoes" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total de comissões" value={formatMoney(calculateCommissions(rows))} />
        {byPerson.slice(0, 3).map(([name, total]) => <StatCard key={name} label={name} value={formatMoney(total)} />)}
      </div>
      <Card>
        <CardHeader title="Comissões por beneficiário" subtitle="Para corrigir uma comissão, edite o pagamento de origem." />
        <DataTable navigation={{ pathname: "/financeiro/comissoes", params: searchParams }} columns={columns} rows={rows} emptyLabel="Nenhuma comissão gerada ainda." />
      </Card>
    </div>
  );
}
