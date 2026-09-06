export type UserProfile = {
  id: string;
  name?: string | null;
  email?: string | null;
  role?: string | null;
  active?: boolean | null;
};

export function isKorvixAdmin(profile: UserProfile | null | undefined) {
  return Boolean(
    profile?.active &&
      (profile.role === "ceo" ||
        profile.role === "cofundador" ||
        profile.email?.toLowerCase() === "korvixdigital@gmail.com")
  );
}

export function canAccessModule(profile: UserProfile | null | undefined, module: string) {
  if (!profile?.active) return false;
  if (isKorvixAdmin(profile)) return true;
  if (["dashboard", "financeiro", "audiovisual", "equipe", "auditoria"].includes(module)) return false;
  return ["crm", "comercial", "clientes", "agenda", "tarefas"].includes(module);
}
