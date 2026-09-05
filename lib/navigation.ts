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

// Estrutura de navegação prevista no MVP (seção 4 e 38 da Especificação Técnica
// Master V2.0). No protótipo, todos os itens são exibidos para fins de
// demonstração; na versão com RBAC real, esta lista é filtrada por
// user_module_access do usuário logado antes de ser renderizada.
export const primaryNav: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    module: "dashboard",
    icon: LayoutDashboard,
    description: "Korvix Command Center",
  },
  {
    href: "/crm",
    label: "CRM",
    module: "crm",
    icon: Target,
    description: "Leads e oportunidades",
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
