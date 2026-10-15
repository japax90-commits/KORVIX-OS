import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { createClient } from "@/lib/supabase/server";
import { CreateTaskButton, TaskActions } from "@/components/operations/Tasks";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { formatDate, isPastDay, todayISO } from "@/lib/format";

import { cn } from "@/lib/utils";
import { PRIORITIES, ENTITY_TYPES } from "@/lib/options";
import { requireModule } from "@/lib/auth/server";

const entityLabel = Object.fromEntries(ENTITY_TYPES.map((t) => [t.value, t.label]));
const priorityLabel = Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label]));
const filters = [
  { value: "", label: "Abertas" },
  { value: "atrasadas", label: "Atrasadas" },
  { value: "concluida", label: "Concluídas" },
  { value: "todas", label: "Todas" },
];
const OPEN = ["pendente", "em_andamento"];
type User = { id: string; name: string };

export default async function TarefasPage({ searchParams }: { searchParams?: { filtro?: string } }) {
  await requireModule("tarefas");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: tasks, error }, { data: profile }, { data: users }] = await Promise.all([
    supabase.from("tasks").select("id,title,assigned_to_id,assigned_to_name,priority,status,due_date,related_entity_type,related_entity_label").order("due_date", { ascending: true }),
    supabase.from("users").select("id,name,email,role,active").eq("id", user.id).maybeSingle(),
    supabase.from("users").select("id,name").eq("active", true).order("name"),
  ]);
  if (error) return <ErrorState title="Não foi possível carregar as tarefas" message={error.message} />;
  const all = tasks ?? [];
  const admin = isKorvixAdmin(profile);
  const shared = { userId: user.id, userName: profile?.name ?? user.email ?? "Usuário", users: (users ?? []) as User[], isAdmin: admin };
  const filter = searchParams?.filtro ?? "";
  const late = (t: (typeof all)[number]) => OPEN.includes(t.status) && isPastDay(t.due_date);
  const rows = all.filter((t) => (filter === "todas" ? true : filter === "concluida" ? t.status === "concluida" : filter === "atrasadas" ? late(t) : OPEN.includes(t.status)));
  const today = todayISO();
  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Tarefa", sortKey: "tarefa", sortValue: (t) => t.title, cell: (t) => <div className="min-w-0 max-w-[340px] whitespace-normal"><p className={cn("font-medium text-ink-900", t.status === "concluida" && "text-ink-500 line-through")}>{t.title}</p><p className="text-xs text-ink-500">{entityLabel[t.related_entity_type] ?? t.related_entity_type}{t.related_entity_label ? ` · ${t.related_entity_label}` : ""}</p></div> },
    { header: "Responsável", sortKey: "resp", sortValue: (t) => t.assigned_to_name, cell: (t) => t.assigned_to_name, hideOnMobile: true },
    { header: "Prioridade", cell: (t) => <Badge tone={t.priority === "urgente" ? "danger" : t.priority === "alta" ? "warning" : "neutral"}>{priorityLabel[t.priority] ?? t.priority}</Badge>, hideOnMobile: true },
    { header: "Prazo", sortKey: "prazo", sortValue: (t) => t.due_date, cell: (t) => <span className={cn(late(t) && "font-medium text-danger", t.due_date === today && OPEN.includes(t.status) && "font-medium text-warning")}>{t.due_date === today ? "Hoje" : formatDate(t.due_date)}</span> },
    { header: "Status", cell: (t) => <StatusBadge status={t.status} />, hideOnMobile: true },
    { header: "Ações", className: "text-right", cell: (t) => <div className="flex justify-end"><TaskActions task={t} {...shared} /></div> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Tarefas" description={admin ? "Distribua e acompanhe as tarefas de toda a equipe." : "Suas tarefas e follow-ups."} actions={<CreateTaskButton {...shared} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Abertas" value={String(all.filter((t) => OPEN.includes(t.status)).length)} />
        <StatCard label="Atrasadas" value={String(all.filter(late).length)} />
        <StatCard label="Para hoje" value={String(all.filter((t) => OPEN.includes(t.status) && t.due_date === today).length)} />
        <StatCard label="Concluídas" value={String(all.filter((t) => t.status === "concluida").length)} />
      </div>
      <Card>
        <CardHeader title={admin ? "Tarefas da equipe" : "Minhas tarefas"} subtitle={`${rows.length} tarefa(s)`} />
        <div className="flex gap-1 overflow-x-auto border-b border-ink-100 px-5 py-3">
          {filters.map((f) => (
            <Link key={f.value} href={f.value ? `/tarefas?filtro=${f.value}` : "/tarefas"} className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium", filter === f.value ? "bg-primary text-primary-fg" : "text-ink-600 hover:bg-ink-100")}>{f.label}</Link>
          ))}
        </div>
        <DataTable navigation={{ pathname: "/tarefas", params: searchParams ?? {} }} columns={columns} rows={rows} emptyLabel={filter ? "Nenhuma tarefa neste filtro." : "Nenhuma tarefa aberta. Use Nova tarefa para começar."} />
      </Card>
    </div>
  );
}
