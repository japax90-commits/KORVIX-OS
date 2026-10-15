import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DesktopSidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { FlashMessage } from "@/components/layout/FlashMessage";
import { allowedModules, isKorvixAdmin, roleLabel } from "@/lib/auth/permissions";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "K";
}

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: notifications }] = await Promise.all([
    supabase.from("users").select("id, name, email, role, active, avatar_initials").eq("id", user.id).maybeSingle(),
    supabase.from("notifications").select("id, title, body, read_at, created_at").order("created_at", { ascending: false }).limit(20),
  ]);

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect("/login?error=Acesso%20não%20autorizado");
  }

  const isAdmin = isKorvixAdmin(profile);
  const modules = allowedModules(profile);
  const name = profile.name || user.email || "Usuário";

  return (
    <div className="flex min-h-screen bg-ink-100">
      <DesktopSidebar allowedModules={modules} isAdmin={isAdmin} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Topbar
          allowedModules={modules}
          isAdmin={isAdmin}
          user={{ name, email: profile.email ?? user.email ?? "", roleLabel: isAdmin ? "Administrador" : roleLabel(profile.role), initials: profile.avatar_initials || initials(name) }}
          notifications={notifications ?? []}
        />
        <main className="flex-1 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px]">
            <Suspense fallback={null}>
              <FlashMessage />
            </Suspense>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
