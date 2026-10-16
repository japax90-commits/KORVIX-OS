"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileSignature, Presentation, Receipt, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAction } from "@/lib/hooks/useAction";
import { useConfirm } from "@/components/ui/Feedback";
import { Field, FormError, Input, Select, buttonClass } from "@/components/ui/Form";
import { Modal } from "@/components/ui/Modal";
import { PROPOSAL_TRANSITIONS, TRANSITION_LABELS, type ProposalStatus } from "@/lib/commercial/options";
import { PAYMENT_METHODS, PAYMENT_TYPES } from "@/lib/options";
import type { Proposal } from "@/lib/commercial/types";
import { formatMoney, todayISO } from "@/lib/format";

export function ProposalActions({ proposal, isAdmin }: { proposal: Proposal; isAdmin: boolean }) {
  const router = useRouter();
  const { run, busy, error } = useAction();
  const confirm = useConfirm();
  const [contractOpen, setContractOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const next = PROPOSAL_TRANSITIONS[proposal.status] ?? [];

  async function transition(status: ProposalStatus) {
    const messages: Partial<Record<ProposalStatus, string>> = {
      aprovada: "Marcar a proposta como aprovada? O conteúdo fica bloqueado para edição. Nenhum pagamento é registrado como recebido.",
      cancelada: "Cancelar esta proposta? Ela fica no histórico, mas não poderá ser reaberta.",
      recusada: "Marcar a proposta como recusada pelo cliente?",
    };
    if (messages[status] && !(await confirm({ title: TRANSITION_LABELS[status], description: messages[status]!, confirmLabel: "Confirmar", tone: status === "cancelada" ? "danger" : "default" }))) return;
    await run(async () => {
      // A versão impede sobrescrever uma alteração feita em outra aba/pessoa.
      const { data, error: e } = await createClient().from("proposals").update({ status, version: proposal.version + 1 }).eq("id", proposal.id).eq("version", proposal.version).select("id").maybeSingle();
      if (e) return { error: e };
      if (!data) return { error: { message: "A proposta foi alterada em outro lugar. Recarregue a página para ver a versão atual." } };
    }, { success: `Status atualizado: ${TRANSITION_LABELS[status].replace("Marcar como ", "")}.` });
  }

  async function remove() {
    if (!(await confirm({ title: "Excluir rascunho", description: `Excluir a proposta ${proposal.code}? Esta ação não pode ser desfeita.`, confirmLabel: "Excluir" }))) return;
    await run(async () => {
      const { error: e, count } = await createClient().from("proposals").delete({ count: "exact" }).eq("id", proposal.id).eq("status", "rascunho");
      if (e) return { error: e };
      if (!count) return { error: { message: "Somente rascunhos podem ser excluídos. Para encerrar, cancele a proposta." } };
    }, { success: "Proposta excluída.", onSuccess: () => router.replace("/comercial/propostas") });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Link href={`/comercial/propostas/${proposal.id}/apresentacao`} className={buttonClass("secondary", undefined, "sm")}><Presentation size={14} /> Versão para o cliente</Link>
        {next.map((status) => (
          <button key={status} type="button" disabled={busy} onClick={() => transition(status)} className={buttonClass(status === "aprovada" ? "primary" : status === "cancelada" ? "ghost" : "secondary", undefined, "sm")}>
            {TRANSITION_LABELS[status]}
          </button>
        ))}
        {proposal.status === "rascunho" && <button type="button" disabled={busy} onClick={remove} className={buttonClass("ghost", "text-danger hover:bg-danger/10 hover:text-danger", "sm")}><Trash2 size={14} /> Excluir</button>}
      </div>

      {proposal.status === "aprovada" && (
        <div className="rounded-xl border border-success/30 bg-success/5 p-4 text-sm">
          <p className="font-medium text-ink-900">Próximos passos da proposta aprovada</p>
          <p className="mt-1 text-ink-600">Gere os registros no Financeiro quando o cliente confirmar. Cada um só pode ser gerado uma vez.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {proposal.contract_id ? (
              <Link href="/financeiro/contratos" className={buttonClass("secondary", undefined, "sm")}><FileSignature size={14} /> Contrato gerado — ver no Financeiro</Link>
            ) : proposal.total_recurring > 0 ? (
              isAdmin ? <button type="button" onClick={() => setContractOpen(true)} className={buttonClass("primary", undefined, "sm")}><FileSignature size={14} /> Gerar contrato ({formatMoney(proposal.total_recurring)})</button> : <span className="text-xs text-ink-500">A administração gera o contrato recorrente.</span>
            ) : null}
            {proposal.payment_id ? (
              <Link href="/financeiro/pagamentos" className={buttonClass("secondary", undefined, "sm")}><Receipt size={14} /> Cobrança lançada — ver no Financeiro</Link>
            ) : proposal.total_once > 0 ? (
              isAdmin ? <button type="button" onClick={() => setPaymentOpen(true)} className={buttonClass("secondary", undefined, "sm")}><Receipt size={14} /> Lançar cobrança pendente ({formatMoney(proposal.total_once)})</button> : <span className="text-xs text-ink-500">A administração lança a cobrança dos valores únicos.</span>
            ) : null}
          </div>
          {!proposal.client_id && <p className="mt-2 text-xs text-warning">Vincule a proposta a um cliente cadastrado para gerar contrato ou cobrança.</p>}
        </div>
      )}
      <FormError message={error} />
      {contractOpen && <ContractModal proposal={proposal} onClose={() => setContractOpen(false)} />}
      {paymentOpen && <PaymentModal proposal={proposal} onClose={() => setPaymentOpen(false)} />}
    </div>
  );
}

function ContractModal({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const { run, busy, error } = useAction();
  const [start, setStart] = useState(todayISO());
  const [nextBilling, setNextBilling] = useState("");
  return (
    <Modal open onClose={onClose} title="Gerar contrato" description={`${proposal.title} · ${formatMoney(proposal.total_recurring)} (${proposal.recurrence_period})`} size="sm"
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="button" disabled={busy || !start} onClick={() => run(async () => createClient().rpc("create_contract_from_proposal", { p_id: proposal.id, p_start_date: start, p_next_billing: nextBilling || null }), { success: "Contrato gerado no Financeiro.", onSuccess: onClose })} className={buttonClass("primary")}>{busy ? "Gerando..." : "Gerar contrato"}</button></>}>
      <div className="space-y-4">
        <Field label="Início do contrato"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></Field>
        <Field label="Próxima cobrança (opcional)"><Input type="date" value={nextBilling} onChange={(e) => setNextBilling(e.target.value)} /></Field>
        <p className="text-xs text-ink-500">O contrato é criado como ativo em nome do cliente vinculado. Se ele já tiver sido gerado, nada é duplicado.</p>
        <FormError message={error} />
      </div>
    </Modal>
  );
}

function PaymentModal({ proposal, onClose }: { proposal: Proposal; onClose: () => void }) {
  const { run, busy, error } = useAction();
  const [due, setDue] = useState(todayISO());
  const [method, setMethod] = useState("pix");
  const [type, setType] = useState("primeira_venda");
  return (
    <Modal open onClose={onClose} title="Lançar cobrança pendente" description={`Valores únicos: ${formatMoney(proposal.total_once)}`} size="sm"
      footer={<><button type="button" onClick={onClose} className={buttonClass("secondary")}>Cancelar</button><button type="button" disabled={busy || !due} onClick={() => run(async () => createClient().rpc("create_payment_from_proposal", { p_id: proposal.id, p_due_date: due, p_method: method, p_type: type }), { success: "Cobrança pendente lançada no Financeiro.", onSuccess: onClose })} className={buttonClass("primary")}>{busy ? "Lançando..." : "Lançar como pendente"}</button></>}>
      <div className="space-y-4">
        <Field label="Vencimento"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} required /></Field>
        <Field label="Forma de pagamento"><Select value={method} onChange={(e) => setMethod(e.target.value)}>{PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Field>
        <Field label="Tipo"><Select value={type} onChange={(e) => setType(e.target.value)}>{PAYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</Select></Field>
        <p className="text-xs text-ink-500">A cobrança entra como <strong>pendente</strong>. O recebimento só é registrado quando confirmado em Financeiro → Pagamentos.</p>
        <FormError message={error} />
      </div>
    </Modal>
  );
}
