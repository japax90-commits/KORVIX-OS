import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import {
  TrendingUp,
  Wallet,
  Users,
  ClipboardList,
  Target,
} from "lucide-react";
import {
  opportunities,
  clients,
  payments,
  commissions,
  contracts,
  tasks,
  avDemands,
  goals,
  formatCurrency,
} from "@/lib/mock-data";

export default function DashboardPage() {
  const vendas = opportunities.filter((o) => o.stage === "fechado_ganho").length;
  const leadsAbertos = opportunities.filter(
    (o) => !["fechado_ganho", "fechado_perdido"].includes(o.stage)
  ).length;
  const totalOportunidades = opportunities.length;
  const conversao = Math.round((vendas / totalOportunidades) * 100);
  const ticketMedio =
    opportunities
      .filter((o) => o.stage === "fechado_ganho")
      .reduce((a, o) => a + o.estimatedValue, 0) / Math.max(vendas, 1);

  const faturamentoBruto = payments
    .filter((p) => p.status === "pago")
    .reduce((a, p) => a + p.amount, 0);
  const totalComissoes = commissions.reduce((a, c) => a + c.amount, 0);
  const receitaKorvix = faturamentoBruto - totalComissoes;
  const mrr = contracts
    .filter((c) => c.status === "ativo")
    .reduce((a, c) => {
      const monthly =
        c.frequency === "mensal"
          ? c.value
          : c.frequency === "trimestral"
          ? c.value / 3
          : c.frequency === "semestral"
          ? c.value / 6
          : c.frequency === "anual"
          ? c.value / 12
          : c.value;
      return a + monthly;
    }, 0);
  const inadimplencia = payments
    .filter((p) => p.status === "atrasado")
    .reduce((a, p) => a + p.amount, 0);

  const clientesAtivos = clients.filter(
    (c) => c.operationalStatus === "operacao"
  ).length;
  const clientesOnboarding = clients.filter(
    (c) => c.operationalStatus === "onboarding"
  ).length;
  const clientesRenovacao = clients.filter(
    (c) => c.operationalStatus === "renovacao"
  ).length;

  const tarefasAtrasadas = tasks.filter(
    (t) => t.status !== "concluida" && new Date(t.dueDate) < new Date("2026-09-05")
  ).length;
  const tarefasHoje = tasks.filter((t) => t.dueDate === "2026-09-05").length;
  const audiovisualPendente = avDemands.filter(
    (d) => !["PUBLISHED", "CANCELLED"].includes(d.status)
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">
            Korvix Command Center
          </h2>
          <p className="text-sm text-ink-500">
            Como está a Korvix hoje — 5 de setembro de 2026
          </p>
        </div>
        <div className="flex gap-1.5 overflow-x-auto rounded-lg border border-ink-300 bg-white p-1 text-xs">
          {["Hoje", "Semana", "Mês", "Mês anterior"].map((f, i) => (
            <button
              key={f}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 font-medium ${
                i === 2
                  ? "bg-korvix-900 text-white"
                  : "text-ink-500 hover:bg-ink-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Bloco Comercial */}
      <section>
        <SectionLabel icon={TrendingUp} title="Comercial" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Oportunidades abertas" value={String(leadsAbertos)} icon={Target} />
          <StatCard label="Vendas fechadas" value={String(vendas)} helper="no período" />
          <StatCard
            label="Taxa de conversão"
            value={`${conversao}%`}
            trend={{ positive: true, label: "lead → venda" }}
          />
          <StatCard label="Ticket médio" value={formatCurrency(ticketMedio)} />
        </div>
      </section>

      {/* Bloco Financeiro */}
      <section>
        <SectionLabel icon={Wallet} title="Financeiro" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Faturamento bruto" value={formatCurrency(faturamentoBruto)} />
          <StatCard label="Receita Korvix" value={formatCurrency(receitaKorvix)} />
          <StatCard label="MRR" value={formatCurrency(mrr)} helper="recorrente mensal" />
          <StatCard
            label="Inadimplência"
            value={formatCurrency(inadimplencia)}
            trend={inadimplencia > 0 ? { positive: false, label: "atenção" } : undefined}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Bloco Clientes */}
        <Card>
          <CardHeader title="Clientes" subtitle="Ciclo de vida operacional" />
          <CardBody className="space-y-3">
            <MiniStat label="Ativos em operação" value={clientesAtivos} tone="success" />
            <MiniStat label="Em onboarding" value={clientesOnboarding} tone="info" />
            <MiniStat label="Em renovação" value={clientesRenovacao} tone="warning" />
            <MiniStat label="Churn no período" value={0} tone="neutral" />
          </CardBody>
        </Card>

        {/* Bloco Operação */}
        <Card>
          <CardHeader
            icon={<ClipboardList size={16} />}
            title="Operação"
            subtitle="Tarefas e audiovisual"
          />
          <CardBody className="space-y-3">
            <MiniStat label="Tarefas atrasadas" value={tarefasAtrasadas} tone="danger" />
            <MiniStat label="Tarefas de hoje" value={tarefasHoje} tone="warning" />
            <MiniStat label="Audiovisual pendente" value={audiovisualPendente} tone="info" />
          </CardBody>
        </Card>

        {/* Bloco Equipe */}
        <Card>
          <CardHeader
            icon={<Users size={16} />}
            title="Equipe"
            subtitle="Realizado x Meta"
          />
          <CardBody className="space-y-4">
            {goals.map((g) => {
              const pct = Math.min(100, Math.round((g.achieved / g.target) * 100));
              return (
                <div key={g.id}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink-900">
                      {g.vendorName} · {g.metric}
                    </span>
                    <span className="text-ink-500">
                      {g.metric === "faturamento"
                        ? `${formatCurrency(g.achieved)} / ${formatCurrency(g.target)}`
                        : `${g.achieved} / ${g.target}`}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                    <div
                      className="h-full rounded-full bg-korvix-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Últimas oportunidades no funil" subtitle="Visão consolidada do CRM" />
        <CardBody className="!p-0">
          <div className="divide-y divide-ink-100">
            {opportunities.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ink-900">
                    {o.clientName}
                  </p>
                  <p className="text-xs text-ink-500">
                    {formatCurrency(o.estimatedValue)}
                  </p>
                </div>
                <StatusBadge status={o.stage} />
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon size={15} />
      <h3 className="text-sm font-semibold text-ink-900">{title}</h3>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "info" | "neutral";
}) {
  const toneClass = {
    success: "text-success",
    warning: "text-warning",
    danger: "text-danger",
    info: "text-korvix-600",
    neutral: "text-ink-700",
  }[tone];
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-ink-700">{label}</span>
      <span className={`text-lg font-semibold ${toneClass}`}>{value}</span>
    </div>
  );
}
