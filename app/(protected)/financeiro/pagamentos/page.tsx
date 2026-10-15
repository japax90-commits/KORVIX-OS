import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { FinanceSubnav } from "../FinanceSubnav";
import { createClient } from "@/lib/supabase/server";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { CreatePaymentButton, ConfirmPaymentButton, PaymentEditButton } from "@/components/operations/Payments";
import { formatDate, formatMoney, isPastDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PAYMENT_TYPES, PAYMENT_METHODS } from "@/lib/options";
import { requireModule } from "@/lib/auth/server";

const typeLabel = Object.fromEntries(PAYMENT_TYPES.map((t) => [t.value, t.label]));
const methodLabel = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));
const filters = [
  { value: "", label: "Todos" },
  { value: "abertos", label: "Em aberto" },
  { value: "atrasado", label: "Atrasados" },
  { value: "pago", label: "Pagos" },
  { value: "cancelado", label: "Cancelados" },
];

export default async function PagamentosPage({ searchParams }: { searchParams?: { status?: string } }) {
  await requireModule("financeiro");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: payments, error }, { data: clients }, { data: profile }] = await Promise.all([
    s.from("payments").select("id,client_id,client_name,amount,type,method,status,due_date,paid_at").order("due_date", { ascending: false }),
    s.from("clients").select("id,company_name").order("company_name"),
    s.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Erro ao carregar pagamentos" message={error.message} />;
  const canDelete = isKorvixAdmin(profile);
  // Pendente com vencimento passado é exibido (e filtrado) como atrasado.
  const all = (payments ?? []).map((p) => ({ ...p, amount: Number(p.amount), effective: p.status === "pendente" && isPastDay(p.due_date) ? "atrasado" : p.status }));
  const filter = searchParams?.status ?? "";
  const rows = all.filter((p) => !filter || (filter === "abertos" ? ["pendente", "atrasado"].includes(p.effective) : p.effective === filter));
  const sum = (list: typeof all) => list.reduce((acc, p) => acc + p.amount, 0);
  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Cliente", cell: (p) => <div><p className="font-medium">{p.client_name}</p><p className="text-xs text-ink-500 sm:hidden">{formatDate(p.due_date)}</p></div> },
    { header: "Tipo", cell: (p) => typeLabel[p.type] ?? p.type, hideOnMobile: true },
    { header: "Método", cell: (p) => methodLabel[p.method] ?? p.method, hideOnMobile: true },
    { header: "Valor", cell: (p) => formatMoney(p.amount) },
    { header: "Vencimento", cell: (p) => formatDate(p.due_date), hideOnMobile: true },
    { header: "Status", cell: (p) => <StatusBadge status={p.effective} /> },
    { header: "Ações", className: "text-right", cell: (p) => <div className="flex items-center justify-end gap-1">{p.status === "pendente" || p.status === "atrasado" ? <ConfirmPaymentButton id={p.id} /> : null}<PaymentEditButton payment={{ ...p, paid_at: p.paid_at ?? null }} canDelete={canDelete} /></div> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Pagamentos" description="Cobranças, confirmações e sincronização automática de caixa e comissões." actions={<CreatePaymentButton clients={clients ?? []} />} />
      <FinanceSubnav active="/financeiro/pagamentos" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Recebido" value={formatMoney(sum(all.filter((p) => p.effective === "pago")))} />
        <StatCard label="Em aberto" value={formatMoney(sum(all.filter((p) => p.effective === "pendente")))} />
        <StatCard label="Atrasado" value={formatMoney(sum(all.filter((p) => p.effective === "atrasado")))} />
        <StatCard label="Lançamentos" value={String(all.length)} />
      </div>
      <Card>
        <CardHeader title="Todos os pagamentos" subtitle="Novos lançamentos entram como pendentes." />
        <div className="flex gap-1 overflow-x-auto border-b border-ink-100 px-5 py-3">
          {filters.map((f) => (
            <Link key={f.value} href={f.value ? `/financeiro/pagamentos?status=${f.value}` : "/financeiro/pagamentos"} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium", filter === f.value ? "bg-korvix-900 text-white" : "text-ink-600 hover:bg-ink-100")}>
              {f.label}
            </Link>
          ))}
        </div>
        <DataTable columns={columns} rows={rows} emptyLabel={filter ? "Nenhum pagamento neste filtro." : "Nenhum pagamento cadastrado. Use Registrar pagamento."} />
      </Card>
    </div>
  );
}
