import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canAccessModule, homeRouteFor, isKorvixAdmin, type ModuleKey, type UserProfile } from "@/lib/auth/permissions";

export type CurrentUser = {
  id: string;
  email: string;
  profile: UserProfile & { name: string; avatar_initials: string | null };
  isAdmin: boolean;
};

/**
 * Usuário autenticado + perfil ativo, consultado uma única vez por requisição
 * (React cache) e compartilhado entre layout e páginas.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, name, email, role, active, avatar_initials")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.active) return null;
  return { id: user.id, email: user.email ?? profile.email ?? "", profile, isAdmin: isKorvixAdmin(profile) };
});

/**
 * Autorização no servidor para cada página de módulo. Complementa o middleware
 * e o RLS: falha fechada (sem sessão ou sem permissão, redireciona).
 */
export async function requireModule(module: ModuleKey) {
  const current = await getCurrentUser();
  if (!current) redirect("/login?error=Fa%C3%A7a%20login%20para%20continuar");
  if (!canAccessModule(current.profile, module)) {
    redirect(`${homeRouteFor(current.profile)}?error=Sem%20permiss%C3%A3o%20para%20acessar%20este%20m%C3%B3dulo`);
  }
  return current;
}
