import { createClient } from "@/lib/supabase/server";
import { AgendaView, CreateAgendaButton, type AgendaEvent } from "@/components/operations/Agenda";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { requireModule } from "@/lib/auth/server";

type User = { id: string; name: string };

export default async function AgendaPage() {
  await requireModule("agenda");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: events, error }, { data: profile }, { data: users }] = await Promise.all([
    supabase.from("agenda_events").select("id,title,type,start_at,end_at,responsible_name,responsible_user_id,status,related_to").order("start_at", { ascending: true }),
    supabase.from("users").select("id,name,email,role,active").eq("id", user.id).maybeSingle(),
    supabase.from("users").select("id,name").eq("active", true).order("name"),
  ]);
  if (error) return <ErrorState title="Não foi possível carregar a agenda" message={error.message} />;
  const admin = isKorvixAdmin(profile);
  const props = { userId: user.id, userName: profile?.name ?? user.email ?? "Usuário", users: (users ?? []) as User[], isAdmin: admin };
  return (
    <div className="space-y-6">
      <PageHeader title="Agenda" description="Compromissos individuais, por responsável e compartilhados com a equipe." actions={<CreateAgendaButton {...props} />} />
      <AgendaView events={(events ?? []) as AgendaEvent[]} {...props} />
    </div>
  );
}
