import type {
  User,
  Opportunity,
  Client,
  Payment,
  Commission,
  ReferralCommission,
  Contract,
  AvDemand,
  AgendaEvent,
  TaskItem,
  Goal,
  AuditLogEntry,
  NotificationItem,
} from "./types";

// ---------------------------------------------------------------------------
// USUÁRIOS — seed conforme seção 5 e 8 da Especificação Técnica Master V2.0
// ---------------------------------------------------------------------------
export const users: User[] = [
  {
    id: "u_gabriel",
    name: "Gabriel",
    email: "gabriel@korvixdigital.com",
    role: "ceo",
    active: true,
    avatarInitials: "GA",
    moduleAccess: [
      { module: "dashboard", level: "admin", scope: "all" },
      { module: "crm", level: "admin", scope: "all" },
      { module: "comercial", level: "admin", scope: "all" },
      { module: "clientes", level: "admin", scope: "all" },
      { module: "financeiro", level: "admin", scope: "all" },
      { module: "audiovisual", level: "admin", scope: "all" },
      { module: "agenda", level: "admin", scope: "all" },
      { module: "equipe", level: "admin", scope: "all" },
    ],
  },
  {
    id: "u_mateus",
    name: "Mateus",
    email: "mateus@korvixdigital.com",
    role: "cofundador",
    active: true,
    avatarInitials: "MA",
    moduleAccess: [
      { module: "dashboard", level: "view", scope: "all" },
      { module: "financeiro", level: "admin", scope: "all" },
      { module: "equipe", level: "admin", scope: "all" },
      { module: "crm", level: "view", scope: "all" },
      { module: "comercial", level: "view", scope: "all" },
      { module: "clientes", level: "view", scope: "all" },
    ],
  },
  {
    id: "u_douglas",
    name: "Douglas",
    email: "douglas@korvixdigital.com",
    role: "vendedor",
    active: true,
    avatarInitials: "DO",
    moduleAccess: [
      { module: "dashboard", level: "view", scope: "own" },
      { module: "comercial", level: "edit", scope: "own" },
      { module: "crm", level: "edit", scope: "own" },
      { module: "clientes", level: "view", scope: "own" },
    ],
  },
  {
    id: "u_matias",
    name: "Matias",
    email: "matias@korvixdigital.com",
    role: "audiovisual",
    active: true,
    avatarInitials: "MT",
    moduleAccess: [
      { module: "audiovisual", level: "edit", scope: "own" },
      { module: "agenda", level: "edit", scope: "own" },
      { module: "clientes", level: "view", scope: "all" },
    ],
  },
  {
    id: "u_pablo",
    name: "Pablo",
    email: "pablo@korvixdigital.com",
    role: "tecnico",
    active: true,
    avatarInitials: "PA",
    moduleAccess: [
      { module: "equipe", level: "admin", scope: "all" },
      { module: "financeiro", level: "view", scope: "all" },
    ],
  },
];

export const currentUser = users[0]; // Gabriel — usuário de demonstração logado

