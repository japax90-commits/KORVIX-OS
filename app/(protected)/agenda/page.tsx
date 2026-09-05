import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatusBadge, Badge } from "@/components/ui/Badge";
import { Plus, Calendar, Video, Users2, ClipboardList } from "lucide-react";
import { agendaEvents } from "@/lib/mock-data";
import type { AgendaEventType } from "@/lib/types";

const typeIcon: Record<AgendaEventType, React.ElementType> = {
  reuniao: Users2,
  visita: Calendar,
  gravacao: Video,
  tarefa: ClipboardList,
  compromisso_interno: Calendar,
};

const typeLabel: Record<AgendaEventType, string> = {
  reuniao: "Reunião",
  visita: "Visita",
  gravacao: "Gravação",
  tarefa: "Tarefa",
  compromisso_interno: "Compromisso interno",
};

function timeOf(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function AgendaPage() {
  const grouped = agendaEvents.reduce<Record<string, typeof agendaEvents>>((acc, e) => {
    const day = e.startAt.slice(0, 10);
    acc[day] = acc[day] ? [...acc[day], e] : [e];
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink-900">Agenda</h2>
          <p className="text-sm text-ink-500">
            Visão unificada — reuniões, visitas, gravações e compromissos internos.
          </p>
        </div>
        <button className="focus-ring flex items-center justify-center gap-2 rounded-lg bg-korvix-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-korvix-800">
          <Plus size={16} /> Novo evento
        </button>
      </div>

      <div className="flex gap-1.5 rounded-lg border border-ink-300 bg-white p-1 text-xs w-fit">
        {["Dia", "Semana", "Mês"].map((v, i) => (
          <button
            key={v}
            className={`rounded-md px-3 py-1.5 font-medium ${
              i === 1 ? "bg-korvix-900 text-white" : "text-ink-500 hover:bg-ink-100"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {Object.entries(grouped).map(([day, events]) => (
        <Card key={day}>
          <CardHeader
            title={new Date(day + "T00:00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          />
          <CardBody className="!p-0">
            <div className="divide-y divide-ink-100">
              {events.map((e) => {
                const Icon = typeIcon[e.type];
                return (
                  <div key={e.id} className="flex items-center gap-4 px-5 py-3.5">
                    <div className="w-14 shrink-0 text-xs text-ink-500">
                      {timeOf(e.startAt)}
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-korvix-50 text-korvix-600">
                      <Icon size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-ink-900">
                        {e.title}
                      </p>
                      <p className="text-xs text-ink-500">
                        {typeLabel[e.type]} · {e.responsibleName}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
