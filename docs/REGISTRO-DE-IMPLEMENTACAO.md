# KORVIX OS — Registro de implementação (redesign premium)

Branch: `claude/lucid-bohr-53rt6z` · Diagnóstico de partida: `docs/DIAGNOSTICO-INICIAL.md`
Produção (`korvix-os.vercel.app`, branch `main`) e banco de produção: **não alterados**.

## Fases e commits

| Fase | Commit | Entrega |
| --- | --- | --- |
| B — Fundação | `5b8cfa2` | Tokens de design (CSS vars) claro/escuro; tema sem flash + alternância; menu lateral recolhível; CRM como página inicial; ConfirmDialog e toasts |
| C — CRM | `bcc8f1a` | Painel com indicadores reais, próximos contatos, "Seu dia", Funil \| Lista com filtros, ordenação e paginação |
| D/E — Módulos e acabamento | `2e4c9da` | Ordenação/paginação nas tabelas, breadcrumbs, tamanhos de botão, tema no login, correções de contraste apontadas pelos testes |


## Sistema de design

- **Tokens** em `app/globals.css`: neutros `ink-*`, marca `korvix-*`, semânticos
  `canvas`, `surface`, `nav`, `primary`(+`hover`/`fg`), `success`, `warning`, `danger`, `info`,
  sombras. O tema escuro redefine os mesmos tokens (`.dark`).
- **Cores**: azul-marinho na navegação e estrutura; azul-claro (`primary`) só em ações
  e destaques; superfícies brancas (claro) / azul-marinho profundo (escuro).
- **Tema**: claro / escuro / sistema; preferência no `localStorage` do navegador
  (`korvix-theme`), aplicada por script no `<head>` antes da pintura.
- **Componentes compartilhados** (`components/ui`): Card, StatCard, Badge/StatusBadge,
  DataTable (cartões no celular, ordenação e paginação via URL), Tabs, PageHeader
  (com breadcrumbs), Modal, ConfirmDialog + Toast (`Feedback.tsx`), Form
  (Field/Input/Select/Textarea/botões com tamanhos), estados de carregamento/erro/404.

## CRM (página inicial)

| Indicador | Regra (lib/crm.ts) |
| --- | --- |
| Pipeline aberto | Soma do valor estimado das etapas abertas |
| Previsão ponderada | Σ valor × probabilidade (limitada a 0–100%) das etapas abertas |
| Follow-ups atrasados / hoje / sem data | `next_followup_at` das abertas, no fuso de São Paulo |
| Conversão | Ganhas ÷ (ganhas + perdidas) |

"Próximos contatos" lista atrasados, hoje e próximos 7 dias e abre o lead (`?lead=`).
"Seu dia" mostra tarefas do usuário vencendo/atrasadas e compromissos de hoje (próprios
ou compartilhados), com atalhos de criação — apenas para perfis com esses módulos.

## Validação executada

| Verificação | Resultado |
| --- | --- |
| `npx tsc --noEmit` | sem erros |
| `npm run lint` | sem avisos |
| `npm test` (Vitest) | 35/35 (permissões, datas, finanças, métricas do CRM, ordenação/paginação) |
| `npm run build` | sucesso |
| Navegador — build de produção contra mock local da API | 17 páginas × 6 larguras (320, 375, 430, 768, 1366, 1920) × 2 temas: 0 erros de console, 0 scroll horizontal, 0 texto com contraste < 3:1 (página 1366) |
| Sobreposições (modal, confirmação, notificações, menu do usuário, busca, menu móvel) | contraste ≥ 3:1 nos dois temas |
| Fluxos | criar/editar cliente, erro por campo, dados mantidos após falha de rede, duplo envio (1 POST), foco do modal, confirmação (cancelar não executa; confirmar executa e mostra toast), mover etapa, perda exige motivo, lead → cliente, ⌘K, sair, RBAC vendedor/cofundador |
| Tema | alternância e persistência após recarregar, aplicado antes da hidratação |
| Menu recolhido | 248px → 72px, mantido após recarregar sem "pulo" |

Limitação: sem credenciais reais, os testes de navegador usam um mock local da API
Supabase com dados fictícios (somente na máquina de teste). Eles comprovam o que a
interface envia e exibe, não a gravação no banco de produção.

## Pendências e riscos

| Item | Situação |
| --- | --- |
| Migration `20261015120000` (RPCs de pagamento, RLS) | **Pronta e testada em réplica; aguarda autorização** para produção |
| Alinhar `is_korvix_admin()` ao app (cofundador) | Proposta em `supabase/proposed/`; decisão de negócio |
| Auditoria automática (`audit_logs`) e notificações por usuário | Requerem migration aditiva |
| Gráficos | Não há gráficos na aplicação; não foram criados gráficos decorativos |
| PR #5 (`codex/audit-security-hardening`) | Conteúdo já incorporado nesta branch; pode ser fechado ao mesclar esta |
| Lockfile npm | Não versionado (como antes); recomendado adotar |
