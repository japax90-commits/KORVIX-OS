import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Plus, Phone, Instagram, Radio, Users2, Handshake } from "lucide-react";
import { opportunities, users, formatCurrency, formatDate } from "@/lib/mock-data";
import type { OpportunityStage } from "@/lib/types";

const stages: { key: OpportunityStage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "reuniao", label: "Reunião" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
];

const channelIcon: Record<string, React.ElementType> = {

  whatsapp: Phone,
  ligacao: Phone,
  instagram: Instagram,
  trafego_pago: Radio,
  indicacao: Users2,
  parceiro: Handshake,
  visita_presencial: Users2,
  outro: Users2,
};

function ownerName(id: string) {
  return users.find((u) => u.id === id)?.name ?? "—";
}

export default function CrmPage() {
  const open = opportunities.filter(
    (o) => !["fechado_ganho", "fechado_perdido"].includes(o.stage)
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">
            CRM — Funil de vendas
          </h2>
          <p className="text-sm text-ink-500">
            Leads e oportunidades, do primeiro contato à negociação.
          </p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} />
          Nova oportunidade
        </button>
      </div>

      {/* Funil Kanban — scroll horizontal em telas menores */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-3" style={{ minWidth: "1080px" }}>
          {stages.map((stage) => {
            const items = open.filter((o) => o.stage === stage.key);
            const total = items.reduce((a, o) => a + o.estimatedValue, 0);
            return (
              <div key={stage.key} className="w-[240px] shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[13px] font-semibold text-ink-900">
                    {stage.label}
                  </p>
                  <span className="text-xs text-ink-500">{items.length}</span>
                </div>
                <p className="mb-2 px-1 text-[11px] text-ink-500">
                  {formatCurrency(total)}
                </p>
                <div className="space-y-2">
                  {items.map((o) => {
                    const Icon = channelIcon[o.channel] ?? Users2;
                    return (
                      <div
                        key={o.id}
                        className="cursor-pointer rounded-lg border border-ink-100 bg-white p-3 shadow-sm hover:border-korvix-300"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium text-ink-900">
                            {o.clientName}
                          </p>
                          <Icon size={13} />
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {formatCurrency(o.estimatedValue)}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-ink-500">
                            {ownerName(o.originOwnerId)}
                          </span>
                          <Badge
                            tone={
                              o.priority === "urgente"
                                ? "danger"
                                : o.priority === "alta"
                                ? "warning"
                                : "neutral"
                            }
                          >
                            {o.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-ink-300 p-4 text-center text-[11px] text-ink-500">
                      Nenhuma oportunidade
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader
          title="Detalhamento das oportunidades"
          subtitle="Origem comercial, próximo passo e follow-up agendado"
        />
        <CardBody className="!p-0">
          <div className="divide-y divide-ink-100">
            {open.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap">
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-medium text-ink-900">{o.clientName}</p>
                  <p className="text-xs text-ink-500">
                    Origem: {ownerName(o.originOwnerId)}
                  </p>
                </div>
                <div className="min-w-[140px]">
                  <StatusBadge status={o.stage} />
                </div>
                <div className="min-w-[110px] text-sm text-ink-700">
                  {formatCurrency(o.estimatedValue)}
                </div>
                <div className="min-w-[180px] flex-1 text-xs text-ink-500">
                  {o.nextAction ?? "—"}
                </div>
                <div className="min-w-[110px] text-xs text-ink-500">
                  {o.nextFollowupAt ? `Follow-up: ${formatDate(o.nextFollowupAt)}` : "—"}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
