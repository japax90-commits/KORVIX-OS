import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { FinanceSubnav } from "../FinanceSubnav";
import { createClient } from "@/lib/supabase/server";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { CreateCashMovementButton, CashMovementActions, CASH_CATEGORIES } from "@/components/operations/Cash";
import { calculateCashBalance, calculateCashEntries, calculateCashExits } from "@/lib/finance/calculations";
import { formatDate, formatMoney } from "@/lib/format";

const categoryLabel = Object.fromEntries(CASH_CATEGORIES.map((c) => [c.value, c.label]));

export default async function CaixaPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data, error }, { data: profile }] = await Promise.all([
    s.from("cash_movements").select("id,category,direction,amount,description,movement_date,created_at,source_type").order("movement_date", { ascending: false }).order("created_at", { ascending: false }),
    s.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Erro ao carregar o caixa" message={error.message} />;
  const rows = data ?? [];
  const canDelete = isKorvixAdmin(profile);
  return (
    <div className="space-y-6">
      <PageHeader title="Caixa" description="Entradas e saídas categorizadas. Pagamentos confirmados e comissões entram automaticamente." actions={<CreateCashMovementButton userId={user.id} />} />
      <FinanceSubnav active="/financeiro/caixa" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Saldo em caixa" value={formatMoney(calculateCashBalance(rows))} />
        <StatCard label="Entradas" value={formatMoney(calculateCashEntries(rows))} />
        <StatCard label="Saídas" value={formatMoney(calculateCashExits(rows))} />
      </div>
      <Card>
        <CardHeader title="Movimentos de caixa" subtitle={`${rows.length} lançamento(s)`} />
        <CardBody className="!p-0">
          <ul className="divide-y divide-ink-100">
            {rows.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">{m.description}</p>
                  <p className="text-xs text-ink-500">{categoryLabel[m.category] ?? m.category} · {formatDate(m.movement_date)}{m.source_type ? " · automático" : ""}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:gap-4">
                  <span className={`text-sm font-semibold tabular-nums ${m.direction === "entrada" ? "text-success" : "text-danger"}`}>{m.direction === "entrada" ? "+" : "−"} {formatMoney(m.amount)}</span>
                  <CashMovementActions movement={{ ...m, amount: Number(m.amount) }} canDelete={canDelete} />
                </div>
              </li>
            ))}
          </ul>
          {rows.length === 0 && <p className="p-5 text-sm text-ink-500">Nenhum movimento registrado. Use Lançar movimento para começar.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
