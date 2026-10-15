import Link from "next/link";
import { AlertTriangle, CalendarClock, CalendarDays, CheckSquare, Columns3, List, Target, TrendingUp, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CrmClientV2 } from "./CrmClientV2";
import { NewOpportunityButton } from "./CrmClient";
import { canAccessModule, isKorvixAdmin } from "@/lib/auth/permissions";
import { requireModule } from "@/lib/auth/server";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { StatusBadge } from "@/components/ui/Badge";
import { Tabs } from "@/components/ui/Tabs";
import { DataTable, type Column } from "@/components/ui/Table";
import { Input, Select, buttonClass } from "@/components/ui/Form";
import { CreateTaskButton } from "@/components/operations/Tasks";
import { CreateAgendaButton } from "@/components/operations/Agenda";
import { STAGES, STAGE_LABELS, crmMetrics, followupAgenda, normalizeStage } from "@/lib/crm";
import { PRIORITIES, optionLabel } from "@/lib/options";
import { dayKey, formatDateTime, formatMoney, formatTime, isPastDay, todayISO } from "@/lib/format";
import { withParams } from "@/lib/table";
import { cn } from "@/lib/utils";

type OpportunityRow = { id: string; client_name: string; origin_owner_id: string | null; closing_user_id: string | null; channel: string | null; stage: string; priority: string | null; estimated_value: number | null; probability: number | null; next_action: string | null; next_followup_at: string | null; loss_reason: string | null };
type UserRow = { id: string; name: string };
type Search = { view?: string; lead?: string; q?: string; etapa?: string; resp?: string; sort?: string; dir?: string; page?: string };

const bucketStyle = { atrasado: "text-danger", hoje: "text-warning", proximos: "text-ink-500" } as const;
const bucketLabel = { atrasado: "Atrasado", hoje: "Hoje", proximos: "Próximos dias" } as const;

