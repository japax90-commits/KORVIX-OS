import { describe, expect, it } from "vitest";
import { allowedModules, canAccessModule, homeRouteFor, isKorvixAdmin, moduleForPath } from "@/lib/auth/permissions";

const admin = { id: "1", email: "KorvixDigital@gmail.com", role: "ceo", active: true };
const ceo = { id: "2", email: "outro@x.com", role: "ceo", active: true };
const cofundador = { id: "3", email: "c@x.com", role: "cofundador", active: true };
const vendedor = { id: "4", email: "v@x.com", role: "vendedor", active: true };

describe("isKorvixAdmin", () => {
  it("só a conta principal ativa é administradora (e-mail sem diferenciar caixa)", () => {
    expect(isKorvixAdmin(admin)).toBe(true);
    expect(isKorvixAdmin({ ...admin, active: false })).toBe(false);
    expect(isKorvixAdmin(ceo)).toBe(false);
    expect(isKorvixAdmin(cofundador)).toBe(false);
    expect(isKorvixAdmin(null)).toBe(false);
  });
});

describe("canAccessModule", () => {
  it("administrador acessa todos os módulos", () => {
    expect(allowedModules(admin)).toEqual(["dashboard", "crm", "comercial", "clientes", "financeiro", "audiovisual", "agenda", "equipe", "tarefas", "auditoria"]);
  });
  it("cofundador acessa apenas CRM, Agenda e Tarefas", () => {
    expect(allowedModules(cofundador)).toEqual(["crm", "agenda", "tarefas"]);
  });
  it("demais papéis acessam CRM, Comercial, Clientes, Agenda e Tarefas", () => {
    expect(allowedModules(vendedor)).toEqual(["crm", "comercial", "clientes", "agenda", "tarefas"]);
    expect(allowedModules(ceo)).toEqual(["crm", "comercial", "clientes", "agenda", "tarefas"]);
  });
  it("financeiro, equipe e auditoria são negados a não administradores", () => {
    for (const m of ["financeiro", "equipe", "auditoria", "dashboard", "audiovisual"]) {
      expect(canAccessModule(vendedor, m)).toBe(false);
      expect(canAccessModule(cofundador, m)).toBe(false);
    }
  });
  it("usuário inativo ou ausente não acessa nada (falha fechada)", () => {
    expect(allowedModules({ ...vendedor, active: false })).toEqual([]);
    expect(canAccessModule(undefined, "crm")).toBe(false);
    expect(canAccessModule(vendedor, "modulo-inexistente")).toBe(false);
  });
});

describe("rotas", () => {
  it("identifica o módulo pela rota, inclusive subrotas", () => {
    expect(moduleForPath("/financeiro/caixa")).toBe("financeiro");
    expect(moduleForPath("/clientes/abc")).toBe("clientes");
    expect(moduleForPath("/login")).toBeNull();
    expect(moduleForPath("/")).toBeNull();
  });
  it("página inicial é o primeiro módulo permitido", () => {
    expect(homeRouteFor(admin)).toBe("/dashboard");
    expect(homeRouteFor(vendedor)).toBe("/crm");
    expect(homeRouteFor({ ...vendedor, active: false })).toMatch(/^\/login/);
  });
});
