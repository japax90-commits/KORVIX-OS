import { describe, expect, it } from "vitest";
import { crmMetrics, followupAgenda, isOpenStage, normalizeStage } from "@/lib/crm";
import { paginate, sortRows, withParams } from "@/lib/table";

// 15/10/2026 14:00 em São Paulo
const NOW = new Date("2026-10-15T17:00:00Z");
const opp = (id: string, stage: string, value: number, probability: number, followup: string | null) => ({ id, client_name: `C${id}`, stage, estimated_value: value, probability, next_followup_at: followup });

const rows = [
  opp("1", "lead", 1000, 10, "2026-10-14T13:00:00Z"), // atrasado
  opp("2", "proposta", 2000, 50, "2026-10-15T20:00:00Z"), // hoje 17h SP
  opp("3", "negociacao", "3000" as unknown as number, 70, "2026-10-16T02:30:00Z"), // hoje 23h30 SP
  opp("4", "qualificacao", 500, 25, "2026-10-20T12:00:00Z"), // próximos dias
  opp("5", "qualificacao", 500, 25, "2026-11-30T12:00:00Z"), // fora da janela de 7 dias
  opp("6", "ganho", 1999, 100, "2026-10-01T12:00:00Z"), // fechada: ignora follow-up
  opp("7", "fechado_perdido", 999, 0, null),
  opp("8", "negociacao", 100, 999, null), // probabilidade inválida limitada a 100%
];

describe("etapas", () => {
  it("normaliza etapas legadas e desconhecidas", () => {
    expect(normalizeStage("fechado_ganho")).toBe("ganho");
    expect(normalizeStage("fechado_perdido")).toBe("perdido");
    expect(normalizeStage("xyz")).toBe("lead");
    expect(isOpenStage("fechado_ganho")).toBe(false);
    expect(isOpenStage("proposta")).toBe(true);
  });
});

describe("crmMetrics", () => {
  const m = crmMetrics(rows, NOW);
  it("pipeline e previsão ponderada só de etapas abertas", () => {
    expect(m.openCount).toBe(6);
    expect(m.openValue).toBe(1000 + 2000 + 3000 + 500 + 500 + 100);
    expect(m.weightedValue).toBeCloseTo(100 + 1000 + 2100 + 125 + 125 + 100);
  });
  it("follow-ups atrasados, hoje e sem data", () => {
    expect(m.overdueFollowups).toBe(1);
    expect(m.todayFollowups).toBe(2);
    expect(m.withoutFollowup).toBe(1);
  });
  it("conversão = ganhas ÷ (ganhas + perdidas)", () => {
    expect(m.won).toBe(1);
    expect(m.lost).toBe(1);
    expect(m.conversion).toBe(50);
  });
});

describe("followupAgenda", () => {
  it("ordena por data, classifica e respeita a janela", () => {
    const list = followupAgenda(rows, NOW, 7);
    expect(list.map((f) => [f.id, f.bucket])).toEqual([["1", "atrasado"], ["2", "hoje"], ["3", "hoje"], ["4", "proximos"]]);
  });
});

describe("tabelas", () => {
  const data = [{ id: "a", n: "Beta", v: 2 }, { id: "b", n: "alfa", v: null }, { id: "c", n: "Ágata", v: 10 }];
  it("ordena texto em pt-BR sem diferenciar acento/caixa e deixa vazios no fim", () => {
    expect(sortRows(data, (r) => r.n, "asc").map((r) => r.id)).toEqual(["c", "b", "a"]); // Ágata, alfa, Beta
    expect(sortRows(data, (r) => r.v, "asc").map((r) => r.id)).toEqual(["a", "c", "b"]);
    expect(sortRows(data, (r) => r.v, "desc").map((r) => r.id)).toEqual(["c", "a", "b"]);
  });
  it("pagina com limites seguros", () => {
    const items = Array.from({ length: 45 }, (_, i) => i);
    expect(paginate(items, "2", 20)).toMatchObject({ page: 2, pageCount: 3, from: 21, to: 40 });
    expect(paginate(items, "99", 20)).toMatchObject({ page: 3, from: 41, to: 45 });
    expect(paginate(items, "abc", 20).page).toBe(1);
    expect(paginate([], "1", 20)).toMatchObject({ page: 1, pageCount: 1, from: 0, total: 0 });
  });
  it("monta URLs preservando filtros", () => {
    expect(withParams("/crm", { view: "lista", q: "x", page: "2" }, { page: undefined, sort: "valor" })).toBe("/crm?view=lista&q=x&sort=valor");
  });
});
