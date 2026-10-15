import { Tabs } from "@/components/ui/Tabs";

const subnav = [
  { href: "/financeiro", label: "Visão geral" },
  { href: "/financeiro/pagamentos", label: "Pagamentos" },
  { href: "/financeiro/contratos", label: "Contratos" },
  { href: "/financeiro/caixa", label: "Caixa" },
  { href: "/financeiro/comissoes", label: "Comissões" },
  { href: "/financeiro/indicacoes", label: "Indicações" },
];

export function FinanceSubnav({ active }: { active: string }) {
  return <Tabs label="Seções do financeiro" items={subnav.map((item) => ({ ...item, active: item.href === active }))} />;
}
