import { describe, expect, it } from "vitest";
import { computeTotals, estimatedMargin, lineTotal, moneyToInput, parseMoney } from "@/lib/commercial/calc";
import { PROPOSAL_TRANSITIONS, billingSuffix, isRecurringBilling } from "@/lib/commercial/options";

const items = [
  { quantity: 1, unit_price: 997, recurring: true },
  { quantity: 1, unit_price: 900, discount: 100, recurring: true },
  { quantity: 1, unit_price: 1997, recurring: false },
  { quantity: 2, unit_price: 150, recurring: false },
];

describe("computeTotals (mesma regra de private.compute_proposal_totals)", () => {
  it("separa recorrentes de únicos e aplica desconto percentual nos dois", () => {
    const t = computeTotals(items, { discount_type: "percentual", discount_value: 10, discount_target: "ambos", setup_fee: 500, extra_fees: 50 });
    expect(t.subtotal_recurring).toBe(1797);
    expect(t.subtotal_once).toBe(2297);
    expect(t.discount_recurring).toBe(179.7);
    expect(t.discount_once).toBe(229.7);
    expect(t.total_recurring).toBe(1617.3);
    expect(t.total_once).toBe(2617.3);
  });
  it("desconto percentual só nos recorrentes", () => {
    const t = computeTotals(items, { discount_type: "percentual", discount_value: 10, discount_target: "recorrente" });
    expect(t.discount_once).toBe(0);
    expect(t.total_once).toBe(2297);
    expect(t.total_recurring).toBe(1617.3);
  });
  it("desconto em reais é limitado ao subtotal do alvo e nunca deixa total negativo", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 100, recurring: true }], { discount_type: "valor", discount_value: 5000, discount_target: "recorrente" });
    expect(t.discount_recurring).toBe(100);
    expect(t.total_recurring).toBe(0);
  });
  it("desconto em reais com alvo 'ambos' não é aplicado (o banco também recusa)", () => {
    const t = computeTotals(items, { discount_type: "valor", discount_value: 100, discount_target: "ambos" });
    expect(t.discount_once + t.discount_recurring).toBe(0);
  });
  it("implantação e taxas entram só no total único", () => {
    const t = computeTotals([{ quantity: 1, unit_price: 997, recurring: true }], { setup_fee: 300, extra_fees: 45.5 });
    expect(t.total_recurring).toBe(997);
    expect(t.total_once).toBe(345.5);
  });
  it("linha nunca negativa e arredondada em centavos", () => {
    expect(lineTotal({ quantity: 1, unit_price: 100, discount: 150 })).toBe(0);
    expect(lineTotal({ quantity: 3, unit_price: 33.333 })).toBe(100);
    expect(computeTotals([]).total_once).toBe(0);
  });
});

describe("valores em reais", () => {
  it.each([
    ["1.997,50", 1997.5],
    ["1997.5", 1997.5],
    ["R$ 997", 997],
    ["1.997", 1997],
    ["0,99", 0.99],
    ["", null],
  ])("parseMoney(%s)", (input, expected) => expect(parseMoney(input)).toBe(expected));
  it("texto inválido vira NaN (o campo mantém o texto e mostra erro)", () => expect(parseMoney("abc")).toBeNaN());
  it("formata para edição", () => expect(moneyToInput(1997.5)).toMatch(/^1\.997,50$/));
});

describe("regras do catálogo e das propostas", () => {
  it("margem só com preço e custo", () => {
    expect(estimatedMargin(1000, 400)).toBe(60);
    expect(estimatedMargin(1000, null)).toBeNull();
    expect(estimatedMargin(0, 10)).toBeNull();
  });
  it("só a cobrança mensal é recorrente", () => {
    expect(isRecurringBilling("mensal")).toBe(true);
    for (const t of ["unico", "projeto", "producao", "hora", "personalizado"]) expect(isRecurringBilling(t)).toBe(false);
    expect(billingSuffix("mensal")).toBe("/mês");
    expect(billingSuffix("personalizado", "diária")).toBe("/diária");
  });
  it("transições: rascunho não vai direto para aprovada; aprovada só pode ser cancelada; cancelada é final", () => {
    expect(PROPOSAL_TRANSITIONS.rascunho).not.toContain("aprovada");
    expect(PROPOSAL_TRANSITIONS.aprovada).toEqual(["cancelada"]);
    expect(PROPOSAL_TRANSITIONS.cancelada).toEqual([]);
  });
});
