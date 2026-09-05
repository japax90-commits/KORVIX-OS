import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ArrowLeft } from "lucide-react";
import {
  clients,
  users,
  contracts,
  payments,
  commissions,
  avDemands,
  agendaEvents,
  tasks,
  formatCurrency,
  formatDate,
} from "@/lib/mock-data";

function ownerName(id: string) {
  return users.find((u) => u.id === id)?.name ?? "—";
}

const tabs = [
  "Dados gerais",
  "Comercial",
  "Contratos",
  "Financeiro",
  "Audiovisual",
  "Agenda",
  "Tarefas",
  "Timeline",
];

export default function ClientDetailPage({ params }: { params: { id: string } }) {
  const client = clients.find((c) => c.id === params.id);
  if (!client) return notFound();

  const clientContracts = contracts.filter((c) => c.clientName === client.companyName);
  const clientPayments = payments.filter((p) => p.clientId === client.id);
  const clientCommissions = commissions.filter((c) => c.clientName === client.companyName);
  const clientAv = avDemands.filter((d) => d.clientName === client.companyName);
  const clientAgenda = agendaEvents.filter((e) => e.relatedTo === client.companyName);
  const clientTasks = tasks.filter((t) => t.relatedEntityLabel === client.companyName);

  return (
    <div className="space-y-6">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
      >
        <ArrowLeft size={15} /> Voltar para Clientes
      </Link>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-ink-900">
              {client.companyName}
            </h2>
            <StatusBadge status={client.operationalStatus} />
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {client.contactName} · {client.phone}
          </p>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <p className="text-xs text-ink-500">Origem comercial</p>
            <p className="font-medium text-ink-900">{ownerName(client.originOwnerId)}</p>
          </div>
          <div>
            <p className="text-xs text-ink-500">Atendimento</p>
            <p className="font-medium text-ink-900">{ownerName(client.accountManagerId)}</p>
          </div>
        </div>
      </div>

      {/* Navegação de abas (visual, tab 1 ativa nesta versão do protótipo) */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="flex gap-1 border-b border-ink-100 pb-px">
          {tabs.map((tab, i) => (
            <button
              key={tab}
              className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-[13px] font-medium ${
                i === 0
                  ? "border-korvix-600 text-korvix-700"
                  : "border-transparent text-ink-500 hover:text-ink-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contratos" subtitle="Histórico completo, ativos e encerrados" />
          <CardBody className="space-y-3">
            {clientContracts.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{c.planName}</p>
                  <p className="text-xs text-ink-500">
                    {formatCurrency(c.value)} · {c.frequency}
                  </p>
                </div>
                <StatusBadge status={c.overdue ? "atrasado" : c.status} />
              </div>
            ))}
            {clientContracts.length === 0 && (
              <p className="text-sm text-ink-500">Nenhum contrato registrado.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Financeiro" subtitle="Pagamentos e comissões vinculados" />
          <CardBody className="space-y-3">
            {clientPayments.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{formatCurrency(p.amount)}</p>
                  <p className="text-xs text-ink-500">
                    {p.type === "primeira_venda" ? "Primeira venda" : "Recorrência"} · vencimento {formatDate(p.dueDate)}
                  </p>
                </div>
                <StatusBadge status={p.status} />
              </div>
            ))}
            {clientCommissions.length > 0 && (
              <div className="mt-2 border-t border-ink-100 pt-3">
                <p className="mb-2 text-xs font-medium text-ink-500">Comissões geradas</p>
                {clientCommissions.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-1">
                    <span className="text-xs text-ink-700">
                      {c.vendorName} · {c.percentage}%
                    </span>
                    <span className="text-xs font-medium text-ink-900">
                      {formatCurrency(c.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Audiovisual" subtitle="Demandas de conteúdo" />
          <CardBody className="space-y-3">
            {clientAv.map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                <div>
                  <p className="text-sm font-medium text-ink-900">{d.demandType}</p>
                  <p className="text-xs text-ink-500">Prazo: {formatDate(d.deadline)}</p>
                </div>
                <StatusBadge status={d.status} />
              </div>
            ))}
            {clientAv.length === 0 && (
              <p className="text-sm text-ink-500">Nenhuma demanda audiovisual.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Agenda e tarefas" subtitle="Compromissos e follow-ups" />
          <CardBody className="space-y-3">
            {clientAgenda.map((e) => (
              <div key={e.id} className="rounded-lg border border-ink-100 p-3">
                <p className="text-sm font-medium text-ink-900">{e.title}</p>
                <p className="text-xs text-ink-500">{formatDate(e.startAt)}</p>
              </div>
            ))}
            {clientTasks.map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-ink-100 p-3">
                <p className="text-sm text-ink-900">{t.title}</p>
                <StatusBadge status={t.status} />
              </div>
            ))}
            {clientAgenda.length === 0 && clientTasks.length === 0 && (
              <p className="text-sm text-ink-500">Nada agendado.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
