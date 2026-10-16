import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { SetupPending } from "@/components/commercial/CommercialTabs";
import { ProposalBuilder } from "@/components/commercial/ProposalBuilder";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/auth/server";
import { isMissingTable } from "@/lib/commercial/types";
import { loadBuilderData } from "../data";

type Search = { cliente?: string; oportunidade?: string; servico?: string; personalizada?: string };

export default async function NovaPropostaPage({ searchParams = {} }: { searchParams?: Search }) {
  const current = await requireModule("comercial");
  const s = await createClient();
  const data = await loadBuilderData(s);
  const custom = searchParams.personalizada === "1";
  const header = (
    <PageHeader
      title={custom ? "Criar serviço personalizado" : "Nova proposta"}
      description={custom ? "Monte uma oferta específica para um cliente, com itens do catálogo e itens próprios." : "Escolha o cliente, os serviços e as condições. Os totais são calculados automaticamente."}
      breadcrumbs={[{ label: "Comercial", href: "/comercial" }, { label: "Propostas", href: "/comercial/propostas" }, { label: custom ? "Serviço personalizado" : "Nova" }]}
    />
  );
  if (isMissingTable(data.error)) return <div className="space-y-6">{header}<SetupPending /></div>;
  if (data.error) return <ErrorState title="Erro ao carregar o catálogo" message={data.error.message} />;
  return (
    <div className="space-y-6">
      {header}
      <ProposalBuilder
        proposal={null}
        initialItems={[]}
        services={data.services}
        categories={data.categories}
        clients={data.clients}
        opportunities={data.opportunities}
        prefill={{ client_id: searchParams.cliente, opportunity_id: searchParams.oportunidade, service_id: searchParams.servico }}
        currentUserId={current.id}
        canSaveAsPackage={current.isAdmin}
        startCustom={custom}
      />
    </div>
  );
}
