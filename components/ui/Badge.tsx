import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "danger" | "info" | "brand";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-ink-100 text-ink-700",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
  info: "bg-korvix-100 text-korvix-700",
  brand: "bg-korvix-800 text-korvix-100",
};

// Mapeamento de status de negócio → tom visual, centralizado aqui para que
// nenhuma tela decida cor de status por conta própria (evita divergência).
const statusToneMap: Record<string, Tone> = {
  // Oportunidades
  lead: "neutral",
  qualificacao: "info",
  reuniao: "info",
  diagnostico: "info",
  proposta: "warning",
  negociacao: "warning",
  fechado_ganho: "success",
  fechado_perdido: "danger",
  // Pagamentos / Contratos
  pendente: "warning",
  pago: "success",
  atrasado: "danger",
  cancelado: "danger",
  ativo: "success",
  pausado: "warning",
  encerrado: "neutral",
  // Comissões / Indicações
  liberada: "info",
  paga: "success",
  aprovada: "info",
  // Tarefas
  em_andamento: "info",
  concluida: "success",
  // Clientes
  onboarding: "info",
  operacao: "success",
  renovacao: "warning",
  // Audiovisual
  DEMAND: "neutral",
  SCHEDULED: "info",
  VISIT: "info",
  CAPTURE: "info",
  TRANSFER: "info",
  EDITING: "warning",
  INTERNAL_REVIEW: "warning",
  CLIENT_APPROVAL: "warning",
  FINALIZED: "success",
  PUBLISHED: "success",
  CANCELLED: "danger",
};

const statusLabelMap: Record<string, string> = {
  lead: "Lead",
  qualificacao: "Qualificação",
  reuniao: "Reunião",
  diagnostico: "Diagnóstico",
  proposta: "Proposta",
  negociacao: "Negociação",
  fechado_ganho: "Fechado (ganho)",
  fechado_perdido: "Fechado (perdido)",
  pendente: "Pendente",
  pago: "Pago",
  atrasado: "Atrasado",
  cancelado: "Cancelado",
  ativo: "Ativo",
  pausado: "Pausado",
  encerrado: "Encerrado",
  liberada: "Liberada",
  paga: "Paga",
  aprovada: "Aprovada",
  em_andamento: "Em andamento",
  concluida: "Concluída",
  onboarding: "Onboarding",
  operacao: "Em operação",
  renovacao: "Renovação",
  DEMAND: "Demanda",
  SCHEDULED: "Agendado",
  VISIT: "Visita",
  CAPTURE: "Captação",
  TRANSFER: "Transferência",
  EDITING: "Edição",
  INTERNAL_REVIEW: "Revisão interna",
  CLIENT_APPROVAL: "Aprovação do cliente",
  FINALIZED: "Finalizado",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
};

export function StatusBadge({ status }: { status: string }) {
  const tone = statusToneMap[status] ?? "neutral";
  const label = statusLabelMap[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: Tone;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone]
      )}
    >
      {children}
    </span>
  );
}
