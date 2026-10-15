import { createClient } from "@/lib/supabase/server";
import { CrmClientV2 } from "./CrmClientV2";
import { NewOpportunityButton } from "./CrmClient";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { requireModule } from "@/lib/auth/server";

type OpportunityRow = { id: string; client_name: string; origin_owner_id: string | null; closing_user_id: string | null; channel: string | null; stage: string; priority: string | null; estimated_value: number | null; probability: number | null; next_action: string | null; next_followup_at: string | null; loss_reason: string | null };
type UserRow = { id: string; name: string };

export default async function CrmPage() {
  await requireModule("crm");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: opportunities, error: opError }, { data: users, error: userError }, { data: profile }, { data: clients }] = await Promise.all([
    // Arquivados já são ocultados pelo RLS; o filtro explícito documenta a regra.
    supabase.from("opportunities").select("id, client_name, origin_owner_id, closing_user_id, channel, stage, priority, estimated_value, probability, next_action, next_followup_at, loss_reason").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("users").select("id,name").eq("active", true).order("name"),
    supabase.from("users").select("id,name,email,role,active").eq("id", user.id).maybeSingle(),
    supabase.from("clients").select("id,company_name"),
  ]);
  if (opError || userError) return <ErrorState title="Não foi possível carregar o CRM" message={(opError ?? userError)?.message} />;
  const userRows = (users ?? []) as UserRow[];
  const admin = isKorvixAdmin(profile);
  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM — Funil de vendas"
        description={admin ? "Todos os leads da equipe, com gestão administrativa." : "Seus leads e oportunidades."}
        actions={<NewOpportunityButton currentUserId={user.id} users={userRows} isAdmin={admin} />}
      />
      <CrmClientV2 opportunities={(opportunities ?? []) as OpportunityRow[]} users={userRows} currentUserId={user.id} isAdmin={admin} clients={clients ?? []} />
    </div>
  );
}
