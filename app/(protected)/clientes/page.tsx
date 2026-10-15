import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { Input, Select, buttonClass } from "@/components/ui/Form";
import { ChevronRight, Users, Activity, RefreshCw, PauseCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CreateClientButton, ClientEditButton } from "@/components/operations/ClientForm";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/format";
import { CLIENT_STATUSES } from "@/lib/options";

export default async function ClientesPage({ searchParams }: { searchParams?: { q?: string; status?: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data, error }, { data: profile }] = await Promise.all([
    supabase.from("clients").select("id, company_name, contact_name, phone, niche, origin_owner_id, account_manager_id, operational_status, active_contract_value, active_plan_name, entry_date, created_at").order("created_at", { ascending: false }),
    supabase.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
  ]);
  if (error) return <ErrorState title="Não foi possível carregar os clientes" message={error.message} />;
  const all = data ?? [];
  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const status = searchParams?.status ?? "";
  const clients = all.filter((c) => (!status || c.operational_status === status) && (!q || `${c.company_name} ${c.contact_name} ${c.niche ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q)));
  const ids = Array.from(new Set(all.flatMap((c) => [c.origin_owner_id, c.account_manager_id]).filter(Boolean)));
  const { data: people } = ids.length ? await supabase.from("users").select("id,name").in("id", ids) : { data: [] as { id: string; name: string }[] };
  const owner = (id: string | null) => people?.find((p) => p.id === id)?.name ?? "—";
  const count = (s: string) => all.filter((c) => c.operational_status === s).length;
  const admin = isKorvixAdmin(profile);
  const columns: Column<(typeof clients)[number]>[] = [
    { header: "Cliente", cell: (c) => <div className="min-w-0"><Link href={`/clientes/${c.id}`} className="font-medium text-ink-900 hover:text-korvix-700">{c.company_name}</Link><p className="text-xs text-ink-500">{c.contact_name}{c.phone ? ` · ${c.phone}` : ""}</p></div> },
    { header: "Status", cell: (c) => <StatusBadge status={c.operational_status} /> },
    { header: "Plano", cell: (c) => c.active_plan_name || "—", hideOnMobile: true },
    { header: "Valor", cell: (c) => (c.active_contract_value ? formatMoney(c.active_contract_value) : "—"), hideOnMobile: true },
    { header: "Origem / Atendimento", cell: (c) => <span className="text-xs text-ink-500">{owner(c.origin_owner_id)} / {owner(c.account_manager_id)}</span>, hideOnMobile: true },
    { header: "Ações", className: "text-right", cell: (c) => <div className="flex items-center justify-end gap-1"><ClientEditButton client={c} canDelete={admin} /><Link href={`/clientes/${c.id}`} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-medium text-korvix-600 hover:bg-korvix-50">Ficha <ChevronRight size={14} /></Link></div> },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Clientes" description="Visão 360º e acompanhamento do ciclo de vida operacional." actions={<CreateClientButton currentUserId={user.id} />} />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Em onboarding" value={String(count("onboarding"))} icon={Users} />
        <StatCard label="Em operação" value={String(count("operacao"))} icon={Activity} />
        <StatCard label="Em renovação" value={String(count("renovacao"))} icon={RefreshCw} />
        <StatCard label="Pausados" value={String(count("pausado"))} icon={PauseCircle} />
      </div>
      <Card>
        <CardHeader title="Todos os clientes" subtitle={`${clients.length} de ${all.length} cliente(s)`} />
        <form className="flex flex-col gap-2 border-b border-ink-100 px-5 py-3 sm:flex-row" role="search">
          <Input name="q" defaultValue={searchParams?.q ?? ""} placeholder="Buscar por empresa, contato, nicho ou telefone" className="sm:flex-1" aria-label="Buscar clientes" />
          <Select name="status" defaultValue={status} className="sm:w-48" aria-label="Filtrar por status">
            <option value="">Todos os status</option>
            {CLIENT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </Select>
          <button className={buttonClass("secondary")}>Filtrar</button>
          {(q || status) && <Link href="/clientes" className={buttonClass("ghost")}>Limpar</Link>}
        </form>
        <DataTable columns={columns} rows={clients} emptyLabel={q || status ? "Nenhum cliente encontrado com esses filtros." : "Nenhum cliente cadastrado. Use Novo cliente para começar."} />
      </Card>
    </div>
  );
}
