// Listas de opções compartilhadas entre Server e Client Components.
// (Constantes exportadas de módulos "use client" não podem ser lidas no servidor.)

import type { OpportunityChannel } from "@/lib/types";

export const CHANNELS: { value: OpportunityChannel; label: string }[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "ligacao", label: "Ligação" },
  { value: "instagram", label: "Instagram" },
  { value: "trafego_pago", label: "Tráfego pago" },
  { value: "indicacao", label: "Indicação" },
  { value: "parceiro", label: "Parceiro" },
  { value: "visita_presencial", label: "Visita presencial" },
  { value: "outro", label: "Outro" },
];

export const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
  { value: "urgente", label: "Urgente" },
];

export const CLIENT_STATUSES = [
  { value: "onboarding", label: "Onboarding" },
  { value: "operacao", label: "Em operação" },
  { value: "renovacao", label: "Renovação" },
  { value: "pausado", label: "Pausado" },
];

export const PAYMENT_TYPES = [
  { value: "primeira_venda", label: "Primeira venda" },
  { value: "recorrencia", label: "Recorrência" },
  { value: "avulso", label: "Avulso" },
];

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "boleto", label: "Boleto" },
  { value: "credito", label: "Cartão de crédito" },
  { value: "debito", label: "Cartão de débito" },
  { value: "dinheiro", label: "Dinheiro" },
];

export const PAYMENT_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
  { value: "atrasado", label: "Atrasado" },
  { value: "cancelado", label: "Cancelado" },
];

export const FREQUENCIES = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

export const CONTRACT_STATUSES = [
  { value: "ativo", label: "Ativo" },
  { value: "pausado", label: "Pausado" },
  { value: "encerrado", label: "Encerrado" },
  { value: "cancelado", label: "Cancelado" },
];

// Valores minúsculos antigos mantidos por compatibilidade; "Impostos" e
// "Pró-labore" alimentam indicadores próprios no financeiro.
export const CASH_CATEGORIES = [
  { value: "reserva", label: "Reserva" },
  { value: "marketing", label: "Marketing" },
  { value: "comercial", label: "Comercial" },
  { value: "tecnologia", label: "Tecnologia" },
  { value: "contratacao", label: "Contratação" },
  { value: "expansao", label: "Expansão" },
  { value: "Impostos", label: "Impostos" },
  { value: "Pró-labore", label: "Pró-labore" },
  { value: "outros", label: "Outros" },
];

export const REFERRAL_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "aprovada", label: "Aprovada" },
  { value: "paga", label: "Paga" },
  { value: "cancelada", label: "Cancelada" },
];

export const TASK_STATUSES = [
  { value: "pendente", label: "Pendente" },
  { value: "em_andamento", label: "Em andamento" },
  { value: "concluida", label: "Concluída" },
  { value: "cancelada", label: "Cancelada" },
];

export const ENTITY_TYPES = [
  { value: "cliente", label: "Cliente" },
  { value: "lead_oportunidade", label: "Oportunidade" },
  { value: "contrato", label: "Contrato" },
  { value: "audiovisual", label: "Audiovisual" },
  { value: "agenda", label: "Agenda" },
  { value: "usuario", label: "Usuário" },
];

export const AV_STAGES = [
  { value: "DEMAND", label: "Demanda" },
  { value: "SCHEDULED", label: "Agendado" },
  { value: "VISIT", label: "Visita" },
  { value: "CAPTURE", label: "Captação" },
  { value: "TRANSFER", label: "Transferência" },
  { value: "EDITING", label: "Edição" },
  { value: "INTERNAL_REVIEW", label: "Revisão interna" },
  { value: "CLIENT_APPROVAL", label: "Aprovação do cliente" },
  { value: "FINALIZED", label: "Finalizado" },
  { value: "PUBLISHED", label: "Publicado" },
  { value: "CANCELLED", label: "Cancelado" },
];

export const ROLES = [
  { value: "ceo", label: "CEO" },
  { value: "cofundador", label: "Cofundador" },
  { value: "vendedor", label: "Vendedor" },
  { value: "audiovisual", label: "Audiovisual" },
  { value: "tecnico", label: "Técnico" },
  { value: "cto", label: "CTO" },
];