// ---------------------------------------------------------------------------
// CRM / COMERCIAL — Oportunidades (seção 11 e 12)
// ---------------------------------------------------------------------------
export const opportunities: Opportunity[] = [
  {
    id: "op_1",
    clientName: "AutoPrime Veículos",
    originOwnerId: "u_douglas",
    channel: "indicacao",
    stage: "lead",
    priority: "media",
    estimatedValue: 1500,
    probability: 20,
    entryDate: "2026-08-28",
    lastInteractionAt: "2026-09-02",
    nextAction: "Ligar para agendar reunião",
    nextFollowupAt: "2026-09-08",
  },
  {
    id: "op_2",
    clientName: "Seminovos Bela Vista",
    originOwnerId: "u_douglas",
    channel: "trafego_pago",
    stage: "qualificacao",
    priority: "alta",
    estimatedValue: 1800,
    probability: 35,
    entryDate: "2026-08-20",
    lastInteractionAt: "2026-09-03",
    nextAction: "Enviar case de outra concessionária",
    nextFollowupAt: "2026-09-06",
  },
  {
    id: "op_3",
    clientName: "Moto Center Sul",
    originOwnerId: "u_douglas",
    channel: "instagram",
    stage: "reuniao",
    priority: "media",
    estimatedValue: 1200,
    probability: 40,
    entryDate: "2026-08-15",
    lastInteractionAt: "2026-09-01",
    nextAction: "Enviar proposta comercial",
  },
  {
    id: "op_4",
    clientName: "Garagem Premium Multimarcas",
    originOwnerId: "u_gabriel",
    channel: "parceiro",
    stage: "diagnostico",
    priority: "alta",
    estimatedValue: 2200,
    probability: 55,
    entryDate: "2026-08-10",
    lastInteractionAt: "2026-09-04",
    nextAction: "Reunião de diagnóstico com sócios",
  },
  {
    id: "op_5",
    clientName: "Carros & Cia Seminovos",
    originOwnerId: "u_douglas",
    channel: "whatsapp",
    stage: "proposta",
    priority: "alta",
    estimatedValue: 1500,
    probability: 65,
    entryDate: "2026-08-05",
    lastInteractionAt: "2026-09-03",
    nextAction: "Aguardar retorno da proposta enviada",
  },
  {
    id: "op_6",
    clientName: "Auto Show Veículos",
    originOwnerId: "u_gabriel",
    channel: "visita_presencial",
    stage: "negociacao",
    priority: "urgente",
    estimatedValue: 3000,
    probability: 75,
    entryDate: "2026-07-28",
    lastInteractionAt: "2026-09-04",
    nextAction: "Ajustar condições de pagamento",
  },
  {
    id: "op_7",
    clientName: "Via Motors",
    originOwnerId: "u_douglas",
    channel: "indicacao",
    stage: "fechado_ganho",
    priority: "media",
    estimatedValue: 1500,
    probability: 100,
    entryDate: "2026-07-10",
    lastInteractionAt: "2026-08-15",
    closingUserId: "u_gabriel",
  },
  {
    id: "op_8",
    clientName: "Rota Norte Veículos",
    originOwnerId: "u_douglas",
    channel: "trafego_pago",
    stage: "fechado_perdido",
    priority: "baixa",
    estimatedValue: 900,
    probability: 0,
    entryDate: "2026-07-01",
    lastInteractionAt: "2026-08-01",
    lossReason: "preco",
  },
];

// ---------------------------------------------------------------------------
// CLIENTES — Ficha 360º (seção 13)
// ---------------------------------------------------------------------------
export const clients: Client[] = [
  {
    id: "cl_1",
    companyName: "Via Motors",
    contactName: "Ricardo Alves",
    phone: "(11) 98888-1010",
    niche: "revenda_seminovos",
    originOwnerId: "u_douglas",
    accountManagerId: "u_gabriel",
    operationalStatus: "onboarding",
    activeContractValue: 1500,
    activePlanName: "Plano Essencial Mensal",
    entryDate: "2026-08-16",
  },
  {
    id: "cl_2",
    companyName: "Auto Excelência",
    contactName: "Fernanda Costa",
    phone: "(11) 97777-2020",
    niche: "concessionaria",
    originOwnerId: "u_gabriel",
    accountManagerId: "u_gabriel",
    operationalStatus: "operacao",
    activeContractValue: 2800,
    activePlanName: "Plano Performance Trimestral",
    entryDate: "2026-05-02",
  },
  {
    id: "cl_3",
    companyName: "Moto Rápida Peças",
    contactName: "Jonas Prado",
    phone: "(11) 96666-3030",
    niche: "pecas",
    originOwnerId: "u_douglas",
    accountManagerId: "u_douglas",
    operationalStatus: "operacao",
    activeContractValue: 1200,
    activePlanName: "Plano Essencial Mensal",
    entryDate: "2026-03-11",
  },
  {
    id: "cl_4",
    companyName: "Grupo Vantage Veículos",
    contactName: "Patrícia Menezes",
    phone: "(11) 95555-4040",
    niche: "concessionaria",
    originOwnerId: "u_gabriel",
    accountManagerId: "u_mateus",
    operationalStatus: "renovacao",
    activeContractValue: 3500,
    activePlanName: "Plano Performance Anual",
    entryDate: "2025-09-20",
  },
  {
    id: "cl_5",
    companyName: "Seminovos Bom Preço",
    contactName: "Carlos Eduardo",
    phone: "(11) 94444-5050",
    niche: "revenda_seminovos",
    originOwnerId: "u_douglas",
    accountManagerId: "u_douglas",
    operationalStatus: "pausado",
    activeContractValue: 1500,
    activePlanName: "Plano Essencial Mensal",
    entryDate: "2026-01-14",
  },
];

