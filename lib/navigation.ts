import {
  LayoutDashboard,
  Target,
  Handshake,
  Users,
  Wallet,
  Video,
  CalendarDays,
  UserCog,
  ListChecks,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  module: string;
  icon: LucideIcon;
  description: string;
}

// Navegação principal. O CRM é o centro da operação e a página inicial; a
// lista é filtrada pelas permissões do usuário (lib/auth/permissions.ts).
export const primaryNav: NavItem[] = [
  {
    href: "/crm",
    label: "CRM",
    module: "crm",
    icon: Target,
    description: "Leads e oportunidades",
  },
  {
    href: "/dashboard",
    label: "Visão geral",
    module: "dashboard",
    icon: LayoutDashboard,
    description: "Indicadores da operação",
  },
  {
    href: "/comercial",
    label: "Comercial",
    module: "comercial",
    icon: Handshake,
    description: "Funil e metas de vendas",
  },
  {
    href: "/clientes",
    label: "Clientes",
    module: "clientes",
    icon: Users,
    description: "Ficha 360º e operação",
  },
  {
    href: "/financeiro",
    label: "Financeiro",
    module: "financeiro",
    icon: Wallet,
    description: "Pagamentos, comissões e caixa",
  },
  {
    href: "/audiovisual",
    label: "Audiovisual",
    module: "audiovisual",
    icon: Video,
    description: "Pipeline de produção",
  },
  {
    href: "/agenda",
    label: "Agenda",
    module: "agenda",
    icon: CalendarDays,
    description: "Compromissos unificados",
  },
  {
    href: "/equipe",
    label: "Equipe e Permissões",
    module: "equipe",
    icon: UserCog,
    description: "Usuários, RBAC e metas",
  },
];

export const secondaryNav: NavItem[] = [
  {
    href: "/tarefas",
    label: "Tarefas",
    module: "tarefas",
    icon: ListChecks,
    description: "Follow-ups transversais",
  },
  {
    href: "/auditoria",
    label: "Auditoria",
    module: "auditoria",
    icon: ShieldCheck,
    description: "Histórico operacional",
  },
];
