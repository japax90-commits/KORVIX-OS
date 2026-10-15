import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { requireModule } from "@/lib/auth/server";

const actionTone: Record<string, "neutral" | "info" | "warning" | "danger" | "success"> = { PAYMENT_CONFIRMED: "success", OWNERSHIP_CHANGED: "warning", COMMISSION_RELEASED: "info", ACCESS_DENIED: "danger", APPROVE: "success" };

export default async function AuditoriaPage() {
  await requireModule("auditoria");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const { data: logs, error } = await s.from("audit_logs").select("id,user_name,action,module,entity,description,created_at").order("created_at", { ascending: false }).limit(100);
  if (error) return <ErrorState title="Erro ao carregar a auditoria" message={error.message} />;
  return (
    <div className="space-y-6">
      <PageHeader title="Auditoria" description="Registro das ações operacionais armazenadas no Supabase." />
      <Card>
        <CardHeader icon={<ShieldCheck size={16} />} title="Histórico operacional" subtitle="Últimos 100 registros" />
        <CardBody className="!p-0">
          <ul className="divide-y divide-ink-100">
            {(logs ?? []).map((log) => (
              <li key={log.id} className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-start sm:gap-3">
                <Badge tone={actionTone[log.action] ?? "neutral"}>{log.action}</Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-900">{log.description}</p>
                  <p className="mt-0.5 text-xs text-ink-500">{log.user_name} · módulo {log.module} · {formatDateTime(log.created_at)}</p>
                </div>
              </li>
            ))}
          </ul>
          {(logs ?? []).length === 0 && <p className="p-5 text-sm text-ink-500">Nenhum registro de auditoria ainda. A gravação automática de eventos ainda não está ligada às ações do sistema.</p>}
        </CardBody>
      </Card>
    </div>
  );
}