export default async function CrmPage({ searchParams = {} }: { searchParams?: Search }) {
  const current = await requireModule("crm");
  const supabase = await createClient();
  const user = { id: current.id, email: current.email };
  const showTasks = canAccessModule(current.profile, "tarefas");
  const showAgenda = canAccessModule(current.profile, "agenda");
  const today = todayISO();

  const [{ data: opportunities, error: opError }, { data: users, error: userError }, { data: clients }, { data: tasks }, { data: events }] = await Promise.all([
    // Arquivados já são ocultados pelo RLS; o filtro explícito documenta a regra.
    supabase.from("opportunities").select("id, client_name, origin_owner_id, closing_user_id, channel, stage, priority, estimated_value, probability, next_action, next_followup_at, loss_reason").is("archived_at", null).order("created_at", { ascending: false }),
    supabase.from("users").select("id,name").eq("active", true).order("name"),
    supabase.from("clients").select("id,company_name"),
    showTasks
      ? supabase.from("tasks").select("id,title,due_date,status,priority,related_entity_label").eq("assigned_to_id", user.id).in("status", ["pendente", "em_andamento"]).lte("due_date", today).order("due_date")
      : Promise.resolve({ data: [] as { id: string; title: string; due_date: string; status: string; priority: string; related_entity_label: string | null }[] }),
    showAgenda
      ? supabase.from("agenda_events").select("id,title,type,start_at,status,related_to,responsible_user_id").gte("start_at", new Date(Date.now() - 36 * 3600_000).toISOString()).lte("start_at", new Date(Date.now() + 36 * 3600_000).toISOString()).order("start_at")
      : Promise.resolve({ data: [] as { id: string; title: string; type: string; start_at: string; status: string; related_to: string | null; responsible_user_id: string | null }[] }),
  ]);
  if (opError || userError) return <ErrorState title="Não foi possível carregar o CRM" message={(opError ?? userError)?.message} />;

  const rows = (opportunities ?? []) as OpportunityRow[];
  const userRows = (users ?? []) as UserRow[];
  const admin = isKorvixAdmin(current.profile);
  const metrics = crmMetrics(rows);
  const followups = followupAgenda(rows);
  const todayEvents = (events ?? []).filter((e) => dayKey(e.start_at) === today && e.status !== "cancelado" && (!e.responsible_user_id || e.responsible_user_id === user.id));
  const view = searchParams.view === "lista" ? "lista" : "funil";
  const userName = (id: string | null) => userRows.find((u) => u.id === id)?.name ?? "—";
  const shared = { userId: user.id, userName: current.profile.name || user.email, users: userRows, isAdmin: admin };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CRM"
        description={admin ? "Leads, oportunidades e acompanhamento comercial de toda a equipe." : "Seus leads, oportunidades e próximos contatos."}
        actions={<NewOpportunityButton currentUserId={user.id} users={userRows} isAdmin={admin} />}
      />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Pipeline aberto" value={formatMoney(metrics.openValue)} icon={Wallet} helper={`${metrics.openCount} oportunidade(s) em andamento`} />
        <StatCard label="Previsão ponderada" value={formatMoney(metrics.weightedValue)} icon={TrendingUp} helper="Valor × probabilidade de cada etapa aberta" />
        <StatCard label="Follow-ups atrasados" value={String(metrics.overdueFollowups)} icon={AlertTriangle} helper={`${metrics.todayFollowups} ainda hoje · ${metrics.withoutFollowup} sem data`} />
        <StatCard label="Conversão" value={`${metrics.conversion.toFixed(1)}%`} icon={Target} helper={`${metrics.won} ganha(s) · ${metrics.lost} perdida(s)`} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader icon={<CalendarClock size={16} />} title="Próximos contatos" subtitle="Follow-ups de oportunidades abertas: atrasados, hoje e próximos 7 dias" />
          <CardBody className="!p-0">
            {followups.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-500">Nenhum follow-up agendado. Defina a data do próximo contato ao editar uma oportunidade.</p>
            ) : (
              <ul className="divide-y divide-ink-100">
                {followups.slice(0, 8).map((f) => (
                  <li key={f.id}>
                    <Link href={withParams("/crm", {}, { lead: f.id })} scroll={false} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                      <span className={cn("w-24 shrink-0 text-xs font-medium", bucketStyle[f.bucket])}>{bucketLabel[f.bucket]}<span className="block font-normal text-ink-500">{f.bucket === "proximos" ? formatDateTime(f.next_followup_at) : formatTime(f.next_followup_at)}</span></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-900">{f.client_name}</span>
                        <span className="block truncate text-xs text-ink-500">{f.next_action || "Sem próxima ação definida"}</span>
                      </span>
                      <span className="hidden text-sm tabular-nums text-ink-700 sm:block">{formatMoney(f.estimated_value ?? 0)}</span>
                      <StatusBadge status={normalizeStage(f.stage)} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {followups.length > 8 && <p className="border-t border-ink-100 px-5 py-2.5 text-xs text-ink-500">+{followups.length - 8} contato(s) nos próximos dias — use a visão em lista para ver todos.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<CalendarDays size={16} />} title="Seu dia" subtitle="Tarefas vencendo e compromissos de hoje" />
          <CardBody className="space-y-4">
            {showTasks && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500"><CheckSquare size={13} /> Tarefas</p>
                  <CreateTaskButton compact {...shared} />
                </div>
                <ul className="space-y-1.5">
                  {(tasks ?? []).slice(0, 5).map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-2 rounded-lg bg-ink-50 px-3 py-2 text-sm">
                      <span className="min-w-0 truncate text-ink-900">{t.title}</span>
                      <span className={cn("shrink-0 text-xs", isPastDay(t.due_date) ? "font-medium text-danger" : "text-warning")}>{isPastDay(t.due_date) ? "Atrasada" : "Hoje"}</span>
                    </li>
                  ))}
                  {!(tasks ?? []).length && <li className="text-sm text-ink-500">Nenhuma tarefa vencendo.</li>}
                </ul>
                {(tasks ?? []).length > 5 && <Link href="/tarefas?filtro=atrasadas" className="mt-2 inline-block text-xs font-medium text-korvix-600 hover:underline">Ver todas</Link>}
              </div>
            )}
            {showAgenda && (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink-500"><CalendarDays size={13} /> Agenda</p>
                  <CreateAgendaButton compact {...shared} />
                </div>
                <ul className="space-y-1.5">
                  {todayEvents.slice(0, 5).map((e) => (
                    <li key={e.id} className="flex items-center gap-3 rounded-lg bg-ink-50 px-3 py-2 text-sm">
                      <span className="w-11 shrink-0 text-xs tabular-nums text-ink-500">{formatTime(e.start_at)}</span>
                      <span className="min-w-0 truncate text-ink-900">{e.title}</span>
                    </li>
                  ))}
                  {!todayEvents.length && <li className="text-sm text-ink-500">Nenhum compromisso hoje.</li>}
                </ul>
                <Link href="/agenda" className="mt-2 inline-block text-xs font-medium text-korvix-600 hover:underline">Abrir agenda</Link>
              </div>
            )}
            {!showTasks && !showAgenda && <p className="text-sm text-ink-500">Seu perfil não tem acesso a tarefas ou agenda.</p>}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-4">
        <Tabs
          label="Visualização do funil"
          items={[
            { href: "/crm", label: "Funil", active: view === "funil", icon: <Columns3 size={15} />, count: metrics.openCount },
            { href: "/crm?view=lista", label: "Lista", active: view === "lista", icon: <List size={15} />, count: rows.length },
          ]}
        />
        {view === "funil" ? (
          <CrmClientV2 opportunities={rows} users={userRows} currentUserId={user.id} isAdmin={admin} clients={clients ?? []} openLeadId={searchParams.lead} />
        ) : (
          <OpportunityList rows={rows} params={searchParams} users={userRows} admin={admin} userName={userName} />
        )}
      </div>
    </div>
  );
}

