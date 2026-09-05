import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck } from "lucide-react";
import { auditLogs, formatDate } from "@/lib/mock-data";

const actionTone: Record<string, "neutral" | "info" | "warning" | "danger" | "success"> = {
  PAYMENT_CONFIRMED: "success",
  OWNERSHIP_CHANGED: "warning",
  COMMISSION_RELEASED: "info",
  ACCESS_DENIED: "danger",
  APPROVE: "success",
};

export default function AuditoriaPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">
          Auditoria
        </h2>
        <p className="text-sm text-ink-500">
          Registro append-only de toda ação sensível — financeira, de propriedade comercial, de permissões e de exclusão.
        </p>
      </div>

      <Card>
        <CardHeader
          icon={<ShieldCheck size={16} />}
          title="Histórico operacional"
          subtitle="Nenhum papel pode editar ou excluir estes registros, nem mesmo admin"
        />
        <CardBody className="!p-0">
          <div className="divide-y divide-ink-100">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-5 py-3.5">
                <div className="mt-0.5">
                  <Badge tone={actionTone[log.action] ?? "neutral"}>
                    {log.action}
                  </Badge>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink-900">{log.description}</p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {log.userName} · módulo {log.module} · {formatDate(log.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
