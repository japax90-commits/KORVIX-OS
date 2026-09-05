import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/StatCard";
import { FinanceSubnav } from "../FinanceSubnav";
import { formatCurrency } from "@/lib/mock-data";

const cashMovements = [
  { id: "cm_1", category: "reserva", direction: "entrada" as const, amount: 5000, description: "Aporte trimestral" },
  { id: "cm_2", category: "marketing", direction: "saida" as const, amount: 1200, description: "Tráfego pago — campanhas internas" },
  { id: "cm_3", category: "tecnologia", direction: "saida" as const, amount: 350, description: "Hospedagem e ferramentas" },
  { id: "cm_4", category: "comercial", direction: "saida" as const, amount: 900, description: "Comissões de indicação" },
];

const categories = ["reserva", "marketing", "comercial", "tecnologia", "contratacao", "expansao"];

export default function CaixaPage() {
  const saldo = cashMovements.reduce(
    (a, m) => a + (m.direction === "entrada" ? m.amount : -m.amount),
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink-900">Financeiro</h2>
        <p className="text-sm text-ink-500">
          Painel de caixa — deve sempre existir dinheiro em caixa, categorizado.
        </p>
      </div>

      <FinanceSubnav active="/financeiro/caixa" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Saldo em caixa" value={formatCurrency(saldo)} />
        <StatCard
          label="Entradas"
          value={formatCurrency(cashMovements.filter((m) => m.direction === "entrada").reduce((a, m) => a + m.amount, 0))}
        />
        <StatCard
          label="Saídas"
          value={formatCurrency(cashMovements.filter((m) => m.direction === "saida").reduce((a, m) => a + m.amount, 0))}
        />
      </div>

      <Card>
        <CardHeader title="Categorias de caixa" subtitle={categories.join(" · ")} />
        <CardBody className="!p-0">
          <div className="divide-y divide-ink-100">
            {cashMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-5 py-3.5">
                <div>
                  <p className="text-sm font-medium text-ink-900">{m.description}</p>
                  <p className="text-xs capitalize text-ink-500">{m.category}</p>
                </div>
                <span
                  className={`text-sm font-semibold ${
                    m.direction === "entrada" ? "text-success" : "text-danger"
                  }`}
                >
                  {m.direction === "entrada" ? "+" : "−"} {formatCurrency(m.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
