import { FileText, LayoutGrid, LineChart } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";

export function CommercialTabs({ active, counts }: { active: "geral" | "catalogo" | "propostas"; counts?: { catalogo?: number; propostas?: number } }) {
  return (
    <Tabs
      label="Seções do Comercial"
      items={[
        { href: "/comercial", label: "Visão geral", active: active === "geral", icon: <LineChart size={15} /> },
        { href: "/comercial/catalogo", label: "Catálogo", active: active === "catalogo", count: counts?.catalogo, icon: <LayoutGrid size={15} /> },
        { href: "/comercial/propostas", label: "Propostas", active: active === "propostas", count: counts?.propostas, icon: <FileText size={15} /> },
      ]}
    />
  );
}

/** Aviso quando a migration do Comercial ainda não foi aplicada no banco. */
export function SetupPending() {
  return (
    <div role="status" className="rounded-xl border border-warning/30 bg-warning/10 p-5 text-sm text-ink-700">
      <p className="font-semibold text-ink-900">Catálogo e propostas ainda não estão ativados neste banco de dados</p>
      <p className="mt-1">
        As tabelas do módulo Comercial são criadas pela migration <code className="rounded bg-surface px-1">20261016120000_commercial_catalog_and_proposals.sql</code>,
        que depende de autorização da administração para ser aplicada. Nenhum dado existente foi alterado.
      </p>
    </div>
  );
}
