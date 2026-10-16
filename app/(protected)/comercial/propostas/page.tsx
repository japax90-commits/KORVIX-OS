import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { buttonClass, inputClass } from "@/components/ui/Form";
import { CommercialTabs, SetupPending } from "@/components/commercial/CommercialTabs";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/auth/server";
import { isMissingTable, type Proposal } from "@/lib/commercial/types";
import { PROPOSAL_STATUSES, RECURRENCE_PERIODS } from "@/lib/commercial/options";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

type Search = { q?: string; status?: string; sort?: string; dir?: string; page?: string };
type Row = Pick<Proposal, "id" | "code" | "title" | "client_name" | "status" | "total_once" | "total_recurring" | "recurrence_period" | "valid_until" | "updated_at">;

export default async function PropostasPage({ searchParams = {} }: { searchParams?: Search }) {
  await requireModule("comercial");
  const s = await createClient();
  const { data, error } = await s.from("proposals").select("id,code,title,client_name,status,total_once,total_recurring,recurrence_period,valid_until,updated_at").order("updated_at", { ascending: false });
  const header = (
    <PageHeader
      title="Comercial"
      description="Propostas personalizadas por cliente."
      breadcrumbs={[{ label: "Comercial", href: "/comercial" }, { label: "Propostas" }]}
      actions={<Link href="/comercial/propostas/nova" className={buttonClass("primary")}><Plus size={16} /> Nova proposta</Link>}
    />
  );
  if (isMissingTable(error)) return <div className="space-y-6">{header}<CommercialTabs active="propostas" /><SetupPending /></div>;
  if (error) return <ErrorState title="Erro ao carregar as propostas" message={error.message} />;

  const all = (data ?? []) as Row[];
  const term = (searchParams.q ?? "").trim().toLowerCase();
  const rows = all.filter((p) => (!searchParams.status || p.status === searchParams.status) && (!term || `${p.code} ${p.title} ${p.client_name}`.toLowerCase().includes(term)));
  const suffix = (p: Row) => RECURRENCE_PERIODS.find((r) => r.value === p.recurrence_period)?.suffix ?? "/mês";
  const columns: Column<Row>[] = [
    { header: "Proposta", sortKey: "titulo", sortValue: (p) => p.title, cell: (p) => <Link href={`/comercial/propostas/${p.id}`} className="block hover:underline"><span className="font-medium text-ink-900">{p.title}</span><span className="block text-xs text-ink-500">{p.code} · {p.client_name}</span></Link> },
    { header: "Status", cell: (p) => <StatusBadge status={p.status} /> },
    { header: "Recorrente", sortKey: "recorrente", sortValue: (p) => Number(p.total_recurring), cell: (p) => <span className="tabular-nums">{Number(p.total_recurring) ? `${formatMoney(p.total_recurring)}${suffix(p)}` : "—"}</span> },
    { header: "Único", sortKey: "unico", sortValue: (p) => Number(p.total_once), cell: (p) => <span className="tabular-nums">{Number(p.total_once) ? formatMoney(p.total_once) : "—"}</span>, hideOnMobile: true },
    { header: "Validade", cell: (p) => formatDate(p.valid_until), hideOnMobile: true },
    { header: "Atualizada", sortKey: "atualizada", sortValue: (p) => p.updated_at, cell: (p) => formatDate(p.updated_at), hideOnMobile: true },
  ];
  return (
    <div className="space-y-6">
      {header}
      <CommercialTabs active="propostas" counts={{ propostas: all.length }} />
      <form className="flex flex-col gap-2 sm:flex-row" role="search">
        <div className="relative sm:flex-1">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input name="q" defaultValue={searchParams.q} placeholder="Buscar por código, título ou cliente" aria-label="Buscar propostas" className={cn(inputClass, "pl-9")} />
        </div>
        <select name="status" defaultValue={searchParams.status ?? ""} aria-label="Filtrar por status" className={cn(inputClass, "sm:w-48")}>
          <option value="">Todos os status</option>
          {PROPOSAL_STATUSES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
        </select>
        <button type="submit" className={buttonClass("secondary")}>Filtrar</button>
      </form>
      <Card>
        <DataTable columns={columns} rows={rows} emptyLabel={all.length ? "Nenhuma proposta com esses filtros." : "Nenhuma proposta criada ainda."} navigation={{ pathname: "/comercial/propostas", params: searchParams }} />
      </Card>
    </div>
  );
}
