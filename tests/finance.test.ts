import { describe, expect, it } from "vitest";
import {
  calculateAverageTicket, calculateCashBalance, calculateCommissions, calculateConversionRate, calculateForecastRevenue,
  calculateMRR, calculateNetProfit, calculateOperationalExpenses, calculateOverdue, calculateProLabore, calculateRevenue, calculateTaxes,
} from "@/lib/finance/calculations";
import { KORVIX_PLAN_PRICES, getPlanByPrice } from "@/lib/business/plans";

const payments = [
  { amount: 1999, status: "pago", due_date: "2026-10-01" },
  { amount: "999", status: "pendente", due_date: "2026-10-01" },
  { amount: 2999, status: "pendente", due_date: "2026-12-01" },
  { amount: 500, status: "atrasado", due_date: "2026-09-01" },
  { amount: 700, status: "cancelado", due_date: "2026-09-01" },
];

describe("receitas", () => {
  it("recebido conta só pagos; previsto conta pendentes e atrasados", () => {
    expect(calculateRevenue(payments)).toBe(1999);
    expect(calculateForecastRevenue(payments)).toBe(999 + 2999 + 500);
  });
  it("inadimplência = atrasados + pendentes vencidos", () => {
    expect(calculateOverdue(payments, new Date("2026-10-15T12:00:00Z"))).toBe(999 + 500);
  });
});

describe("MRR", () => {
  it("normaliza a frequência e ignora contratos não ativos", () => {
    const contracts = [
      { value: 1999, frequency: "mensal", status: "ativo" },
      { value: 3000, frequency: "trimestral", status: "ativo" },
      { value: 12000, frequency: "anual", status: "ativo" },
      { value: 999, frequency: "mensal", status: "cancelado" },
    ];
    expect(calculateMRR(contracts)).toBe(1999 + 1000 + 1000);
  });
});

describe("caixa, despesas e impostos", () => {
  const cash = [
    { amount: 1999, direction: "entrada", category: "Receita" },
    { amount: 200, direction: "saida", category: "Comissão" },
    { amount: 120, direction: "saida", category: "Impostos" },
    { amount: 30, direction: "saida", category: "impostos" },
    { amount: 400, direction: "saida", category: "Pró-labore" },
    { amount: 50, direction: "saida", category: "marketing" },
  ];
  it("impostos são reconhecidos sem diferenciar caixa/acento", () => {
    expect(calculateTaxes(cash)).toBe(150);
  });
  it("despesa operacional exclui comissão, pró-labore e impostos (contados à parte)", () => {
    expect(calculateOperationalExpenses(cash)).toBe(50);
  });
  it("saldo = entradas − saídas", () => {
    expect(calculateCashBalance(cash)).toBe(1999 - 800);
  });
});

describe("resultado", () => {
  it("comissões canceladas não entram", () => {
    expect(calculateCommissions([{ amount: 100, status: "liberada" }, { amount: 50, status: "cancelada" }])).toBe(100);
  });
  it("pró-labore é 20% da receita e o lucro desconta tudo uma única vez", () => {
    expect(calculateProLabore(1000)).toBe(200);
    expect(calculateNetProfit(1000, 100, 50, 200, 30)).toBe(620);
  });
  it("conversão e ticket médio tratam divisão por zero", () => {
    expect(calculateConversionRate(0, 0)).toBe(0);
    expect(calculateConversionRate(1, 3)).toBe(25);
    expect(calculateAverageTicket([])).toBe(0);
    expect(calculateAverageTicket([999, 2999])).toBe(1999);
  });
});

describe("planos oficiais", () => {
  it("preços e busca por valor", () => {
    expect(KORVIX_PLAN_PRICES).toEqual({ Essencial: 999, Intermediário: 1999, Completo: 2999 });
    expect(getPlanByPrice(1999)?.name).toBe("Intermediário");
    expect(getPlanByPrice(1234)).toBeNull();
  });
});
