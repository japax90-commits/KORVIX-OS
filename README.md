# KORVIX OS

Sistema operacional interno da Korvix Digital: CRM, comercial, clientes,
financeiro (pagamentos, contratos, caixa, comissões, indicações), audiovisual,
agenda, tarefas, equipe e auditoria.

**Stack:** Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS ·
Supabase (Auth + Postgres com RLS) · deploy na Vercel.

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha URL e chave publicável do Supabase
npm run dev
```

Verificações (as mesmas da CI em `.github/workflows/ci.yml`):

```bash
npx tsc --noEmit
npm run lint
npm test        # Vitest: permissões, datas, cálculos financeiros
npm run build
```

## Arquitetura

```
app/
  (auth)/login, forgot-password, reset-password   → Supabase Auth
  (protected)/layout.tsx                          → sidebar, topbar, perfil e notificações reais
  (protected)/<módulo>/page.tsx                   → Server Components que leem o Supabase
  actions/auth.ts                                 → logout (Server Action)
middleware.ts                                     → sessão + RBAC por rota (falha fechada)
components/
  layout/      → Sidebar, Topbar, CommandPalette (⌘K), FlashMessage
  ui/          → Card, Badge, StatCard, Table, Modal, Form, PageHeader (design system)
  operations/  → formulários e ações de cada módulo (Client Components)
lib/
  auth/permissions.ts   → regra única de acesso por módulo (menu, rotas e páginas)
  format.ts             → datas no fuso America/Sao_Paulo e moeda BRL
  crm.ts                → etapas do funil e indicadores do CRM
  commercial/           → catálogo e propostas: opções, cálculo dos totais, tipos
  table.ts              → ordenação e paginação por parâmetros da URL
  theme/script.ts       → tema claro/escuro e menu recolhido aplicados antes da pintura
  options.ts            → listas de opções compartilhadas (status, tipos, papéis…)
  hooks/useAction.ts    → mutação padrão: carregando, erro amigável, router.refresh()
  finance/, business/   → cálculos financeiros, planos e meta mensal
supabase/
  migrations/           → migrations versionadas
  proposed/             → mudanças que dependem de decisão antes de aplicar
```

### Permissões

| Perfil | Módulos |
| --- | --- |
| Administrador (`korvixdigital@gmail.com`) | Todos |
| Cofundador | CRM, Agenda, Tarefas |
| Demais papéis | CRM, Comercial, Clientes, Agenda, Tarefas |

A regra está em `lib/auth/permissions.ts` e é aplicada no menu, no middleware
(todas as rotas de módulo) e reforçada no banco pelas políticas RLS.

### Regras financeiras

- Pagamentos entram como **pendentes**; ao confirmar, a RPC
  `confirm_payment_and_sync_finance` gera a receita no caixa e as comissões.
- Editar ou excluir um pagamento recalcula/remove caixa e comissões vinculados
  (`update_/delete_payment_and_sync_finance`).
- Lançamentos de caixa automáticos ficam bloqueados para edição manual.
- Pró-labore = 20% da receita recebida. Impostos e pró-labore lançados no caixa
  usam as categorias "Impostos" e "Pró-labore".

## Migrations pendentes de aplicação

A migration `supabase/migrations/20261015120000_fix_finance_rpcs_and_tighten_rls.sql`
**ainda não foi aplicada em produção**. Sem ela, os botões *Confirmar* e
*Editar pagamento* continuam falhando com "permissão negada". Ela foi validada
numa réplica local do schema e das políticas de produção.

A migration `supabase/migrations/20261016120000_commercial_catalog_and_proposals.sql`
(catálogo de serviços e propostas) **foi aplicada em produção em 16/10/2026**, com backup
prévio no schema `backup_20261016`. Falta rodar no SQL Editor
`supabase/manual/20261016_comercial_pendente_confirmacao.sql` (salvar propostas e excluir
itens do catálogo). Detalhes: `docs/COMERCIAL.md`.

`supabase/proposed/align_db_admin_with_app_rbac.sql` alinha o banco à regra do
app (apenas a conta principal é administradora) e precisa de decisão antes.

Documentação: `docs/COMERCIAL.md`, `docs/DIAGNOSTICO-INICIAL.md`, `docs/REGISTRO-DE-IMPLEMENTACAO.md`
e `docs/AUDITORIA-E-COBERTURA.md`.

### Design

Tokens de cor em `app/globals.css` (tema claro e escuro); o Tailwind mapeia as
classes para esses tokens. Use `bg-surface`, `bg-primary text-primary-fg`,
`text-ink-*`, `text-danger` etc. — nunca cores fixas como `bg-white` ou `red-50`.

## Limitações conhecidas

- Criação de novos logins é feita no painel do Supabase (Authentication).
- A tabela `audit_logs` ainda não é alimentada automaticamente pelas ações.
- A meta mensal de contratos (5) está em `lib/business/goals.ts`.
- `lib/mock-data.ts` e `lib/types.ts` são do protótipo original; `mock-data`
  não é mais usado por nenhuma tela.