function OpportunityList({ rows, params, users, admin, userName }: { rows: OpportunityRow[]; params: Search; users: UserRow[]; admin: boolean; userName: (id: string | null) => string }) {
  const q = (params.q ?? "").trim().toLowerCase();
  const filtered = rows.filter(
    (o) =>
      (!q || o.client_name.toLowerCase().includes(q) || (o.next_action ?? "").toLowerCase().includes(q)) &&
      (!params.etapa || normalizeStage(o.stage) === params.etapa) &&
      (!params.resp || o.origin_owner_id === params.resp || o.closing_user_id === params.resp),
  );
  const columns: Column<OpportunityRow>[] = [
    { header: "Cliente", sortKey: "cliente", sortValue: (o) => o.client_name, cell: (o) => <Link href={withParams("/crm", {}, { lead: o.id })} className="font-medium text-ink-900 hover:text-primary">{o.client_name}</Link> },
    { header: "Etapa", sortKey: "etapa", sortValue: (o) => STAGES.indexOf(normalizeStage(o.stage)), cell: (o) => <StatusBadge status={normalizeStage(o.stage)} /> },
    { header: "Valor", sortKey: "valor", sortValue: (o) => Number(o.estimated_value ?? 0), cell: (o) => <span className="tabular-nums">{formatMoney(o.estimated_value ?? 0)}</span> },
    { header: "Prob.", sortKey: "prob", sortValue: (o) => o.probability ?? 0, cell: (o) => `${o.probability ?? 0}%`, hideOnMobile: true },
    { header: "Prioridade", sortKey: "prioridade", sortValue: (o) => PRIORITIES.findIndex((p) => p.value === o.priority), cell: (o) => optionLabel(PRIORITIES, o.priority), hideOnMobile: true },
    { header: "Próximo contato", sortKey: "followup", sortValue: (o) => o.next_followup_at, cell: (o) => (o.next_followup_at ? <span className={cn(new Date(o.next_followup_at) < new Date() && "font-medium text-danger")}>{formatDateTime(o.next_followup_at)}</span> : "—") },
    ...(admin ? [{ header: "Responsável", sortKey: "resp", sortValue: (o: OpportunityRow) => userName(o.origin_owner_id), cell: (o: OpportunityRow) => userName(o.origin_owner_id), hideOnMobile: true }] : []),
  ];
  const base = { view: "lista", q: params.q, etapa: params.etapa, resp: params.resp, sort: params.sort, dir: params.dir };
  return (
    <Card>
      <form className="flex flex-col gap-2 border-b border-ink-100 px-5 py-3 md:flex-row" role="search">
        <input type="hidden" name="view" value="lista" />
        <Input name="q" defaultValue={params.q ?? ""} placeholder="Buscar por cliente ou próxima ação" aria-label="Buscar oportunidades" className="md:flex-1" />
        <Select name="etapa" defaultValue={params.etapa ?? ""} aria-label="Filtrar por etapa" className="md:w-44">
          <option value="">Todas as etapas</option>
          {STAGES.map((s) => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
        </Select>
        {admin && users.length > 1 && (
          <Select name="resp" defaultValue={params.resp ?? ""} aria-label="Filtrar por responsável" className="md:w-48">
            <option value="">Todos os responsáveis</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
        )}
        <button className={buttonClass("secondary")}>Filtrar</button>
        {(params.q || params.etapa || params.resp) && <Link href="/crm?view=lista" className={buttonClass("ghost")}>Limpar</Link>}
      </form>
      <p className="px-5 pt-3 text-xs text-ink-500">{filtered.length} de {rows.length} oportunidade(s) · clique no nome para abrir</p>
      <DataTable columns={columns} rows={filtered} navigation={{ pathname: "/crm", params: base }} emptyLabel={q || params.etapa || params.resp ? "Nenhuma oportunidade com esses filtros." : "Nenhuma oportunidade cadastrada. Use Nova oportunidade."} />
    </Card>
  );
}
