import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ErrorState } from "@/components/ui/PageHeader";
import { SetupPending } from "@/components/commercial/CommercialTabs";
import { ProposalDocument, proposalShareText } from "@/components/commercial/ProposalDocument";
import { ShareBar } from "@/components/commercial/ShareBar";
import { createClient } from "@/lib/supabase/server";
import { requireModule } from "@/lib/auth/server";
import { isMissingTable, type Proposal, type ProposalItem } from "@/lib/commercial/types";

export default async function ApresentacaoPage({ params }: { params: { id: string } }) {
  await requireModule("comercial");
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const s = await createClient();
  const [{ data: proposal, error }, { data: items }] = await Promise.all([
    s.from("proposals").select("*").eq("id", params.id).maybeSingle(),
    s.from("proposal_items").select("id,service_id,name,description,billing_type,recurring,quantity,unit_price,list_price,discount,line_total").eq("proposal_id", params.id).order("position"),
  ]);
  if (isMissingTable(error)) return <SetupPending />;
  if (error) return <ErrorState title="Erro ao carregar a proposta" message={error.message} />;
  if (!proposal) notFound();
  const p = proposal as Proposal;
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Link href={`/comercial/propostas/${p.id}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"><ArrowLeft size={15} /> Voltar para a proposta</Link>
        <ShareBar text={proposalShareText(p)} />
      </div>
      {p.status === "rascunho" && <p className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-ink-700 print:hidden">Rascunho: revise antes de enviar ao cliente.</p>}
      <ProposalDocument proposal={p} items={(items ?? []) as ProposalItem[]} />
    </div>
  );
}
