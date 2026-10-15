import { afterEach, describe, expect, it, vi } from "vitest";
import { friendlyError } from "@/lib/errors";
import { MONTHLY_CONTRACT_GOAL, isClosedThisMonth } from "@/lib/business/goals";

afterEach(() => vi.useRealTimers());

describe("friendlyError", () => {
  it("traduz erros técnicos sem expor detalhes do banco", () => {
    expect(friendlyError('new row violates row-level security policy for table "clients"')).toMatch(/permissão/);
    expect(friendlyError("permission denied for function confirm_payment_and_sync_finance")).toMatch(/permissão/);
    expect(friendlyError('update or delete on table "clients" violates foreign key constraint')).toMatch(/vinculado/);
    expect(friendlyError("TypeError: Failed to fetch")).toMatch(/conexão/);
    expect(friendlyError("JWT expired")).toMatch(/sessão/);
  });
});

describe("meta mensal", () => {
  it("contrato criado às 23h do último dia do mês conta no mês de São Paulo", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-31T15:00:00Z"));
    expect(isClosedThisMonth("2026-11-01T02:00:00Z")).toBe(true); // 31/10 23:00 em SP
    expect(isClosedThisMonth("2026-09-30T12:00:00Z")).toBe(false);
    expect(MONTHLY_CONTRACT_GOAL).toBe(5);
  });
});
