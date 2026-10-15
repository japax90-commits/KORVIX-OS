import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { ArrowLeft, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { canAccessModule, isKorvixAdmin } from "@/lib/auth/permissions";
import { ClientEditButton } from "@/components/operations/ClientForm";
import { formatDate, formatDateTime, formatMoney, humanize } from "@/lib/format";

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-500">{children}</p>;
}

function Row({ title, meta, badge }: { title: React.ReactNode; meta: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 p-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-900">{title}</p>
        <p className="text-xs text-ink-500">{meta}</p>
      </div>
      {badge}
    </div>
  );
}

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: client }, { data: profile }] = await Promise.all([
    s.from("clients").select("id,company_name,contact_name,phone,niche,origin_owner_id,account_manager_id,operational_status,active_contract_value,active_plan_name,entry_date").eq("id", params.id).maybeSingle(),
    s.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (!client) return notFound();
  const admin = isKorvixAdmin(profile);
  const finance = canAccessModule(profile, "financeiro");
  const av = canAccessModule(profile, "audiovisual");

  const [{ data: contracts }, { data: payments }, { data: commissions }, { data: demands }, { data: agenda }, { data: tasks }, { data: people }] = await Promise.all([
    s.from("contracts").select("id,plan_name,value,frequency,status,next_billing_date,overdue").eq("client_name", client.company_name).order("created_at", { ascending: false }),
    s.from("payments").select("id,amount,type,status,due_date,paid_at").eq("client_id", client.id).order("due_date", { ascending: false }),
    s.from("commissions").select("id,vendor_name,amount,percentage,status").eq("client_name", client.company_name).order("created_at", { ascending: false }),
    s.from("av_demands").select("id,demand_type,status,deadline,quantity,responsible_name").eq("client_name", client.company_name).order("deadline"),
    s.from("agenda_events").select("id,title,type,start_at,end_at,status,responsible_name").eq("related_to", client.company_name).order("start_at"),
    s.from("tasks").select("id,title,status,priority,due_date").eq("related_entity_label", client.company_name).order("due_date"),
    s.from("users").select("id,name").in("id", [client.origin_owner_id, client.account_manager_id].filter(Boolean)),
  ]);
  const person = (id: string | null) => people?.find((p) => p.id === id)?.name ?? "—";
  const restricted = <p className="flex items-center gap-2 text-sm text-ink-500"><Lock size={14} /> Disponível apenas para a administração.</p>;

  return (
    <div className="space-y-6">
      <Link href="/clientes" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"><ArrowLeft size={15} /> Voltar para Clientes</Link>
      <Card>
        <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold tracking-tight text-ink-900">{client.company_name}</h2>
              <StatusBadge status={client.operational_status} />
            </div>
            <p className="mt-1 text-sm text-ink-500">{client.contact_name}{client.phone ? ` · ${client.phone}` : ""}</p>
            <p className="mt-1 text-xs text-ink-500">Nicho: {client.niche || "—"} · Plano: {client.active_plan_name || "—"} · Cliente desde {formatDate(client.entry_date)}</p>
          </div>
          <div className="flex items-start gap-6 text-sm">
            <div><p className="text-xs text-ink-500">Origem</p><p className="font-medium">{person(client.origin_owner_id)}</p></div>
            <div><p className="text-xs text-ink-500">Atendimento</p><p className="font-medium">{person(client.account_manager_id)}</p></div>
            <ClientEditButton client={client} canDelete={admin} />
          </div>
        </CardBody>
      </Card>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Contratos" />
          <CardBody className="space-y-3">
            {!finance ? restricted : <>
              {(contracts ?? []).map((c) => <Row key={c.id} title={c.plan_name} meta={`${formatMoney(c.value)} · ${humanize(c.frequency)} · próxima cobrança ${formatDate(c.next_billing_date)}`} badge={<StatusBadge status={c.overdue ? "atrasado" : c.status} />} />)}
              {!contracts?.length && <Empty>Nenhum contrato registrado.</Empty>}
            </>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Financeiro" subtitle={finance ? `Contrato ativo: ${client.active_contract_value ? formatMoney(client.active_contract_value) : "—"}` : undefined} />
          <CardBody className="space-y-3">
            {!finance ? restricted : <>
              {(payments ?? []).map((p) => <Row key={p.id} title={formatMoney(p.amount)} meta={`${humanize(p.type)} · vencimento ${formatDate(p.due_date)}${p.paid_at ? ` · pago em ${formatDate(p.paid_at)}` : ""}`} badge={<StatusBadge status={p.status} />} />)}
              {!payments?.length && <Empty>Nenhum pagamento registrado.</Empty>}
              {(commissions ?? []).length > 0 && (
                <div className="border-t border-ink-100 pt-3">
                  <p className="mb-1 text-xs font-medium text-ink-500">Comissões</p>
                  {(commissions ?? []).map((c) => <div key={c.id} className="flex justify-between py-1 text-xs"><span>{c.vendor_name}{c.percentage ? ` · ${c.percentage}%` : ""}</span><span>{formatMoney(c.amount)}</span></div>)}
                </div>
              )}
            </>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Audiovisual" />
          <CardBody className="space-y-3">
            {!av ? restricted : <>
              {(demands ?? []).map((d) => <Row key={d.id} title={`${humanize(d.demand_type)} · ${d.quantity}x`} meta={`Prazo ${formatDate(d.deadline)} · ${d.responsible_name}`} badge={<StatusBadge status={d.status} />} />)}
              {!demands?.length && <Empty>Nenhuma demanda audiovisual.</Empty>}
            </>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Agenda e tarefas" subtitle="Itens vinculados pelo nome do cliente" />
          <CardBody className="space-y-3">
            {(agenda ?? []).map((e) => <Row key={e.id} title={e.title} meta={`${formatDateTime(e.start_at)} · ${e.responsible_name}`} badge={<StatusBadge status={e.status} />} />)}
            {(tasks ?? []).map((t) => <Row key={t.id} title={t.title} meta={`Prazo ${formatDate(t.due_date)}`} badge={<StatusBadge status={t.status} />} />)}
            {!agenda?.length && !tasks?.length && <Empty>Nada agendado.</Empty>}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
