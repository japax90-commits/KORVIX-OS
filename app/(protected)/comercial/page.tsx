import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { DataTable, type Column } from "@/components/ui/Table";
import { StatCard } from "@/components/ui/StatCard";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import Link from "next/link";
import { Trophy, TrendingDown, FileCheck, Check, Banknote, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { KORVIX_PLANS } from "@/lib/business/plans";
import { isKorvixAdmin } from "@/lib/auth/permissions";
import { formatMoney } from "@/lib/format";
import { CreateGoalButton, GoalActions } from "@/components/operations/Goals";
import { requireModule } from "@/lib/auth/server";
import { buttonClass } from "@/components/ui/Form";
import { CommercialTabs } from "@/components/commercial/CommercialTabs";
import { ServiceIcon } from "@/components/commercial/ServiceIcon";
import { billingSuffix } from "@/lib/commercial/options";
import { SERVICE_COLUMNS, isMissingTable, type Service } from "@/lib/commercial/types";

export default async function ComercialPage() {
  await requireModule("comercial");
  const s = await createClient();
  const { data: { user } } = await s.auth.getUser();
  if (!user) return null;
  const [{ data: opp, error }, { data: goals }, { data: profile }, { data: team }] = await Promise.all([
    s.from("opportunities").select("id,client_name,origin_owner_id,closing_user_id,stage,estimated_value,probability,loss_reason").order("created_at", { ascending: false }),
    s.from("goals").select("id,vendor_id,vendor_name,metric,period,target,achieved").order("created_at", { ascending: false }),
    s.from("users").select("id,email,role,active").eq("id", user.id).maybeSingle(),
    s.from("users").select("id,name").eq("active", true).order("name"),
  ]);
  if (error) return <ErrorState title="Erro ao carregar o comercial" message={error.message} />;
  // Catálogo e propostas (migration 20261016120000). Sem a migration, mantém os planos do código.
  const [{ data: catalog, error: catalogError }, { data: proposals }] = await Promise.all([
    s.from("services").select(SERVICE_COLUMNS).eq("status", "ativo").order("featured", { ascending: false }).order("name"),
    s.from("proposals").select("id,status"),
  ]);
  const catalogReady = !isMissingTable(catalogError) && !catalogError;
  const featured = ((catalog ?? []) as unknown as Service[]).filter((x) => x.featured).slice(0, 6);
  const openProposals = (proposals ?? []).filter((x) => ["rascunho", "enviada", "negociacao"].includes(x.status)).length;
  const admin = isKorvixAdmin(profile);
  const rows = opp ?? [];
  const closing = rows.filter((o) => ["proposta", "negociacao"].includes(o.stage));
  const won = rows.filter((o) => ["ganho", "fechado_ganho"].includes(o.stage));
  const lost = rows.filter((o) => ["perdido", "fechado_perdido"].includes(o.stage));
  const users = team ?? [];
  const ids = Array.from(new Set(rows.flatMap((o) => [o.origin_owner_id, o.closing_user_id]).filter(Boolean)));
  const missing = ids.filter((id) => !users.some((u) => u.id === id));
  const { data: extra } = missing.length ? await s.from("users").select("id,name").in("id", missing) : { data: [] as { id: string; name: string }[] };
  const name = (id: string | null) => [...users, ...(extra ?? [])].find((u) => u.id === id)?.name ?? "—";
  const columns: Column<(typeof rows)[number]>[] = [
    { header: "Cliente", cell: (o) => <div><p className="font-medium">{o.client_name}</p><p className="text-xs text-ink-500">Origem: {name(o.origin_owner_id)}{o.closing_user_id && o.closing_user_id !== o.origin_owner_id ? ` · Fechamento: ${name(o.closing_user_id)}` : ""}</p></div> },
    { header: "Etapa", cell: (o) => <StatusBadge status={o.stage} /> },
    { header: "Valor", cell: (o) => formatMoney(o.estimated_value || 0), hideOnMobile: true },
    { header: "Probabilidade", cell: (o) => `${o.probability ?? 0}%`, hideOnMobile: true },
  ];
  return (
    <div className="space-y-6">
      <PageHeader title="Comercial" description="Catálogo, propostas, metas e perdas, alimentados pelo CRM." />
      <CommercialTabs active="geral" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Em proposta/negociação" value={String(closing.length)} icon={FileCheck} />
        <StatCard label="Vendas fechadas" value={String(won.length)} icon={Trophy} />
        <StatCard label="Perdidas" value={String(lost.length)} icon={TrendingDown} />
        <StatCard label="Valor em negociação" value={formatMoney(closing.reduce((a, o) => a + Number(o.estimated_value || 0), 0))} icon={Banknote} />
      </div>
      {catalogReady ? (
        <Card>
          <CardHeader
            title="Destaques do catálogo"
            subtitle={`${(catalog ?? []).length} serviços e pacotes ativos · ${openProposals} proposta(s) em aberto`}
            action={<div className="flex gap-2"><Link href="/comercial/catalogo" className={buttonClass("secondary", undefined, "sm")}>Ver catálogo</Link><Link href="/comercial/propostas/nova" className={buttonClass("primary", undefined, "sm")}><Plus size={14} /> Nova proposta</Link></div>}
          />
          <CardBody>
            {featured.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((svc) => (
                  <Link key={svc.id} href={`/comercial/propostas/nova?servico=${svc.id}`} className="focus-ring flex gap-3 rounded-xl border border-ink-200 p-4 transition-colors hover:border-korvix-300">
                    <ServiceIcon icon={svc.icon} imageUrl={svc.image_url} />
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900">{svc.name}</p>
                      <p className="text-sm font-bold tabular-nums text-korvix-700">{formatMoney(svc.price)}<span className="text-xs font-normal text-ink-500">{billingSuffix(svc.billing_type, svc.billing_unit)}</span></p>
                      {svc.short_description && <p className="mt-1 line-clamp-2 text-xs text-ink-500">{svc.short_description}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-500">Nenhum serviço marcado como destaque. Marque “Destaque comercial” no catálogo.</p>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
        <CardHeader title="Planos KORVIX DIGITAL" subtitle="Tabela comercial oficial · tráfego pago cobrado à parte" />
        <CardBody>
          <div className="grid gap-4 md:grid-cols-3">
            {Object.values(KORVIX_PLANS).map((plan) => (
              <div key={plan.name} className="flex flex-col rounded-xl border border-ink-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink-900">{plan.name}</p>
                    <p className="mt-1 text-2xl font-bold text-korvix-700">{formatMoney(plan.price)}<span className="text-xs font-normal text-ink-500">/mês</span></p>
                  </div>
                  {plan.name === "Intermediário" && <span className="rounded-full bg-korvix-50 px-2 py-1 text-[11px] font-semibold text-korvix-700">Mais escolhido</span>}
                </div>
                <ul className="mt-4 space-y-2">{plan.services.map((service) => <li key={service} className="flex gap-2 text-sm text-ink-700"><Check size={15} className="mt-0.5 shrink-0 text-korvix-600" />{service}</li>)}</ul>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
      )}
      <Card>
        <CardHeader title="Oportunidades em proposta e negociação (CRM)" subtitle={`${closing.length} em andamento`} />
        <DataTable columns={columns} rows={closing} emptyLabel="Nenhuma proposta em andamento." />
      </Card>
      <Card>
        <CardHeader title="Metas por vendedor" subtitle="Realizado x meta" action={admin ? <CreateGoalButton users={users} /> : undefined} />
        <CardBody className="space-y-5">
          {(goals ?? []).map((g) => {
            const pct = Math.min(100, Number(g.target) ? Math.round((Number(g.achieved) / Number(g.target)) * 100) : 0);
            return (
              <div key={g.id}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 font-medium">{g.vendor_name} — {g.metric} <span className="font-normal text-ink-500">({g.period})</span></span>
                  <span className="flex shrink-0 items-center gap-2 tabular-nums text-ink-500">{Number(g.achieved)} / {Number(g.target)} · {pct}%{admin && <GoalActions goal={{ ...g, target: Number(g.target), achieved: Number(g.achieved) }} users={users} />}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"><div className="h-full rounded-full bg-korvix-500" style={{ width: `${pct}%` }} /></div>
              </div>
            );
          })}
          {!(goals ?? []).length && <p className="text-sm text-ink-500">{admin ? "Nenhuma meta cadastrada. Use Nova meta para definir a primeira." : "Nenhuma meta definida pela administração."}</p>}
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Oportunidades perdidas" subtitle="Motivo de perda" />
        <DataTable columns={[{ header: "Cliente", cell: (o) => <span className="font-medium">{o.client_name}</span> }, { header: "Motivo", cell: (o) => <span className="whitespace-normal">{o.loss_reason ?? "—"}</span> }, { header: "Valor", cell: (o) => formatMoney(o.estimated_value || 0) }]} rows={lost} emptyLabel="Nenhuma oportunidade perdida." />
      </Card>
    </div>
  );
}
