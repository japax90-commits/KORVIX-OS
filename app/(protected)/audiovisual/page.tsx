import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { Plus, Link2 } from "lucide-react";
import { avDemands, formatDate } from "@/lib/mock-data";
import type { AvDemandStatus } from "@/lib/types";

const stages: { key: AvDemandStatus; label: string }[] = [
  { key: "DEMAND", label: "Demanda" },
  { key: "SCHEDULED", label: "Agendado" },
  { key: "VISIT", label: "Visita" },
  { key: "CAPTURE", label: "Captação" },
  { key: "TRANSFER", label: "Transferência" },
  { key: "EDITING", label: "Edição" },
  { key: "INTERNAL_REVIEW", label: "Revisão interna" },
  { key: "CLIENT_APPROVAL", label: "Aprovação cliente" },
  { key: "FINALIZED", label: "Finalizado" },
  { key: "PUBLISHED", label: "Publicado" },
];

export default function AudiovisualPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">
            Audiovisual
          </h2>
          <p className="text-sm text-ink-500">
            Pipeline de produção — links externos, sem armazenamento de arquivo pesado.
          </p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} /> Nova demanda
        </button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex gap-3" style={{ minWidth: "1700px" }}>
          {stages.map((stage) => {
            const items = avDemands.filter((d) => d.status === stage.key);
            return (
              <div key={stage.key} className="w-[190px] shrink-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[12.5px] font-semibold text-ink-900">
                    {stage.label}
                  </p>
                  <span className="text-xs text-ink-500">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((d) => (
                    <div
                      key={d.id}
                      className="cursor-pointer rounded-lg border border-ink-100 bg-white p-3 shadow-sm hover:border-korvix-300"
                    >
                      <p className="text-[13px] font-medium text-ink-900">
                        {d.clientName}
                      </p>
                      <p className="mt-0.5 text-[11px] capitalize text-ink-500">
                        {d.demandType.replace("_", " ")} · {d.quantity}x
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-ink-500">
                          {d.responsibleName}
                        </span>
                        <span className="text-[11px] text-ink-500">
                          {formatDate(d.deadline)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {items.length === 0 && (
                    <div className="rounded-lg border border-dashed border-ink-300 p-3 text-center text-[10px] text-ink-500">
                      Vazio
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader
          icon={<Link2 size={16} />}
          title="Entregas com link externo"
          subtitle="eTransfer ou Drive — apenas o link é registrado no sistema"
        />
        <CardBody className="space-y-2">
          <p className="text-sm text-ink-500">
            Nenhum arquivo audiovisual é armazenado no KORVIX OS no MVP. Cada
            demanda registra apenas o link de transferência, o tipo de
            conteúdo e o status de aprovação.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
