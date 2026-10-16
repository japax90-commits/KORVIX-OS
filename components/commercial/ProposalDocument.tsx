import { BILLING_TYPES, RECURRENCE_PERIODS, label } from "@/lib/commercial/options";
import type { Proposal, ProposalItem } from "@/lib/commercial/types";
import { formatDate, formatMoney } from "@/lib/format";

const lines = (text: string | null) => (text ?? "").split("\n").map((l) => l.trim()).filter(Boolean);

/** Versão apresentável da proposta (sem observações internas nem custos). */
export function ProposalDocument({ proposal, items }: { proposal: Proposal; items: ProposalItem[] }) {
  const suffix = RECURRENCE_PERIODS.find((r) => r.value === proposal.recurrence_period)?.suffix ?? "/mês";
  const recurring = items.filter((i) => i.recurring);
  const once = items.filter((i) => !i.recurring);
  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section className="break-inside-avoid"><h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-korvix-700">{title}</h3>{children}</section>
  );
  const ItemTable = ({ rows, title }: { rows: ProposalItem[]; title: string }) => (
    <>
    {/* Celular: lista empilhada (sem rolagem lateral). */}
    <ul className="divide-y divide-ink-100 sm:hidden print:hidden">
      {rows.map((i, idx) => (
        <li key={i.id ?? idx} className="py-3 text-sm">
          <div className="flex items-start justify-between gap-3"><span className="font-medium text-ink-900">{i.name}</span><span className="shrink-0 font-medium tabular-nums">{formatMoney(i.line_total)}</span></div>
          {i.description && <p className="text-xs text-ink-500">{i.description}</p>}
          <p className="mt-1 text-xs text-ink-500">{Number(i.quantity).toLocaleString("pt-BR")} × {formatMoney(i.unit_price)} · {label(BILLING_TYPES, i.billing_type)}</p>
          {Number(i.discount) > 0 && <p className="text-xs text-success">Desconto de {formatMoney(i.discount)}</p>}
        </li>
      ))}
    </ul>
    <div className="hidden overflow-x-auto sm:block print:block">
      <table className="w-full min-w-[480px] text-sm">
        <caption className="sr-only">{title}</caption>
        <thead><tr className="border-b border-ink-200 text-left text-xs text-ink-500"><th className="py-2 pr-3 font-medium">Item</th><th className="py-2 pr-3 font-medium">Cobrança</th><th className="py-2 pr-3 text-right font-medium">Qtd.</th><th className="py-2 pr-3 text-right font-medium">Valor unit.</th><th className="py-2 text-right font-medium">Total</th></tr></thead>
        <tbody className="divide-y divide-ink-100">
          {rows.map((i, idx) => (
            <tr key={i.id ?? idx} className="align-top">
              <td className="py-2.5 pr-3"><span className="font-medium text-ink-900">{i.name}</span>{i.description && <span className="block text-xs text-ink-500">{i.description}</span>}{Number(i.discount) > 0 && <span className="block text-xs text-success">Desconto de {formatMoney(i.discount)}</span>}</td>
              <td className="py-2.5 pr-3 text-ink-600">{label(BILLING_TYPES, i.billing_type)}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{Number(i.quantity).toLocaleString("pt-BR")}</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{formatMoney(i.unit_price)}</td>
              <td className="py-2.5 text-right font-medium tabular-nums">{formatMoney(i.line_total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
  return (
    <article className="proposal-document mx-auto max-w-3xl space-y-8 rounded-2xl border border-ink-200 bg-surface p-6 shadow-panel sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none">
      <header className="flex flex-col gap-4 border-b border-ink-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-korvix-900 text-base font-bold text-korvix-200">K</div>
          <div><p className="font-semibold text-ink-900">KORVIX <span className="text-korvix-600">DIGITAL</span></p><p className="text-xs text-ink-500">Proposta comercial</p></div>
        </div>
        <div className="text-sm sm:text-right">
          <p className="font-medium text-ink-900">{proposal.code}</p>
          <p className="text-ink-500">Emitida em {formatDate(proposal.sent_at ?? proposal.updated_at)}</p>
          {proposal.valid_until && <p className="text-ink-500">Válida até {formatDate(proposal.valid_until)}</p>}
        </div>
      </header>
      <div>
        <p className="text-sm text-ink-500">Preparada para</p>
        <h2 className="text-2xl font-semibold text-ink-900">{proposal.client_name}</h2>
        <p className="mt-1 text-lg text-ink-700">{proposal.title}</p>
      </div>
      {proposal.objective && <Section title="Objetivo"><p className="whitespace-pre-line text-sm text-ink-700">{proposal.objective}</p></Section>}
      {proposal.description && <Section title="Solução proposta"><p className="whitespace-pre-line text-sm text-ink-700">{proposal.description}</p></Section>}
      {recurring.length > 0 && <Section title="Serviços recorrentes"><ItemTable rows={recurring} title="Serviços recorrentes" /></Section>}
      {once.length > 0 && <Section title="Serviços e entregas únicas"><ItemTable rows={once} title="Serviços únicos" /></Section>}
      {!items.length && <p className="text-sm text-ink-500">Nenhum item adicionado.</p>}
      <Section title="Investimento">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-korvix-200 bg-korvix-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-korvix-700">Recorrente</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{formatMoney(proposal.total_recurring)}<span className="text-sm font-normal text-ink-500">{suffix}</span></p>
            {Number(proposal.discount_recurring) > 0 && <p className="text-xs text-success">Inclui desconto de {formatMoney(proposal.discount_recurring)}</p>}
          </div>
          <div className="rounded-xl border border-ink-200 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-500">Pagamento único</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">{formatMoney(proposal.total_once)}</p>
            <ul className="mt-1 space-y-0.5 text-xs text-ink-500">
              {Number(proposal.subtotal_once) > 0 && <li>Serviços: {formatMoney(proposal.subtotal_once)}</li>}
              {Number(proposal.discount_once) > 0 && <li className="text-success">Desconto: − {formatMoney(proposal.discount_once)}</li>}
              {Number(proposal.setup_fee) > 0 && <li>Implantação: {formatMoney(proposal.setup_fee)}</li>}
              {Number(proposal.extra_fees) > 0 && <li>{proposal.extra_fees_label || "Taxas adicionais"}: {formatMoney(proposal.extra_fees)}</li>}
            </ul>
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-500">Valores recorrentes e únicos são cobrados separadamente.</p>
      </Section>
      {proposal.scope && <Section title="Escopo"><p className="whitespace-pre-line text-sm text-ink-700">{proposal.scope}</p></Section>}
      {lines(proposal.deliverables).length > 0 && <Section title="Entregáveis"><ul className="space-y-1 text-sm text-ink-700">{lines(proposal.deliverables).map((d) => <li key={d}>• {d}</li>)}</ul></Section>}
      {(proposal.included || proposal.not_included) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {proposal.included && <Section title="Incluído"><ul className="space-y-1 text-sm text-ink-700">{lines(proposal.included).map((d) => <li key={d}>✓ {d}</li>)}</ul></Section>}
          {proposal.not_included && <Section title="Não incluído"><ul className="space-y-1 text-sm text-ink-700">{lines(proposal.not_included).map((d) => <li key={d}>— {d}</li>)}</ul></Section>}
        </div>
      )}
      {(proposal.payment_terms || proposal.delivery_terms) && (
        <Section title="Condições">
          <dl className="space-y-2 text-sm">
            {proposal.payment_terms && <div><dt className="font-medium text-ink-900">Pagamento</dt><dd className="whitespace-pre-line text-ink-700">{proposal.payment_terms}</dd></div>}
            {proposal.delivery_terms && <div><dt className="font-medium text-ink-900">Prazo</dt><dd className="whitespace-pre-line text-ink-700">{proposal.delivery_terms}</dd></div>}
          </dl>
        </Section>
      )}
    </article>
  );
}

/** Texto curto para enviar pelo WhatsApp (o envio é feito pelo próprio usuário). */
export function proposalShareText(proposal: Proposal) {
  const suffix = RECURRENCE_PERIODS.find((r) => r.value === proposal.recurrence_period)?.suffix ?? "/mês";
  const parts = [`Olá! Segue o resumo da proposta ${proposal.code} — ${proposal.title}.`];
  if (Number(proposal.total_recurring) > 0) parts.push(`Recorrente: ${formatMoney(proposal.total_recurring)}${suffix}`);
  if (Number(proposal.total_once) > 0) parts.push(`Pagamento único: ${formatMoney(proposal.total_once)}`);
  if (proposal.valid_until) parts.push(`Válida até ${formatDate(proposal.valid_until)}.`);
  return parts.join("\n");
}
