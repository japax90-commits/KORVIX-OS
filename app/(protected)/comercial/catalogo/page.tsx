import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { CommercialTabs, SetupPending } from "@/components/commercial/CommercialTabs";
import { CatalogView } from "@/components/commercial/CatalogView";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/auth/server";
import { SERVICE_COLUMNS, isMissingTable, type Service, type ServiceCategory, type ServiceInternal } from "@/lib/commercial/types";

export default async function CatalogoPage() {
  const current = await requireModule("comercial");
  const s = await createClient();
  const [{ data: services, error }, { data: categories }] = await Promise.all([
    s.from("services").select(SERVICE_COLUMNS).order("name"),
    s.from("service_categories").select("id,name,description,sort_order").order("sort_order").order("name"),
  ]);
  const header = <PageHeader title="Comercial" description="Catálogo de serviços, pacotes e preços da Korvix Digital." breadcrumbs={[{ label: "Comercial", href: "/comercial" }, { label: "Catálogo" }]} />;
  if (isMissingTable(error)) return <div className="space-y-6">{header}<CommercialTabs active="catalogo" /><SetupPending /></div>;
  if (error) return <ErrorState title="Erro ao carregar o catálogo" message={error.message} />;

  // Custos/observações e uso em propostas: somente a administração (RLS também restringe).
  let internals: ServiceInternal[] = [];
  const usage: Record<string, number> = {};
  if (current.isAdmin) {
    const [{ data: internalRows }, { data: used }] = await Promise.all([
      s.from("service_internals").select("service_id,internal_cost,internal_notes"),
      s.from("proposal_items").select("service_id,proposal_id").not("service_id", "is", null),
    ]);
    internals = (internalRows ?? []) as ServiceInternal[];
    const seen = new Set<string>();
    for (const row of used ?? []) {
      const key = `${row.service_id}:${row.proposal_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      usage[row.service_id as string] = (usage[row.service_id as string] ?? 0) + 1;
    }
  }
  const rows = (services ?? []) as unknown as Service[];
  return (
    <div className="space-y-6">
      {header}
      <CommercialTabs active="catalogo" counts={{ catalogo: rows.filter((r) => r.status !== "arquivado").length }} />
      <CatalogView services={rows} categories={(categories ?? []) as ServiceCategory[]} internals={internals} canEdit={current.isAdmin} usage={usage} />
    </div>
  );
}