// ---------------------------------------------------------------------------
// FINANCEIRO — Pagamentos, Comissões, Indicações, Contratos (seções 15–19)
// ---------------------------------------------------------------------------
export const contracts: Contract[] = [
  {
    id: "ct_1",
    clientName: "Via Motors",
    planName: "Plano Essencial Mensal",
    value: 1500,
    frequency: "mensal",
    status: "ativo",
    startDate: "2026-08-16",
    nextBillingDate: "2026-09-16",
    overdue: false,
  },
  {
    id: "ct_2",
    clientName: "Auto Excelência",
    planName: "Plano Performance Trimestral",
    value: 2800,
    frequency: "trimestral",
    status: "ativo",
    startDate: "2026-05-02",
    nextBillingDate: "2026-11-02",
    overdue: false,
  },
  {
    id: "ct_3",
    clientName: "Moto Rápida Peças",
    planName: "Plano Essencial Mensal",
    value: 1200,
    frequency: "mensal",
    status: "ativo",
    startDate: "2026-03-11",
    nextBillingDate: "2026-09-11",
    overdue: true,
  },
  {
    id: "ct_4",
    clientName: "Grupo Vantage Veículos",
    planName: "Plano Performance Anual",
    value: 3500,
    frequency: "anual",
    status: "ativo",
    startDate: "2025-09-20",
    nextBillingDate: "2026-09-20",
    overdue: false,
  },
  {
    id: "ct_5",
    clientName: "Seminovos Bom Preço",
    planName: "Plano Essencial Mensal",
    value: 1500,
    frequency: "mensal",
    status: "pausado",
    startDate: "2026-01-14",
    overdue: false,
  },
];

export const payments: Payment[] = [
  {
    id: "pay_1",
    clientId: "cl_1",
    clientName: "Via Motors",
    amount: 1500,
    type: "primeira_venda",
    method: "pix",
    status: "pago",
    dueDate: "2026-08-16",
    paidAt: "2026-08-16",
  },
  {
    id: "pay_2",
    clientId: "cl_2",
    clientName: "Auto Excelência",
    amount: 2800,
    type: "recorrencia",
    method: "credito",
    status: "pago",
    dueDate: "2026-08-02",
    paidAt: "2026-08-03",
  },
  {
    id: "pay_3",
    clientId: "cl_3",
    clientName: "Moto Rápida Peças",
    amount: 1200,
    type: "recorrencia",
    method: "pix",
    status: "atrasado",
    dueDate: "2026-08-11",
  },
  {
    id: "pay_4",
    clientId: "cl_4",
    clientName: "Grupo Vantage Veículos",
    amount: 3500,
    type: "recorrencia",
    method: "boleto",
    status: "pendente",
    dueDate: "2026-09-20",
  },
  {
    id: "pay_5",
    clientId: "cl_5",
    clientName: "Seminovos Bom Preço",
    amount: 1500,
    type: "recorrencia",
    method: "pix",
    status: "cancelado",
    dueDate: "2026-08-14",
  },
];

export const commissions: Commission[] = [
  {
    id: "com_1",
    paymentId: "pay_1",
    vendorId: "u_douglas",
    vendorName: "Douglas",
    amount: 750,
    percentage: 50,
    status: "liberada",
    clientName: "Via Motors",
    createdAt: "2026-08-16",
  },
  {
    id: "com_2",
    paymentId: "pay_2",
    vendorId: "u_gabriel",
    vendorName: "Gabriel",
    amount: 280,
    percentage: 10,
    status: "paga",
    clientName: "Auto Excelência",
    createdAt: "2026-08-03",
  },
];

