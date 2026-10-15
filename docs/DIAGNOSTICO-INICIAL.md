# KORVIX OS — Diagnóstico inicial (redesign premium)

Data: 15/10/2026 · Branch: `claude/lucid-bohr-53rt6z` @ `ad21261` · Base `main` @ `9e32bb2`

## Estado do repositório (protegido antes de qualquer mudança)

| Item | Situação |
| --- | --- |
| Árvore de trabalho | Limpa, sincronizada com `origin/claude/lucid-bohr-53rt6z` |
| `main` | Sem commits novos desde `9e32bb2` (produção) |
| PR #5 (`codex/audit-security-hardening`, aberto) | Seus 2 commits já estão incorporados nesta branch (merge); não alterado |
| `korvix/rbac-hardening`, `korvix/supabase-infra` | Snapshots antigos, já contidos em `main`; PRs fechados; não alterados |
| Banco de produção | Apenas leitura. 1 usuário, 44 oportunidades, demais tabelas vazias. Migration `20261015120000` **não aplicada** |

## Stack confirmada

Next.js 14.2 (App Router, Server Components) · React 18 · TypeScript · Tailwind 3.4 ·
Supabase (Auth + Postgres/RLS, cliente SSR) · lucide-react · Vitest · Vercel.

Módulos reais: CRM, Comercial, Clientes (+ficha), Financeiro (visão geral, pagamentos,
contratos, caixa, comissões, indicações), Audiovisual, Agenda, Tarefas, Equipe,
Auditoria, Dashboard; autenticação (login, recuperação e troca de senha).

## Inventário — o que este ciclo precisa resolver

| # | P | Módulo / arquivo | Problema | Evidência | Critério de validação |
|---|---|---|---|---|---|
| D1 | P2 | Global (`tailwind.config.ts`, 27× `bg-white`) | Sem tema escuro; cores fixas | `darkMode` ausente; 0 variantes `dark:` | Alternar tema em todas as páginas sem texto ilegível |
| D2 | P2 | Global (35 ocorrências `red/green/amber-*`) | Cores de estado fora da paleta, quebram no escuro | grep | Alertas legíveis nos dois temas |
| D3 | P2 | Botões (14× `bg-korvix-900`) | Ação primária em azul-marinho some no tema escuro; azul-claro não é usado para ações | grep | Contraste AA do botão primário nos dois temas |
| D4 | P2 | Overlays (`bg-ink-900/50`) | Inverteriam no escuro | grep | Overlay escuro nos dois temas |
| D5 | P1 | Início (`lib/auth/permissions.ts`) | Tela inicial do admin é Dashboard; preferência é CRM | `homeRouteFor` | Login leva ao CRM para todos os perfis com CRM |
| D6 | P1 | CRM (`app/(protected)/crm`) | Sem visão do dia: follow-ups vencidos, tarefas e agenda não aparecem; sem indicadores; só Kanban | código | Painel com dados reais e links diretos |
| D7 | P1 | CRM | Sem visão em lista com ordenação/paginação | código | Ordenar e paginar resultados |
| D8 | P2 | Tabelas (`components/ui/Table.tsx`, 8 telas) | Sem ordenação e paginação | código | Parâmetros de URL alteram ordem e página |
| D9 | P2 | Confirmações (13× `window.confirm`) | Diálogo nativo, fora do padrão visual e sem foco controlado | grep | Diálogo próprio acessível |
| D10 | P2 | Feedback | Sucesso só fecha o modal; sem notificação | código | Toast após operação concluída (nunca em falha) |
| D11 | P2 | Navegação lateral | Não recolhe no desktop | código | Recolher/expandir persistente, sem "pulo" no carregamento |
| D12 | P2 | Abas | Subnav do financeiro é componente próprio; não há componente de abas comum | código | Componente único reutilizado |
| D13 | P3 | Movimento | Sem respeito a `prefers-reduced-motion` | CSS | Animações desligadas quando o SO pede |
| D14 | P0 | Banco | RPCs de pagamento e RLS (ver `AUDITORIA-E-COBERTURA.md`) | réplica local | Bloqueado: requer autorização para aplicar migration |

Itens já resolvidos nos ciclos anteriores (permissões por rota e página, formulários,
datas, layout responsivo, estados de carregamento/erro, testes) estão em
`docs/AUDITORIA-E-COBERTURA.md` e não são repetidos aqui.

## Estratégia

1. **Tokens de design via variáveis CSS** mapeadas nas escalas que o código já usa
   (`ink-*`, `korvix-*`) + tokens semânticos (`surface`, `primary`). Assim o tema escuro
   vale para todas as telas sem reescrever cada classe, e o que não inverte
   (superfícies, estados, botão primário) é migrado para tokens semânticos.
2. Tema aplicado por script inline no `<head>` antes da pintura (sem flash); preferência
   no `localStorage` do navegador (claro / escuro / sistema).
3. CRM como página inicial e centro operacional, só com métricas de regra clara.
4. Componentes compartilhados novos: Tabs, ConfirmDialog, Toast, Pagination/ordenação.
5. Validação por fase: tsc, lint, Vitest, build e navegador (6 larguras × 2 temas).

Registro do que foi feito: `docs/REGISTRO-DE-IMPLEMENTACAO.md`.
