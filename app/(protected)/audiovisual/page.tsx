import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { Link2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AvBoard, CreateAvDemandButton, type AvDemand } from "@/components/operations/Audiovisual";
import { isPastDay } from "@/lib/format";

const DONE = ["FINALIZED", "PUBLISHED", "CANCELLED"];

export default async function AudiovisualPage() {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: items, error }, { data: users }, { data: clients }, { data: profile }] = await Promise.all([
    s.from("av_demands").select("id,client_name,demand_type,responsible_name,responsible_user_id,status,deadline,quantity").order("deadline", { ascending: true }),
    s.from("users").select("id,name").eq("active", true).order("name"),
    s.from("clients").select("company_name").order("company_name"),
    s.from("users").select("name").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Erro ao carregar o audiovisual" message={error.message} />;
  const rows = (items ?? []) as AvDemand[];
  const open = rows.filter((d) => !DONE.includes(d.status));
  const shared = { users: users ?? [], clients: (clients ?? []).map((c) => c.company_name), userId: user.id, userName: profile?.name ?? user.email ?? "Usuário" };
  return (
    <div className="space-y-6">
      <PageHeader title="Audiovisual" description="Pipeline de produção, da demanda à publicação." actions={<CreateAvDemandButton {...shared} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Em produção" value={String(open.length)} />
        <StatCard label="Atrasadas" value={String(open.filter((d) => isPastDay(d.deadline)).length)} />
        <StatCard label="Aguardando cliente" value={String(rows.filter((d) => d.status === "CLIENT_APPROVAL").length)} />
        <StatCard label="Publicadas" value={String(rows.filter((d) => d.status === "PUBLISHED").length)} />
      </div>
      <AvBoard demands={rows} {...shared} />
      <Card>
        <CardHeader icon={<Link2 size={16} />} title="Entregas com link externo" subtitle="WeTransfer ou Google Drive" />
        <CardBody><p className="text-sm text-ink-500">Os arquivos pesados ficam fora do KORVIX OS; a operação registra demanda, etapa, prazo e responsável.</p></CardBody>
      </Card>
    </div>
  );
}
