import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Plus } from "lucide-react";
import { users } from "@/lib/mock-data";

const roleLabel: Record<string, string> = {
  ceo: "CEO",
  cofundador: "Cofundador",
  vendedor: "Vendedor",
  audiovisual: "Audiovisual",
  tecnico: "Técnico",
};

const levelTone: Record<string, "neutral" | "info" | "warning" | "brand"> = {
  none: "neutral",
  view: "info",
  edit: "warning",
  admin: "brand",
};

export default function EquipePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">
            Equipe e Permissões
          </h2>
          <p className="text-sm text-ink-500">
            RBAC dirigido por dados — nenhuma permissão hardcoded por nome de usuário.
          </p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} /> Novo usuário
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {users.map((u) => (
          <Card key={u.id}>
            <CardHeader
              title={u.name}
              subtitle={`${roleLabel[u.role]} · ${u.email}`}
              action={
                <Badge tone={u.active ? "success" : "danger"}>
                  {u.active ? "Ativo" : "Inativo"}
                </Badge>
              }
            />
            <CardBody>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-500">
                Acesso por módulo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {u.moduleAccess.map((m) => (
                  <span
                    key={m.module}
                    className="inline-flex items-center gap-1 rounded-full border border-ink-100 py-1 pl-2.5 pr-1 text-xs"
                  >
                    <span className="capitalize text-ink-700">{m.module}</span>
                    <Badge tone={levelTone[m.level]}>{m.level}</Badge>
                  </span>
                ))}
                {u.moduleAccess.length === 0 && (
                  <span className="text-xs text-ink-500">
                    Nenhum módulo liberado.
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Níveis de acesso"
          subtitle="none · view · edit · admin — mais permissões de ação granulares (excluir, aprovar, cancelar, confirmar pagamento)"
        />
        <CardBody>
          <p className="text-sm text-ink-500">
            A tela de edição de permissões (por usuário × módulo × ação) será
            implementada na próxima etapa de construção, conectada ao schema
            real de <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">user_module_access</code> e{" "}
            <code className="rounded bg-ink-100 px-1 py-0.5 text-xs">user_action_permissions</code>.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
