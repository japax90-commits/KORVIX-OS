import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Plus, Phone, Instagram, Radio, Users2, Handshake } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import type { OpportunityChannel, OpportunityStage } from "@/lib/types";
import type { ElementType } from "react";

const stages: { key: OpportunityStage; label: string }[] = [
  { key: "lead", label: "Lead" },
  { key: "qualificacao", label: "Qualificação" },
  { key: "reuniao", label: "Reunião" },
  { key: "diagnostico", label: "Diagnóstico" },
  { key: "proposta", label: "Proposta" },
  { key: "negociacao", label: "Negociação" },
];

const channelIcon: Record<OpportunityChannel, ElementType> = {
  whatsapp: Phone,
  ligacao: Phone,
  instagram: Instagram,
  trafego_pago: Radio,
  indicacao: Users2,
  parceiro: Handshake,
  visita_presencial: Users2,
  outro: Users2,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(`${value}T12:00:00`));
}

export default async function CrmPage() {
  const supabase = await createClient();
  const [opportunitiesResult, usersResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select(
        "id, client_name, origin_owner_id, closing_user_id, channel, stage, priority, estimated_value, probability, entry_date, last_interaction_at, next_action, next_followup_at, loss_reason",
      )
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id, name, active").eq("active", true),
  ]);

  if (opportunitiesResult.error || usersResult.error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        Não foi possível carregar o CRM. Verifique a conexão com o Supabase e tente novamente.
      </div>
    );
  }

  const users = new Map((usersResult.data ?? []).map((user) => [user.id, user.name]));
  const opportunities = (opportunitiesResult.data ?? []).map((o) => ({
    id: o.id,
    clientName: o.client_name,
    originOwnerId: o.origin_owner_id,
    closingUserId: o.closing_user_id ?? undefined,
    channel: o.channel as OpportunityChannel,
    stage: o.stage as OpportunityStage,
    priority: o.priority as "baixa" | "media" | "alta" | "urgente",
    estimatedValue: Number(o.estimated_value ?? 0),
    probability: Number(o.probability ?? 0),
    entryDate: o.entry_date,
    lastInteractionAt: o.last_interaction_at,
    nextAction: o.next_action ?? undefined,
    nextFollowupAt: o.next_followup_at ?? undefined,
    lossReason: o.loss_reason ?? undefined,
  }));

  const open = opportunities.filter(
    (o) => !["fechado_ganho", "fechado_perdido"].includes(o.stage),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">CRM — Funil de vendas</h2>
          <p className="text-sm text-ink-500">Leads e oportunidades, do primeiro contato à negociação.</p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} />
          Nova oportunidade
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-3" style={{ minWidth: "1080px" }}>
          {stages.map((stage) => {
            const items = open.filter((o) => o.stage === stage.key);
            const total = items.reduce((sum, o) => sum + o.estimatedValue, 0);
            return (
              <div key={stage.key} className="w-[240px] shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[13px] font-semibold text-ink-900">{stage.label}</p>
                  <span className="text-xs text-ink-500">{items.length}</span>
                </div>
                <p className="mb-2 px-1 text-[11px] text-ink-500">{formatCurrency(total)}</p>
                <div className="space-y-2">
                  {items.map((o) => {
                    const Icon = channelIcon[o.channel] ?? Users2;
                    return (
                      <div key={o.id} className="cursor-pointer rounded-lg border border-ink-100 bg-white p-3 shadow-sm hover:border-korvix-300">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[13px] font-medium text-ink-900">{o.clientName}</p>
                          <Icon size={13} />
                        </div>
                        <p className="mt-1 text-xs text-ink-500">{formatCurrency(o.estimatedValue)}</p>
                        <div className="mt-2.5 flex items-center justify-between">
                          <span className="text-[11px] text-ink-500">{users.get(o.originOwnerId) ?? "—"}</span>
                          <Badge tone={o.priority === "urgente" ? "danger" : o.priority === "alta" ? "warning" : "neutral"}>
                            {o.priority}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-ink-300 p-4 text-center text-[11px] text-ink-500">Nenhuma oportunidade</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader title="Detalhamento das oportunidades" subtitle="Origem comercial, próximo passo e follow-up agendado" />
        <CardBody className="!p-0">
          <div className="divide-y divide-ink-100">
            {open.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 sm:flex-nowrap">
                <div className="min-w-[160px] flex-1">
                  <p className="text-sm font-medium text-ink-900">{o.clientName}</p>
                  <p className="text-xs text-ink-500">Origem: {users.get(o.originOwnerId) ?? "—"}</p>
                </div>
                <div className="min-w-[140px]"><StatusBadge status={o.stage} /></div>
                <div className="min-w-[110px] text-sm text-ink-700">{formatCurrency(o.estimatedValue)}</div>
                <div className="min-w-[180px] flex-1 text-xs text-ink-500">{o.nextAction ?? "—"}</div>
                <div className="min-w-[110px] text-xs text-ink-500">{o.nextFollowupAt ? `Follow-up: ${formatDate(o.nextFollowupAt)}` : "—"}</div>
              </div>
            ))}
            {open.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-ink-500">Nenhuma oportunidade aberta no momento.</div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
