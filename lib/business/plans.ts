export const KORVIX_PLANS = {
  Essencial: {
    name: "Essencial",
    price: 999,
    services: ["Google Meu Negócio", "Tráfego Pago (anúncio cobrado à parte)"],
  },
  Intermediário: {
    name: "Intermediário",
    price: 1999,
    services: [
      "Google Meu Negócio",
      "Tráfego Pago (anúncio cobrado à parte)",
      "Gestão de Mídias Sociais",
      "3 Visitas Presenciais por mês",
    ],
  },
  Completo: {
    name: "Completo",
    price: 2999,
    services: [
      "Google Meu Negócio",
      "Tráfego Pago (anúncio cobrado à parte)",
      "Gestão de Mídias Sociais",
      "3 Visitas Presenciais por mês",
      "Site Profissional",
      "Agente de IA",
    ],
  },
} as const;

export type KorvixPlanName = keyof typeof KORVIX_PLANS;

export const KORVIX_PLAN_PRICES = Object.fromEntries(
  Object.entries(KORVIX_PLANS).map(([name, plan]) => [name, plan.price]),
) as Record<KorvixPlanName, number>;

export function getPlanByPrice(value: number) {
  return Object.values(KORVIX_PLANS).find((plan) => plan.price === value) ?? null;
}
