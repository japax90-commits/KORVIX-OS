import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { Trophy, TrendingUp, FileCheck } from "lucide-react";
import { opportunities, users, goals, formatCurrency } from "@/lib/mock-data";
import type { Opportunity } from "@/lib/types";

function ownerName(id?: string) {
  return users.find((u) => u.id === id)?.name ?? "—";
}

export default function ComercialPage() {
  const closing = opportunities.filter((o) =>
    ["proposta", "negociacao"].includes(o.stage)
  );
  const won = opportunities.filter((o) => o.stage === "fechado_ganho");
  const lost = opportunities.filter((o) => o.stage === "fechado_perdido");

  const columns: Column<Opportunity>[] = [
    {
      header: "Cliente",
      cell: (o) => (
        <div>
          <p className="font-medium text-ink-900">{o.clientName}</p>
          <p className="text-xs text-ink-500">
            Origem: {ownerName(o.originOwnerId)}
            {o.closingUserId && o.closingUserId !== o.originOwnerId
              ? ` · Fechado por: ${ownerName(o.closingUserId)}`
              : ""}
          </p>
        </div>
      ),
    },
    { header: "Etapa", cell: (o) => <StatusBadge status={o.stage} /> },
    {
      header: "Valor",
      cell: (o) => formatCurrency(o.estimatedValue),
      hideOnMobile: true,
    },
    {
      header: "Probabilidade",
      cell: (o) => `${o.probability}%`,
      hideOnMobile: true,
    },
  ];

  const lossColumns: Column<Opportunity>[] = [
    { header: "Cliente", cell: (o) => o.clientName },
    { header: "Motivo", cell: (o) => o.lossReason ?? "—" },
    {
      header: "Valor perdido",
      cell: (o) => formatCurrency(o.estimatedValue),
      hideOnMobile: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">
          Comercial
        </h2>
        <p className="text-sm text-ink-500">
          Propostas, negociação, fechamento e metas da equipe de vendas.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Em proposta/negociação" value={String(closing.length)} icon={FileCheck} />
        <StatCard label="Vendas fechadas" value={String(won.length)} icon={Trophy} />
        <StatCard label="Perdidas" value={String(lost.length)} icon={TrendingUp} />
        <StatCard
          label="Valor em negociação"
          value={formatCurrency(closing.reduce((a, o) => a + o.estimatedValue, 0))}
        />
      </div>

      <Card>
        <CardHeader
          title="Propostas e negociações em andamento"
          subtitle="A propriedade de origem nunca muda automaticamente com o fechamento"
        />
        <DataTable columns={columns} rows={closing} emptyLabel="Nenhuma proposta em andamento." />
      </Card>

      <Card>
        <CardHeader title="Painel de metas por vendedor" subtitle="Realizado x Meta" />
        <CardBody className="space-y-5">
          {goals.map((g) => {
            const pct = Math.min(100, Math.round((g.achieved / g.target) * 100));
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink-900">
                    {g.vendorName} — {g.metric} ({g.period})
                  </span>
                  <span className="text-ink-500">
                    {g.metric === "faturamento"
                      ? `${formatCurrency(g.achieved)} de ${formatCurrency(g.target)}`
                      : `${g.achieved} de ${g.target}`}
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
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

      <Card>
        <CardHeader title="Oportunidades perdidas" subtitle="Motivo de perda obrigatório" />
        <DataTable columns={lossColumns} rows={lost} emptyLabel="Nenhuma oportunidade perdida no período." />
      </Card>
    </div>
  );
}
