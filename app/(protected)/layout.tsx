import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { canAccessModule, isKorvixAdmin } from "@/lib/auth/permissions";

const ALL_MODULES = [
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
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, name, email, role, active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect("/login?error=Acesso%20não%20autorizado");
  }

  const isAdmin = isKorvixAdmin(profile);
  const allowedModules = ALL_MODULES.filter((module) => canAccessModule(profile, module));

  return (
    <div className="flex min-h-screen bg-ink-100">
      <DesktopSidebar allowedModules={allowedModules} isAdmin={isAdmin} />
      <div className="flex min-h-screen flex-1 flex-col lg:pl-[248px]">
        <Topbar allowedModules={allowedModules} isAdmin={isAdmin} />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
