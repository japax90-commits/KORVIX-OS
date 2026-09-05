import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { Plus } from "lucide-react";
import { tasks, formatDate } from "@/lib/mock-data";
import type { TaskItem } from "@/lib/types";

const entityLabel: Record<string, string> = {
  lead_oportunidade: "Oportunidade",
  cliente: "Cliente",
  contrato: "Contrato",
  audiovisual: "Audiovisual",
  agenda: "Agenda",
  usuario: "Usuário",
};

export default function TarefasPage() {
  const columns: Column<TaskItem>[] = [
    {
      header: "Tarefa",
      cell: (t) => (
        <div>
          <p className="font-medium text-ink-900">{t.title}</p>
          <p className="text-xs text-ink-500">
            {entityLabel[t.relatedEntityType]} · {t.relatedEntityLabel}
          </p>
        </div>
      ),
    },
    { header: "Responsável", cell: (t) => t.assignedToName },
    {
      header: "Prioridade",
      cell: (t) => (
        <Badge
          tone={
            t.priority === "urgente"
              ? "danger"
              : t.priority === "alta"
              ? "warning"
              : "neutral"
          }
        >
          {t.priority}
        </Badge>
      ),
      hideOnMobile: true,
    },
    { header: "Prazo", cell: (t) => formatDate(t.dueDate), hideOnMobile: true },
    { header: "Status", cell: (t) => <StatusBadge status={t.status} /> },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">
            Tarefas
          </h2>
          <p className="text-sm text-ink-500">
            Sistema transversal — vinculado a oportunidades, clientes, contratos, audiovisual, agenda e usuários.
          </p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} /> Nova tarefa
        </button>
      </div>

      <Card>
        <CardHeader title="Todas as tarefas" subtitle="Minhas tarefas e tarefas do time" />
        <DataTable columns={columns} rows={tasks} />
      </Card>
    </div>
  );
}
