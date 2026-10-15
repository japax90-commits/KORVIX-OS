import { afterEach, describe, expect, it, vi } from "vitest";
import { dayKey, formatDate, formatDateTime, formatMoney, formatTime, fromDateTimeLocal, humanize, isPastDay, toDateTimeLocal, todayISO } from "@/lib/format";

afterEach(() => vi.useRealTimers());

describe("datas no fuso America/Sao_Paulo", () => {
  it("data pura (coluna date) não volta um dia", () => {
    expect(formatDate("2026-10-15")).toBe("15/10/2026");
    expect(formatDate("2026-01-01")).toBe("01/01/2026");
  });
  it("timestamp à noite no Brasil pertence ao mesmo dia (não ao dia UTC)", () => {
    // 23:30 de 15/10 em São Paulo = 02:30 UTC de 16/10
    expect(dayKey("2026-10-16T02:30:00Z")).toBe("2026-10-15");
    expect(formatTime("2026-10-16T02:30:00Z")).toBe("23:30");
    expect(formatDateTime("2026-10-16T02:30:00Z")).toBe("15/10/2026, 23:30");
  });
  it("'hoje' usa o dia de São Paulo mesmo após 21h", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T01:00:00Z")); // 22:00 de 15/10 em SP
    expect(todayISO()).toBe("2026-10-15");
    expect(isPastDay("2026-10-14")).toBe(true);
    expect(isPastDay("2026-10-15")).toBe(false);
    expect(isPastDay(null)).toBe(false);
  });
  it("datetime-local ida e volta preserva o instante", () => {
    const iso = "2026-10-15T13:45:00.000Z";
    expect(fromDateTimeLocal(toDateTimeLocal(iso))).toBe(iso);
    expect(fromDateTimeLocal("")).toBeNull();
    expect(toDateTimeLocal(null)).toBe("");
  });
  it("valores inválidos exibem traço em vez de 'Invalid Date'", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate("lixo")).toBe("—");
  });
});

describe("moeda e textos", () => {
  it("formata BRL e trata vazios", () => {
    expect(formatMoney(1999).replace(/\s/g, " ")).toBe("R$ 1.999,00");
    expect(formatMoney("2999.5").replace(/\s/g, " ")).toBe("R$ 2.999,50");
    expect(formatMoney(null)).toBe("—");
    expect(formatMoney("abc")).toBe("—");
  });
  it("humaniza códigos", () => {
    expect(humanize("primeira_venda")).toBe("Primeira venda");
    expect(humanize(null)).toBe("—");
  });
});
