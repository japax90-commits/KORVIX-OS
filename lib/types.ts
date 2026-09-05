// Tipos derivados da KORVIX OS — Especificação Técnica Master V2.0
// Este arquivo é a base para o futuro schema.prisma (seção 26 do documento).
// Protótipo: dados mockados em lib/mock-data.ts implementam estas mesmas formas,
// para que a migração para Prisma/PostgreSQL não exija remodelar as telas.

export type AccessLevel = "none" | "view" | "edit" | "admin";
export type DataScope = "own" | "all";

export interface ModuleAccess {
  module: string;
  level: AccessLevel;
  scope: DataScope;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "ceo" | "cofundador" | "vendedor" | "audiovisual" | "tecnico";
  active: boolean;
  avatarInitials: string;
  moduleAccess: ModuleAccess[];
}

export type OpportunityStage =
  | "lead"
  | "qualificacao"
  | "reuniao"
  | "diagnostico"
  | "proposta"
  | "negociacao"
  | "fechado_ganho"
  | "fechado_perdido";

export type OpportunityChannel =
  | "whatsapp"
  | "ligacao"
  | "instagram"
  | "trafego_pago"
  | "indicacao"
  | "parceiro"
  | "visita_presencial"
  | "outro";

export interface Opportunity {
  id: string;
  clientName: string;
  originOwnerId: string; // dono da origem comercial — nunca muda automaticamente
  closingUserId?: string; // quem fechou, pode ser diferente da origem
  channel: OpportunityChannel;
  stage: OpportunityStage;
  priority: "baixa" | "media" | "alta" | "urgente";
  estimatedValue: number;
  probability: number;
  entryDate: string;
  lastInteractionAt: string;
  nextAction?: string;
  nextFollowupAt?: string;
  lossReason?: string;
}

export type ClientOperationalStatus =
  | "onboarding"
  | "operacao"
  | "renovacao"
  | "pausado"
  | "encerrado";

export interface Client {
  id: string;
  companyName: string;
  contactName: string;
  phone: string;
  niche: string;
  originOwnerId: string;
  accountManagerId: string;
  operationalStatus: ClientOperationalStatus;
  activeContractValue?: number;
  activePlanName?: string;
  entryDate: string;
}

export type PaymentStatus = "pendente" | "pago" | "atrasado" | "cancelado";
export type PaymentType = "primeira_venda" | "recorrencia" | "avulso";

export interface Payment {
  id: string;
  clientId: string;
  clientName: string;
  amount: number;
  type: PaymentType;
  method: "pix" | "credito" | "debito" | "boleto" | "dinheiro";
  status: PaymentStatus;
  dueDate: string;
  paidAt?: string;
}

export type CommissionStatus = "liberada" | "paga" | "cancelada";

export interface Commission {
  id: string;
  paymentId: string;
  vendorId: string;
  vendorName: string;
  amount: number;
  percentage: number;
  status: CommissionStatus;
  clientName: string;
  createdAt: string;
}

export type ReferralStatus = "pendente" | "aprovada" | "paga" | "cancelada";

export interface ReferralCommission {
  id: string;
  clientName: string;
  referrerName: string;
  commissionType: "fixo" | "percentual";
  commissionValue: number;
  status: ReferralStatus;
  negotiatedBy: string;
}

export type ContractStatus = "ativo" | "pausado" | "cancelado" | "encerrado";

export interface Contract {
  id: string;
  clientName: string;
  planName: string;
  value: number;
  frequency: "mensal" | "trimestral" | "semestral" | "anual" | "personalizado";
  status: ContractStatus;
  startDate: string;
  nextBillingDate?: string;
  overdue: boolean;
}

export type AvDemandStatus =
  | "DEMAND"
  | "SCHEDULED"
  | "VISIT"
  | "CAPTURE"
  | "TRANSFER"
  | "EDITING"
  | "INTERNAL_REVIEW"
  | "CLIENT_APPROVAL"
  | "FINALIZED"
  | "PUBLISHED"
  | "CANCELLED";

export interface AvDemand {
  id: string;
  clientName: string;
  demandType: "video" | "foto" | "making_of" | "comercial" | "institucional";
  responsibleName: string;
  status: AvDemandStatus;
  deadline: string;
  quantity: number;
}

export type AgendaEventType =
  | "reuniao"
  | "visita"
  | "gravacao"
  | "tarefa"
  | "compromisso_interno";

export interface AgendaEvent {
  id: string;
  title: string;
  type: AgendaEventType;
  startAt: string;
  endAt?: string;
  responsibleName: string;
  status: "agendado" | "confirmado" | "realizado" | "cancelado";
  relatedTo?: string;
}

export type TaskStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";

export interface TaskItem {
  id: string;
  title: string;
  assignedToName: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  status: TaskStatus;
  dueDate: string;
  relatedEntityType:
    | "lead_oportunidade"
    | "cliente"
    | "contrato"
    | "audiovisual"
    | "agenda"
    | "usuario";
  relatedEntityLabel: string;
}

export interface Goal {
  id: string;
  vendorId: string;
  vendorName: string;
  metric: "vendas" | "faturamento" | "reunioes" | "propostas";
  period: "diaria" | "semanal" | "mensal";
  target: number;
  achieved: number;
}

export interface AuditLogEntry {
  id: string;
  userName: string;
  action: string;
  module: string;
  entity: string;
  description: string;
  createdAt: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  createdAt: string;
}
