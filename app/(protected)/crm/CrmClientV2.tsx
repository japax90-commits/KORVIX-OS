"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X } from "lucide-react";

const stages = ["lead", "qualificacao", "proposta", "negociacao", "ganho", "perdido"] as const;
const labels: Record<(typeof stages)[number], string> = {
  lead: "Lead",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganho: "Ganho",
  perdido: "Perdido",
};
const probabilities: Record<(typeof stages)[number], number> = {
  lead: 10,
  qualificacao: 25,
  proposta: 50,
  negociacao: 70,
  ganho: 100,
  perdido: 0,
};

type Stage = (typeof stages)[number];
type Row = {
  id: string;
  client_name: string;
  origin_owner_id: string | null;
  closing_user_id: string | null;
  channel: string | null;
  stage: string;
  priority: string | null;
  estimated_value: number | null;
  probability: number | null;
  next_action: string | null;
  next_followup_at: string | null;
  loss_reason: string | null;
};
type User = { id: string; name: string };

type Props = {
  opportunities: Row[];
  users: User[];
  currentUserId: string;
};

function normalizeStage(value: string): Stage {
  return (stages as readonly string[]).includes(value) ? (value as Stage) : "lead";
}

function toDatetimeLocal(value: string | null) {
  if (!value) return "";
  return value.slice(0, 16);
}

function toIsoOrNull(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function CrmClientV2({ opportunities, users, currentUserId }: Props) {
  const [items, setItems] = useState(opportunities);
  const [selected, setSelected] = useState<Row | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function move(id: string, stage: Stage) {
    setError("");
    const { data, error: updateError } = await createClient()
      .from("opportunities")
      .update({
        stage,
        probability: probabilities[stage],
        last_interaction_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
      return;
    }

    if (data) {
      setItems((current) => current.map((item) => (item.id === id ? (data as Row) : item)));
    }
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const stage = normalizeStage(String(form.get("stage") || "lead"));
    const clientName = String(form.get("client_name") || "").trim();
    const lossReason = String(form.get("loss_reason") || "").trim();

    if (!clientName) {
      setError("Informe o cliente.");
      setSaving(false);
      return;
    }

    if (stage === "perdido" && !lossReason) {
      setError("Informe o motivo da perda.");
      setSaving(false);
      return;
    }

    const estimatedValue = Number(form.get("estimated_value") || 0);
    const probability = Number(form.get("probability") || probabilities[stage]);

    if (!Number.isFinite(estimatedValue) || estimatedValue < 0) {
      setError("Informe um valor válido.");
      setSaving(false);
      return;
    }

    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      setError("A probabilidade deve estar entre 0 e 100.");
      setSaving(false);
      return;
    }

    const payload = {
      client_name: clientName,
      stage,
      priority: String(form.get("priority") || "media"),
      channel: String(form.get("channel") || "whatsapp").trim() || null,
      origin_owner_id: selected.origin_owner_id,
      closing_user_id: String(form.get("closing_user_id") || "") || null,
      estimated_value: estimatedValue,
      probability,
      next_action: String(form.get("next_action") || "").trim() || null,
      next_followup_at: toIsoOrNull(String(form.get("next_followup_at") || "")),
      loss_reason: stage === "perdido" ? lossReason : null,
      last_interaction_at: new Date().toISOString(),
    };

    const { data, error: updateError } = await createClient()
      .from("opportunities")
      .update(payload)
      .eq("id", selected.id)
      .select("*")
      .single();

    if (updateError) {
      setError(updateError.message);
    } else if (data) {
      setItems((current) => current.map((item) => (item.id === data.id ? (data as Row) : item)));
      setSelected(null);
    }

    setSaving(false);
  }

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 overflow-x-auto pb-4 md:grid-cols-3 xl:grid-cols-6">
        {stages.map((stage) => {
          const stageItems = items.filter((item) => normalizeStage(item.stage) === stage);

          return (
            <section key={stage} className="min-w-[250px] rounded-xl border bg-slate-50 p-3">
              <div className="mb-3 flex justify-between">
                <h3 className="font-semibold">{labels[stage]}</h3>
                <span className="rounded-full bg-white px-2 py-1 text-xs">{stageItems.length}</span>
              </div>

              {stageItems.map((item) => (
                <article key={item.id} className="mb-3 rounded-xl border bg-white p-3 shadow-sm">
                  <button type="button" className="w-full text-left" onClick={() => setSelected(item)}>
                    <div className="font-medium">{item.client_name}</div>
                    <div className="text-sm text-slate-500">
                      R$ {(item.estimated_value || 0).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {item.priority || "media"} · {item.probability ?? probabilities[stage]}%
                    </div>
                  </button>

                  <select
                    className="mt-2 w-full rounded-lg border p-1.5 text-xs"
                    value={normalizeStage(item.stage)}
                    onChange={(event) => move(item.id, normalizeStage(event.target.value))}
                    aria-label="Mover etapa"
                  >
                    {stages.map((option) => (
                      <option key={option} value={option}>
                        {labels[option]}
                      </option>
                    ))}
                  </select>
                </article>
              ))}
            </section>
          );
        })}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}
        >
          <form onSubmit={save} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex justify-between">
              <h2 className="text-xl font-semibold">Editar oportunidade</h2>
              <button type="button" onClick={() => setSelected(null)} aria-label="Fechar">
                <X />
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label>
                Cliente
                <input name="client_name" defaultValue={selected.client_name} className="mt-1 w-full rounded-lg border p-2.5" required />
              </label>

              <label>
                Etapa
                <select name="stage" defaultValue={normalizeStage(selected.stage)} className="mt-1 w-full rounded-lg border p-2.5">
                  {stages.map((stage) => (
                    <option key={stage} value={stage}>{labels[stage]}</option>
                  ))}
                </select>
              </label>

              <label>
                Prioridade
                <select name="priority" defaultValue={selected.priority || "media"} className="mt-1 w-full rounded-lg border p-2.5">
                  {["baixa", "media", "alta", "urgente"].map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>

              <label>
                Responsável
                <select name="closing_user_id" defaultValue={selected.closing_user_id || currentUserId} className="mt-1 w-full rounded-lg border p-2.5">
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </label>

              <label>
                Canal
                <input name="channel" defaultValue={selected.channel || "whatsapp"} className="mt-1 w-full rounded-lg border p-2.5" />
              </label>

              <label>
                Valor
                <input name="estimated_value" type="number" min="0" step="0.01" defaultValue={selected.estimated_value || 0} className="mt-1 w-full rounded-lg border p-2.5" />
              </label>

              <label>
                Probabilidade %
                <input name="probability" type="number" min="0" max="100" defaultValue={selected.probability ?? probabilities[normalizeStage(selected.stage)]} className="mt-1 w-full rounded-lg border p-2.5" />
              </label>

              <label>
                Follow-up
                <input name="next_followup_at" type="datetime-local" defaultValue={toDatetimeLocal(selected.next_followup_at)} className="mt-1 w-full rounded-lg border p-2.5" />
              </label>

              <label className="md:col-span-2">
                Próxima ação
                <input name="next_action" defaultValue={selected.next_action || ""} className="mt-1 w-full rounded-lg border p-2.5" />
              </label>

              <label className="md:col-span-2">
                Motivo da perda
                <textarea name="loss_reason" defaultValue={selected.loss_reason || ""} className="mt-1 w-full rounded-lg border p-2.5" />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border px-4 py-2">Cancelar</button>
              <button disabled={saving} className="rounded-lg bg-slate-900 px-4 py-2 text-white">
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
