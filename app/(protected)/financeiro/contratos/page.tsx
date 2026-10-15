import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { FinanceSubnav } from "../FinanceSubnav";
import { createClient } from "@/lib/supabase/server";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { CreateContractButton, ContractRowActions } from "@/components/operations/Contracts";
import { calculateMRR } from "@/lib/finance/calculations";
import { formatDate, formatMoney } from "@/lib/format";
import { FREQUENCIES } from "@/lib/options";

const frequencyLabel = Object.fromEntries(FREQUENCIES.map((f) => [f.value, f.label]));

export default async function ContratosPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: contracts, error }, { data: clients }, { data: profile }] = await Promise.all([
    s.from("contracts").select("id,client_name,plan_name,value,frequency,status,start_date,next_billing_date").order("created_at", { ascending: false }),
    s.from("clients").select("id,company_name").order("company_name"),
    s.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Erro ao carregar contratos" message={error.message} />;
  const rows = (contracts ?? []).map((c) => ({ ...c, value: Number(c.value), next_billing_date: c.next_billing_date ?? null }));
  const canDelete = isKorvixAdmin(profile);
  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Cliente", cell: (c) => <div><p className="font-medium text-ink-900">{c.client_name}</p><p className="text-xs text-ink-500">{c.plan_name}</p></div> },
    { header: "Valor", cell: (c) => formatMoney(c.value) },
    { header: "Frequência", cell: (c) => frequencyLabel[c.frequency] ?? c.frequency, hideOnMobile: true },
    { header: "Início", cell: (c) => formatDate(c.start_date), hideOnMobile: true },
    { header: "Próxima cobrança", cell: (c) => formatDate(c.next_billing_date), hideOnMobile: true },
    { header: "Status", cell: (c) => <StatusBadge status={c.status} /> },
    { header: "Ações", className: "text-right", cell: (c) => <div className="flex justify-end"><ContractRowActions clients={clients ?? []} contract={c} canDelete={canDelete} /></div> },
  ];
  const active = rows.filter((c) => c.status === "ativo");
  return (
    <div className="space-y-6">
      <PageHeader title="Contratos" description="Contratos reais e base da recorrência." actions={<CreateContractButton clients={clients ?? []} />} />
      <FinanceSubnav active="/financeiro/contratos" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Contratos ativos" value={String(active.length)} />
        <StatCard label="MRR" value={formatMoney(calculateMRR(rows))} helper="Receita recorrente mensal" />
        <StatCard label="Total de contratos" value={String(rows.length)} />
      </div>
      <Card>
        <CardHeader title="Contratos" subtitle="Planos oficiais: Essencial, Intermediário e Completo." />
        <DataTable columns={columns} rows={rows} emptyLabel="Nenhum contrato cadastrado." />
      </Card>
    </div>
  );
}
