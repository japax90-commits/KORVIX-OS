import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { allowedModules, isKorvixAdmin, roleLabel } from "@/lib/auth/permissions";
import { primaryNav, secondaryNav } from "@/lib/navigation";
import { TeamMemberEdit } from "@/components/operations/TeamMember";
import { requireModule } from "@/lib/auth/server";

const moduleLabel = Object.fromEntries([...primaryNav, ...secondaryNav].map((n) => [n.module, n.label]));

export default async function EquipePage() {
  await requireModule("equipe");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: users, error }, { data: profile }] = await Promise.all([
    s.from("users").select("id,name,email,role,active,avatar_initials").order("name"),
    s.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Erro ao carregar a equipe" message={error.message} />;
  const admin = isKorvixAdmin(profile);
  const members = users ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="Equipe e Permissões" description="Usuários cadastrados e os módulos que cada um acessa." />
      <div className="flex gap-3 rounded-xl border border-korvix-100 bg-korvix-50 p-4 text-sm text-ink-900">
        <Info size={16} className="mt-0.5 shrink-0 text-korvix-600" />
        <p>
          Os acessos são definidos pelo papel e aplicados no menu, nas rotas e no banco (RLS). Administração completa: apenas a conta principal.
          Novos logins são criados no painel do Supabase (Authentication) — o app não guarda chaves administrativas por segurança.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {members.map((u) => {
          const modules = allowedModules(u);
          const fullAdmin = isKorvixAdmin(u);
          return (
            <Card key={u.id}>
              <CardHeader
                icon={<span className="flex h-8 w-8 items-center justify-center rounded-full bg-korvix-900 text-xs font-semibold text-korvix-200">{u.avatar_initials || u.name.slice(0, 2).toUpperCase()}</span>}
                title={u.name}
                subtitle={`${fullAdmin ? "Administrador" : roleLabel(u.role)} · ${u.email}`}
                action={<div className="flex items-center gap-1"><Badge tone={u.active ? "success" : "danger"}>{u.active ? "Ativo" : "Inativo"}</Badge>{admin && u.id !== user.id && <TeamMemberEdit member={u} />}</div>}
              />
              <CardBody>
                <p className="mb-2 text-xs font-medium text-ink-500">Módulos com acesso</p>
                <div className="flex flex-wrap gap-1.5">
                  {modules.map((m) => <Badge key={m} tone="info">{moduleLabel[m] ?? m}</Badge>)}
                  {modules.length === 0 && <span className="text-sm text-ink-500">Nenhum (usuário inativo)</span>}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
      {members.length === 0 && <Card><CardBody><p className="text-sm text-ink-500">Nenhum usuário cadastrado.</p></CardBody></Card>}
    </div>
  );
}