export const referralCommissions: ReferralCommission[] = [
  {
    id: "ref_1",
    clientName: "Via Motors",
    referrerName: "João (indicador externo)",
    commissionType: "fixo",
    commissionValue: 150,
    status: "aprovada",
    negotiatedBy: "Gabriel",
  },
  {
    id: "ref_2",
    clientName: "Auto Excelência",
    referrerName: "Mateus",
    commissionType: "percentual",
    commissionValue: 5,
    status: "paga",
    negotiatedBy: "Gabriel",
  },
];

// ---------------------------------------------------------------------------
// AUDIOVISUAL — Pipeline de 11 estágios (seção 21)
// ---------------------------------------------------------------------------
export const avDemands: AvDemand[] = [
  { id: "av_1", clientName: "Via Motors", demandType: "video", responsibleName: "Matias", status: "DEMAND", deadline: "2026-09-20", quantity: 4 },
  { id: "av_2", clientName: "Auto Excelência", demandType: "foto", responsibleName: "Matias", status: "SCHEDULED", deadline: "2026-09-10", quantity: 20 },
  { id: "av_3", clientName: "Moto Rápida Peças", demandType: "comercial", responsibleName: "Matias", status: "CAPTURE", deadline: "2026-09-08", quantity: 2 },
  { id: "av_4", clientName: "Grupo Vantage Veículos", demandType: "video", responsibleName: "Matias", status: "EDITING", deadline: "2026-09-06", quantity: 6 },
  { id: "av_5", clientName: "Auto Excelência", demandType: "making_of", responsibleName: "Matias", status: "CLIENT_APPROVAL", deadline: "2026-09-05", quantity: 1 },
  { id: "av_6", clientName: "Via Motors", demandType: "foto", responsibleName: "Matias", status: "PUBLISHED", deadline: "2026-08-25", quantity: 15 },
];

// ---------------------------------------------------------------------------
// AGENDA (seção 22)
// ---------------------------------------------------------------------------
export const agendaEvents: AgendaEvent[] = [
  { id: "ag_1", title: "Visita de captação — Auto Excelência", type: "visita", startAt: "2026-09-08T09:00:00", endAt: "2026-09-08T11:00:00", responsibleName: "Matias", status: "confirmado", relatedTo: "Auto Excelência" },
  { id: "ag_2", title: "Reunião de diagnóstico — Garagem Premium", type: "reuniao", startAt: "2026-09-08T14:00:00", endAt: "2026-09-08T15:00:00", responsibleName: "Gabriel", status: "agendado", relatedTo: "Garagem Premium Multimarcas" },
  { id: "ag_3", title: "Follow-up — AutoPrime Veículos", type: "compromisso_interno", startAt: "2026-09-08T16:30:00", responsibleName: "Douglas", status: "agendado", relatedTo: "AutoPrime Veículos" },
  { id: "ag_4", title: "Gravação institucional — Grupo Vantage", type: "gravacao", startAt: "2026-09-09T10:00:00", endAt: "2026-09-09T13:00:00", responsibleName: "Matias", status: "confirmado", relatedTo: "Grupo Vantage Veículos" },
];

// ---------------------------------------------------------------------------
// TAREFAS (seção 20)
// ---------------------------------------------------------------------------
export const tasks: TaskItem[] = [
  { id: "tk_1", title: "Ligar para AutoPrime e agendar reunião", assignedToName: "Douglas", priority: "alta", status: "pendente", dueDate: "2026-09-06", relatedEntityType: "lead_oportunidade", relatedEntityLabel: "AutoPrime Veículos" },
  { id: "tk_2", title: "Confirmar pagamento pendente do mês", assignedToName: "Mateus", priority: "urgente", status: "pendente", dueDate: "2026-09-05", relatedEntityType: "contrato", relatedEntityLabel: "Moto Rápida Peças" },
  { id: "tk_3", title: "Revisar vídeos antes do envio ao cliente", assignedToName: "Matias", priority: "media", status: "em_andamento", dueDate: "2026-09-07", relatedEntityType: "audiovisual", relatedEntityLabel: "Grupo Vantage Veículos" },
  { id: "tk_4", title: "Enviar proposta comercial revisada", assignedToName: "Douglas", priority: "alta", status: "pendente", dueDate: "2026-09-04", relatedEntityType: "lead_oportunidade", relatedEntityLabel: "Moto Center Sul" },
  { id: "tk_5", title: "Atualizar dados cadastrais do cliente", assignedToName: "Gabriel", priority: "baixa", status: "concluida", dueDate: "2026-09-01", relatedEntityType: "cliente", relatedEntityLabel: "Via Motors" },
];

