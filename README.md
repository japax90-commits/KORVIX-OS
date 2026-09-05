# KORVIX OS — Protótipo navegável (V1)

Protótipo visual e navegável do KORVIX OS, construído a partir da
**KORVIX OS — Especificação Técnica Master V2.0**. Usa Next.js (App Router),
React, TypeScript e Tailwind CSS, com dados fictícios em memória
(`lib/mock-data.ts`) no lugar de banco de dados real.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` — a rota raiz redireciona para `/login`.
O formulário de login é apenas visual neste estágio: qualquer envio leva
direto para `/dashboard` (não há autenticação real ainda).

## O que já está implementado

- **Login** (`app/(auth)/login`) — identidade visual Korvix, formulário responsivo.
- **Layout protegido** (`app/(protected)/layout.tsx`) — sidebar fixa no desktop,
  drawer no mobile, topbar com busca, notificações e usuário logado.
- **Dashboard / Command Center** — os 5 blocos da seção 10 (Comercial,
  Financeiro, Clientes, Operação, Equipe), com filtro de período visual.
- **CRM** — funil Kanban por etapa (seção 11) + tabela de detalhamento.
- **Comercial** — propostas/negociação, painel de metas, oportunidades perdidas.
- **Clientes** — listagem + ficha 360° (`/clientes/[id]`) com as 8 abas da seção 13
  (navegação de abas é visual; conteúdo real está na aba "Dados gerais" por ora).
- **Financeiro** — visão geral + sub-rotas `pagamentos`, `comissoes`,
  `indicacoes`, `caixa`, refletindo a separação de conceitos da seção 17.
- **Audiovisual** — pipeline Kanban com os 11 estágios da seção 21.
- **Agenda** — visão unificada de compromissos, agrupada por dia.
- **Equipe e Permissões** — usuários do seed com seus `moduleAccess` (seção 5/8).
- **Tarefas** e **Auditoria** — módulos transversais (seções 9 e 20).

Todos os enums de status usam o componente `<StatusBadge>`
(`components/ui/Badge.tsx`), que centraliza a cor e o rótulo de cada estado —
nenhuma tela decide isso por conta própria, para não haver divergência visual
entre módulos.

## O que ainda é apenas estrutura (não funcional)

Por instrução explícita do escopo desta primeira entrega ("não precisa
implementar ainda todas as regras de negócio"), os seguintes pontos estão
representados visualmente mas **não têm lógica real por trás**:

- Botões de ação ("Nova oportunidade", "Registrar pagamento", "Confirmar",
  "Novo usuário" etc.) não escrevem em nenhum estado — são placeholders de
  interface aguardando a camada de dados.
- O login não valida credenciais nem cria sessão.
- O RBAC (seção 8) é exibido como dado (`moduleAccess` de cada usuário), mas o
  menu ainda não é filtrado dinamicamente por usuário logado — hoje mostra
  todos os módulos para qualquer visitante, propositalmente, para permitir a
  demonstração completa do protótipo.
- A máquina de estados (seção 29) ainda não bloqueia transições inválidas —
  os quadros Kanban são apenas leitura dos dados mockados.
- Auditoria, notificações e tarefas mostram registros de exemplo, mas não são
  geradas automaticamente por nenhuma ação ainda.

## Ponto sinalizado para decisão (não resolvido por conta própria)

A Especificação Técnica Master V2.0 já resolveu a maior parte das
ambiguidades do documento original. Um ponto que segue **aberto** e não foi
inventado neste protótipo: a tela "Editar permissões" (usuário × módulo ×
ação, mencionada na seção 45) ainda não tem layout definido — hoje o módulo
Equipe apenas exibe os acessos existentes em modo leitura, com uma nota
explícita na tela avisando que a edição será implementada na próxima etapa.

## Próximos passos técnicos (fora do escopo desta entrega)

1. Introduzir Prisma + PostgreSQL seguindo o schema da seção 26, substituindo
   `lib/mock-data.ts` por chamadas reais (os tipos de `lib/types.ts` já foram
   desenhados para mapear 1:1 com as futuras tabelas).
2. Autenticação real via NextAuth (seção 6).
3. Server Actions com `requirePermission`/`requireAction` (seção 8) por trás
   de cada botão hoje decorativo.
4. Deploy na Vercel com banco gerenciado (seção 40).

## Estrutura de pastas

```
app/
  (auth)/login/
  (protected)/
    layout.tsx        → sidebar + topbar
    dashboard/
    crm/
    comercial/
    clientes/[id]/
    financeiro/{pagamentos,comissoes,indicacoes,caixa}/
    audiovisual/
    agenda/
    equipe/
    tarefas/
    auditoria/
components/
  layout/   → Sidebar, Topbar
  ui/       → Card, Badge/StatusBadge, StatCard, Table
lib/
  types.ts       → tipos alinhados ao futuro schema Prisma
  mock-data.ts   → dados fictícios de demonstração
  navigation.ts  → configuração central do menu
  utils.ts
```
