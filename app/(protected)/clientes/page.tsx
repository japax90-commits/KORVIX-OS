import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { ChevronRight, Users } from "lucide-react";
import { clients, users, formatCurrency } from "@/lib/mock-data";
import type { Client } from "@/lib/types";

function ownerName(id: string) {
  return users.find((u) => u.id === id)?.name ?? "—";
}

export default function ClientesPage() {
  const counts = {
    onboarding: clients.filter((c) => c.operationalStatus === "onboarding").length,
    operacao: clients.filter((c) => c.operationalStatus === "operacao").length,
    renovacao: clients.filter((c) => c.operationalStatus === "renovacao").length,
    pausado: clients.filter((c) => c.operationalStatus === "pausado").length,
  };

  const columns: Column<Client>[] = [
    {
      header: "Cliente",
      cell: (c) => (
        <div>
          <p className="font-medium text-ink-900">{c.companyName}</p>
          <p className="text-xs text-ink-500">{c.contactName}</p>
        </div>
      ),
    },
    { header: "Status", cell: (c) => <StatusBadge status={c.operationalStatus} /> },
    {
      header: "Plano",
      cell: (c) => c.activePlanName ?? "—",
      hideOnMobile: true,
    },
    {
      header: "Valor",
      cell: (c) => (c.activeContractValue ? formatCurrency(c.activeContractValue) : "—"),
      hideOnMobile: true,
    },
    {
      header: "Origem / Atendimento",
      cell: (c) => (
        <span className="text-xs text-ink-500">
          {ownerName(c.originOwnerId)} / {ownerName(c.accountManagerId)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      header: "",
      cell: (c) => (
        <Link
          href={`/clientes/${c.id}`}
          className="flex items-center gap-1 text-xs font-medium text-korvix-600 hover:text-korvix-700"
        >
          Ver ficha <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">
          Clientes
        </h2>
        <p className="text-sm text-ink-500">
          Visão 360º e acompanhamento do ciclo de vida operacional.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Em onboarding" value={String(counts.onboarding)} icon={Users} />
        <StatCard label="Em operação" value={String(counts.operacao)} />
        <StatCard label="Em renovação" value={String(counts.renovacao)} />
        <StatCard label="Pausados" value={String(counts.pausado)} />
      </div>

      <Card>
        <CardHeader title="Todos os clientes" subtitle="Filtros: status, nicho, vendedor de origem" />
        <DataTable columns={columns} rows={clients} />
      </Card>
    </div>
  );
}
