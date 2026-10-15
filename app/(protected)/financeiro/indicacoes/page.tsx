import { Card, CardHeader } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/Table";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { FinanceSubnav } from "../FinanceSubnav";
import { createClient } from "@/lib/supabase/server";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { CreateReferralButton, ReferralActions } from "@/components/operations/Referrals";
import { formatDate, formatMoney } from "@/lib/format";
import { requireModule } from "@/lib/auth/server";

export default async function IndicacoesPage({ searchParams = {} }: { searchParams?: Record<string, string | undefined> }) {
  await requireModule("financeiro");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data, error }, { data: profile }] = await Promise.all([
    s.from("referral_commissions").select("id,client_name,referrer_name,commission_type,commission_value,negotiated_by,status,created_at").order("created_at", { ascending: false }),
    s.from("users").select("id,name,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Erro ao carregar indicações" message={error.message} />;
  const rows = data ?? [];
  const canDelete = isKorvixAdmin(profile);
  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Cliente", sortKey: "cliente", sortValue: (r) => r.client_name, cell: (r) => <span className="font-medium">{r.client_name}</span> },
    { header: "Indicador", sortKey: "indicador", sortValue: (r) => r.referrer_name, cell: (r) => r.referrer_name },
    { header: "Valor", cell: (r) => (r.commission_type === "fixo" ? formatMoney(r.commission_value) : `${r.commission_value}%`) },
    { header: "Negociado por", cell: (r) => r.negotiated_by, hideOnMobile: true },
    { header: "Data", sortKey: "data", sortValue: (r) => r.created_at, cell: (r) => formatDate(r.created_at), hideOnMobile: true },
    { header: "Status", cell: (r) => <ReferralActions id={r.id} status={r.status} canDelete={canDelete} /> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader breadcrumbs={[{ label: "Financeiro", href: "/financeiro" }, { label: "Indicações" }]} title="Indicações" description="Comissões de indicação negociadas caso a caso." actions={<CreateReferralButton userName={profile?.name ?? user.email ?? "Usuário"} />} />
      <FinanceSubnav active="/financeiro/indicacoes" />
      <Card>
        <CardHeader title="Comissões de indicação" subtitle="Altere o status diretamente na tabela." />
        <DataTable navigation={{ pathname: "/financeiro/indicacoes", params: searchParams }} columns={columns} rows={rows} emptyLabel="Nenhuma indicação registrada." />
      </Card>
    </div>
  );
}