// ---------------------------------------------------------------------------
// METAS (seção 23)
// ---------------------------------------------------------------------------
export const goals: Goal[] = [
  { id: "gl_1", vendorId: "u_douglas", vendorName: "Douglas", metric: "vendas", period: "mensal", target: 6, achieved: 3 },
  { id: "gl_2", vendorId: "u_douglas", vendorName: "Douglas", metric: "reunioes", period: "semanal", target: 8, achieved: 5 },
  { id: "gl_3", vendorId: "u_gabriel", vendorName: "Gabriel", metric: "faturamento", period: "mensal", target: 15000, achieved: 9800 },
];

// ---------------------------------------------------------------------------
// AUDITORIA (seção 9)
// ---------------------------------------------------------------------------
export const auditLogs: AuditLogEntry[] = [
  { id: "al_1", userName: "Mateus", action: "PAYMENT_CONFIRMED", module: "financeiro", entity: "payments", description: "Mateus confirmou pagamento de R$ 2.800,00 da Auto Excelência", createdAt: "2026-08-03T10:12:00" },
  { id: "al_2", userName: "Gabriel", action: "OWNERSHIP_CHANGED", module: "comercial", entity: "opportunities", description: "Gabriel manteve origin_owner_id como Douglas ao fechar Via Motors", createdAt: "2026-08-16T15:40:00" },
  { id: "al_3", userName: "Sistema", action: "COMMISSION_RELEASED", module: "financeiro", entity: "commissions", description: "Comissão de R$ 750,00 liberada para Douglas (Via Motors)", createdAt: "2026-08-16T15:41:00" },
  { id: "al_4", userName: "Douglas", action: "ACCESS_DENIED", module: "financeiro", entity: "payments", description: "Douglas tentou acessar Financeiro sem permissão", createdAt: "2026-09-02T09:05:00" },
  { id: "al_5", userName: "Gabriel", action: "APPROVE", module: "financeiro", entity: "referral_commissions", description: "Gabriel aprovou indicação de R$ 150,00 vinculada à Via Motors", createdAt: "2026-08-17T11:22:00" },
];

// ---------------------------------------------------------------------------
// NOTIFICAÇÕES (seção 24)
// ---------------------------------------------------------------------------
export const notifications: NotificationItem[] = [
  { id: "nt_1", type: "pagamento_confirmado", title: "Pagamento confirmado", body: "Pagamento de R$ 2.800,00 da Auto Excelência foi confirmado.", createdAt: "2026-08-03T10:12:00" },
  { id: "nt_2", type: "comissao_liberada", title: "Comissão liberada", body: "Sua comissão de R$ 750,00 pela venda da Via Motors foi liberada.", createdAt: "2026-08-16T15:41:00" },
  { id: "nt_3", type: "contrato_vencendo", title: "Contrato vencendo", body: "O contrato da Moto Rápida Peças está em atraso há 25 dias.", createdAt: "2026-09-04T08:00:00" },
  { id: "nt_4", type: "tarefa_atrasada", title: "Tarefa atrasada", body: "\"Enviar proposta comercial revisada\" está atrasada.", readAt: "2026-09-05T09:00:00", createdAt: "2026-09-04T18:00:00" },
];

// ---------------------------------------------------------------------------
// Helpers de agregação para o Dashboard (seção 10)
// ---------------------------------------------------------------------------
export function sum(values: number[]) {
  return values.reduce((a, b) => a + b, 0);
}

export function formatCurrency(value: number) {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR");
}
