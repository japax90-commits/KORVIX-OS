export type UserProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  active?: boolean | null;
};

export const KORVIX_ADMIN_EMAIL = "korvixdigital@gmail.com";

/** Ordem de prioridade usada para escolher a página inicial do usuário. */
export const MODULES = [
  "dashboard",
  "crm",
  "comercial",
  "clientes",
  "financeiro",
  "audiovisual",
  "agenda",
  "equipe",
  "tarefas",
  "auditoria",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export function isKorvixAdmin(profile: UserProfile | null | undefined) {
  return Boolean(profile?.active && profile.email?.toLowerCase() === KORVIX_ADMIN_EMAIL);
}

export function canAccessModule(profile: UserProfile | null | undefined, module: string) {
  if (!profile?.active) return false;
  if (isKorvixAdmin(profile)) return true;

  // Cofounder account follows the restricted employee-style access requested:
  // CRM + Agenda + Tasks only.
  if (profile.role === "cofundador") {
    return ["crm", "agenda", "tarefas"].includes(module);
  }

  if (["dashboard", "financeiro", "audiovisual", "equipe", "auditoria"].includes(module)) return false;
  return ["crm", "comercial", "clientes", "agenda", "tarefas"].includes(module);
}

export function allowedModules(profile: UserProfile | null | undefined) {
  return MODULES.filter((module) => canAccessModule(profile, module));
}

/** Módulo ao qual uma rota pertence (ex.: /financeiro/caixa → financeiro). */
export function moduleForPath(pathname: string): ModuleKey | null {
  const segment = pathname.split("/")[1] ?? "";
  return (MODULES as readonly string[]).includes(segment) ? (segment as ModuleKey) : null;
}

/** Primeira rota que o usuário pode abrir — usada após o login e em redirecionamentos. */
export function homeRouteFor(profile: UserProfile | null | undefined) {
  const first = allowedModules(profile)[0];
  return first ? `/${first}` : "/login?error=Acesso%20n%C3%A3o%20autorizado";
}

const roleLabels: Record<string, string> = { ceo: "CEO", cofundador: "Cofundador", vendedor: "Vendedor", audiovisual: "Audiovisual", tecnico: "Técnico", cto: "CTO" };
export const roleLabel = (role?: string | null) => (role ? roleLabels[role] ?? role : "—");
