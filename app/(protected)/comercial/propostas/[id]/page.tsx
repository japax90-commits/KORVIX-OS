import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { PageHeader, ErrorState } from "@/components/ui/PageHeader";
import { SetupPending } from "@/components/commercial/CommercialTabs";
import { ProposalBuilder } from "@/components/commercial/ProposalBuilder";
import { ProposalActions } from "@/components/commercial/ProposalActions";
import { ProposalDocument } from "@/components/commercial/ProposalDocument";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/auth/server";
import { isMissingTable, type Proposal, type ProposalItem } from "@/lib/commercial/types";
import { EDITABLE_PROPOSAL_STATUSES } from "@/lib/commercial/options";
import { formatDateTime } from "@/lib/format";
import { loadBuilderData } from "../data";

export default async function PropostaPage({ params }: { params: { id: string } }) {
  const current = await requireModule("comercial");
  const s = await createClient();
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const [{ data: proposal, error }, { data: items }] = await Promise.all([
    s.from("proposals").select("*").eq("id", params.id).maybeSingle(),
    s.from("proposal_items").select("id,service_id,name,description,billing_type,recurring,quantity,unit_price,list_price,discount,line_total").eq("proposal_id", params.id).order("position"),
  ]);
  if (isMissingTable(error)) return <SetupPending />;
  if (error) return <ErrorState title="Erro ao carregar a proposta" message={error.message} />;
  if (!proposal) notFound();
  const p = proposal as Proposal;
  const rows = (items ?? []) as ProposalItem[];
  const editable = EDITABLE_PROPOSAL_STATUSES.includes(p.status);
  const data = editable ? await loadBuilderData(s) : null;
  const { data: author } = await s.from("users").select("name").eq("id", p.created_by).maybeSingle();

  return (
    <div className="space-y-6">
      <PageHeader
        title={p.title}
        description={`${p.code} · ${p.client_name}`}
        breadcrumbs={[{ label: "Comercial", href: "/comercial" }, { label: "Propostas", href: "/comercial/propostas" }, { label: p.code }]}
      />
      <Card>
        <CardBody className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
            <StatusBadge status={p.status} />
            <span>Responsável: {author?.name ?? "—"}</span>
            <span>Atualizada em {formatDateTime(p.updated_at)}</span>
            {p.client_id && <Link href={`/clientes/${p.client_id}`} className="font-medium text-korvix-600 hover:underline">Ver cliente</Link>}
            {p.opportunity_id && <Link href={`/crm?lead=${p.opportunity_id}`} className="font-medium text-korvix-600 hover:underline">Ver lead no CRM</Link>}
          </div>
          <ProposalActions proposal={p} isAdmin={current.isAdmin} />
        </CardBody>
      </Card>
      {editable && data ? (
        <ProposalBuilder
          key={`${p.id}-${p.version}`}
          proposal={p}
          initialItems={rows}
          services={data.services}
          categories={data.categories}
          clients={data.clients}
          opportunities={data.opportunities}
          currentUserId={current.id}
          canSaveAsPackage={current.isAdmin}
        />
      ) : (
        <>
          <p className="text-sm text-ink-500">Esta proposta está {p.status === "aprovada" ? "aprovada" : p.status} e não pode mais ser editada. Abaixo, a versão apresentada ao cliente.</p>
          {p.internal_notes && <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 text-sm"><p className="font-medium text-ink-900">Observações internas</p><p className="whitespace-pre-line text-ink-600">{p.internal_notes}</p></div>}
          <ProposalDocument proposal={p} items={rows} />
        </>
      )}
    </div>
  );
}
