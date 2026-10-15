# KORVIX OS — Matriz de auditoria e cobertura

Branch: `claude/lucid-bohr-53rt6z` · Base: `main` @ `9e32bb2` · Data: 15/10/2026

Produção (`korvix-os.vercel.app`) e banco Supabase de produção **não foram
alterados**. Banco foi apenas lido (schema, políticas, funções e contagens).

## Como foi validado

| Camada | Ferramenta | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit` | sem erros |
| Lint | `npm run lint` | sem warnings |
| Testes unitários | `npm test` (Vitest, 27 testes) | 27/27 — em TZ UTC, São Paulo e Tóquio |
| Build | `npm run build` | sucesso |
| RLS / RPC | Postgres 16 local com réplica do schema e políticas de produção | antes/depois da migration comparados |
| Navegador | Chromium (Playwright) + build de produção contra mock local da API Supabase | 16 páginas × 6 larguras (320, 375, 390, 768, 1366, 1920) sem erro de console nem scroll horizontal; fluxos abaixo |
| Preview | Vercel (branch) | READY; redireciona sem sessão; cabeçalhos de segurança ativos |

Limitação: sem credenciais de um usuário real, os fluxos no navegador usam um
mock da API (dados fictícios **somente locais**). As regras de banco (RLS/RPC)
foram testadas à parte no Postgres local.

## Matriz de auditoria

| # | P | Módulo | Elemento | Situação encontrada | Correção | Validação |
|---|---|---|---|---|---|---|
| 1 | P0 | Financeiro | Confirmar pagamento | RPC sem `EXECUTE` para `authenticated` → "permission denied" | Migration `20261015120000` (grant + checagem admin interna) | Réplica local: falha antes, sucesso depois |
| 2 | P0 | Financeiro | Editar pagamento | RPC invoker chamando função sem permissão → falha | Migration: `SECURITY DEFINER` + checagem admin + validação | Réplica local |
| 3 | P0 | Financeiro | Excluir pagamento | Deixava lançamentos de caixa de comissão órfãos | Migration: remove receita, comissões e caixa de ambos | Réplica local: 0 órfãos |
| 4 | P0 | Clientes | Excluir cliente | RLS `true` para todos: vendedor excluía qualquer cliente | Migration: exclusão só admin; botão só para admin | Réplica local |
| 5 | P0 | Financeiro | Indicações / Metas | RLS `true`: dados financeiros legíveis por todos | Migration: padrão admin (financeiro) / leitura equipe (metas) | Réplica local |
| 6 | P0 | Todos | Rotas | Permissão só no menu; URL direta abria módulos | Middleware por módulo + `requireModule()` em cada página (falha fechada) | Navegador: vendedor/cofundador redirecionados; testes unitários |
| 7 | P0 | Todos | Banco × app | `is_korvix_admin()` ainda trata CEO/cofundador como admin | Proposta em `supabase/proposed/` (requer decisão) | — |
| 8 | P1 | Topbar | Usuário/notificações | Dados fictícios de `mock-data` | Perfil e tabela `notifications` reais; marcar como lidas | Navegador |
| 9 | P1 | Topbar | Sair | Inexistente | Server Action `signOut` | Navegador |
| 10 | P1 | Topbar | Busca ⌘K | Botão sem ação | Paleta de navegação restrita aos módulos permitidos | Navegador |
| 11 | P1 | Clientes | Editar sem telefone | `phone` NOT NULL recebia `null` → erro | Salva `""` | Navegador (payload) |
| 12 | P1 | Clientes | Busca/filtro | Inexistentes | Busca + filtro por status via URL | Navegador |
| 13 | P1 | CRM | Follow-up | Exibido/salvo em UTC | Conversão local ↔ ISO | Testes unitários |
| 14 | P1 | CRM | Mover para "Perdido" | Sem motivo obrigatório no Kanban | Abre o formulário exigindo motivo | Navegador |
| 15 | P1 | CRM → Clientes | Lead ganho | Sem caminho para virar cliente | "Cadastrar como cliente" sem duplicar | Navegador (payload) |
| 16 | P1 | CRM | Responsável | Não-admin escolhia outro (RLS rejeitava) | Campo bloqueado para não-admin | Revisão + RLS |
| 17 | P1 | Audiovisual | Mudar etapa / editar | Inexistente | Seleção de etapa, edição, responsável real | Navegador (render) |
| 18 | P1 | Agenda | Editar / status / período | Inexistentes; agrupamento em UTC | Edição, status, navegação dia/semana/mês, fuso SP | Navegador + testes |
| 19 | P1 | Tarefas | Ações no celular | Coluna oculta no mobile | Cartões no mobile, concluir em 1 clique, filtros | Navegador |
| 20 | P1 | Indicações | Status | Sem como marcar paga | Seleção de status | Navegador (render) |
| 21 | P1 | Comercial | Metas | Painel sem criação | CRUD de metas (admin) | Navegador (render) |
| 22 | P1 | Caixa | Impostos | Categorias minúsculas nunca entravam no indicador | Categorias novas + comparação sem acento/caixa | Testes unitários |
| 23 | P1 | Formulários | Duplo envio | Enter/clique repetido reenviava | Trava de reentrância em `useAction` | Navegador: 3× Enter → 1 POST |
| 24 | P1 | Formulários | Dados após erro | Campo remontava e perdia o valor | Chaves estáveis no `Field`; `onSubmit` sem reset | Navegador: valor mantido após falha de rede |
| 25 | P2 | Formulários | Erros | Só no rodapé | Erro junto ao campo + `aria-invalid` | Navegador |
| 26 | P2 | Layout | Desktop | Conteúdo deslocado 248px a mais | Remoção do padding duplicado | Navegador |
| 27 | P2 | Tabelas | Celular | Valor/status/ações fora da tela | Cartões empilhados < 640px | Navegador (6 larguras) |
| 28 | P2 | Modais | Teclado/foco | Sem Esc, sem rolagem, foco solto | Modal único: Esc, rolagem, trap de Tab, retorno de foco, `dvh` | Navegador |
| 29 | P2 | Datas | Exibição | Dia anterior para colunas `date`; "hoje" virava amanhã após 21h | `lib/format.ts` no fuso America/Sao_Paulo | Testes unitários |
| 30 | P2 | Estados | Carregando/erro/404 | Inexistentes | `loading.tsx`, `error.tsx`, `not-found.tsx` | Navegador (erro de API simulado, 404) |
| 31 | P2 | Tema | Cores | `ink-50/200/600` usadas e inexistentes | Tokens adicionados | Visual |
| 32 | P2 | Equipe | 320 px | Overflow de 25px | Quebra de texto no cabeçalho do card | Navegador |
| 33 | P3 | Qualidade | Testes | Nenhum | Vitest + passo na CI | `npm test` |
| 34 | P3 | Segurança | Cabeçalhos HTTP | Ausentes; `x-powered-by` exposto | `X-Frame-Options`, HSTS, nosniff, etc. | Preview (headers) |

## Matriz de cobertura

### Concluído e testado
Itens 6, 8–15, 19, 22–30, 32–34 (ver coluna Validação).

### Implementado, mas não validado de ponta a ponta com usuário real
- Todas as escritas no banco a partir da interface (criar/editar/excluir em todos
  os módulos): o payload enviado foi verificado no mock; a persistência real
  depende de login em produção, que não foi usado.
- Itens 16, 17, 18 (edição), 20, 21: renderização e envio verificados, sem
  execução contra o banco real.
- Marcar notificações como lidas (tabela sem coluna de usuário: a leitura é global).

### Bloqueado por dependência / autorização
- Itens 1–5: migration pronta e testada em réplica; **aplicação em produção
  aguarda autorização**. Até lá, Confirmar/Editar pagamento continuam falhando.
- Item 7: decisão de negócio sobre o papel do cofundador no banco.
- Criação de logins: exige service-role key (não deve ficar no app).

### Pendente
- Gravação automática de `audit_logs` (ideal por trigger no banco — requer migration).
- Notificações por usuário (requer coluna `user_id` — migration aditiva).
- Ordenação e paginação de tabelas (não existiam; volumes atuais pequenos).
- Página 404 de registro inexistente responde HTTP 200 (efeito do streaming
  com `loading.tsx` no Next 14); o conteúdo exibido é a página 404.
- Lockfile (`package-lock.json`) não versionado — recomendável adotar.
