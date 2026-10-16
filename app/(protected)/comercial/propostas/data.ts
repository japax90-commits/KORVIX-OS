import type { SupabaseClient } from "@supabase/supabase-js";
import { SERVICE_COLUMNS, type Service, type ServiceCategory } from "@/lib/commercial/types";

/** Dados de apoio do construtor: catálogo ativo, clientes e leads visíveis ao usuário. */
export async function loadBuilderData(s: SupabaseClient) {
  const [services, categories, clients, opportunities] = await Promise.all([
    s.from("services").select(SERVICE_COLUMNS).eq("status", "ativo").order("featured", { ascending: false }).order("name"),
    s.from("service_categories").select("id,name,description,sort_order").order("sort_order"),
    s.from("clients").select("id,company_name").order("company_name"),
    s.from("opportunities").select("id,client_name,stage").order("created_at", { ascending: false }),
  ]);
  return {
    error: services.error,
    services: (services.data ?? []) as unknown as Service[],
    categories: (categories.data ?? []) as ServiceCategory[],
    clients: clients.data ?? [],
    opportunities: opportunities.data ?? [],
  };
}
