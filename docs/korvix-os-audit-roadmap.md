# KORVIX OS — Auditoria inicial e plano de modernização

Data da auditoria: 2026-10-15
Branch de trabalho: `codex/audit-security-hardening`
Base analisada: `main` no commit `9e32bb2607e895f85dd318c5f1f3b1ab441a9f3e`

## Resumo executivo

O repositório já evoluiu além do protótipo descrito no README antigo: há autenticação Supabase no login, leitura de dados reais em módulos como CRM e Financeiro, e middleware para proteger rotas administrativas. Ainda existem divergências entre documentação, regras de autorização e cobertura funcional. Esta auditoria é baseada em leitura do código; ainda não representa uma execução local de testes ou inspeção do conteúdo do banco.

## Evidências verificadas

- `package.json`: Next.js 14.2.32, React 18, TypeScript, Supabase SSR e Supabase JS; scripts disponíveis: `dev`, `build`, `start`, `lint`.
- `app/(auth)/login/page.tsx`: usa `signInWithPassword` do Supabase.
- `app/(protected)/layout.tsx`: valida usuário e perfil ativo e calcula módulos visíveis.
- `lib/auth/permissions.ts`: define o e-mail administrador e regras por perfil.
- `middleware.ts`: antes desta alteração, considerava os papéis CEO/cofundador administradores para rotas restritas, embora `isKorvixAdmin` use o e-mail autorizado; o bloco `catch` também permitia continuar nessas rotas em caso de falha de verificação.
- `app/(protected)/crm/page.tsx` e `app/(protected)/financeiro/page.tsx`: consultam tabelas reais no Supabase.
- `app/(protected)/equipe/page.tsx`: lista usuários reais; o próprio texto informa que permissões granulares ainda dependem de papel/RLS.
- `lib/mock-data.ts`: contém registros fictícios antigos. Não deve ser importado como fonte de dados de produção nem apagado automaticamente.
- `lib/supabase/config.ts`: possui URL e chave publicável de fallback hardcoded, além de suporte a variáveis de ambiente. A chave publicável não equivale a uma service-role key; a configuração ainda deve ser normalizada por ambiente.

## Alteração de segurança feita nesta branch

- Middleware usa a mesma função `isKorvixAdmin` que o restante da aplicação para as rotas administrativas.
- Rotas restritas redirecionam para login se a identidade não puder ser verificada.
- Perfil ausente/inativo ou erro ao consultar perfil não concede acesso.
- A mudança está isolada numa branch e não foi mesclada em `main` nem publicada manualmente em produção.

## Plano técnico priorizado

### P0 — Segurança e recuperação
1. Revisar autorização em cada rota, Server Action e mutação; não confiar somente em itens ocultos no menu ou middleware.
2. Verificar políticas RLS de todas as tabelas e testar isolamento entre usuários.
3. Confirmar variáveis de ambiente de Preview/Production e remover fallbacks de configuração quando houver um processo de migração seguro.
4. Criar testes para usuário anônimo, usuário inativo, colaborador sem permissão, administrador e falha temporária do Supabase.
5. Confirmar backups e plano de restauração antes de alterações de schema.

### P1 — Inventário funcional e dados
1. Mapear cada botão/formulário para a operação real correspondente.
2. Documentar tabelas, chaves estrangeiras, constraints, índices, triggers, políticas RLS e migrations existentes.
3. Classificar dados como reais, históricos ou demonstração; não executar limpeza destrutiva.
4. Criar um caminho de migração versionado, idempotente e reversível sempre que possível.
5. Validar estados de negócio de CRM, contratos, pagamentos, comissões e caixa.

### P2 — Persistência e regras de negócio
1. Padronizar Server Actions/handlers com validação de entrada e autorização no servidor.
2. Usar transações/RPC para operações financeiras relacionadas, com idempotência para evitar duplicidade.
3. Gerar auditoria e notificações a partir de ações confirmadas, sem usar registros fictícios como eventos reais.
4. Implementar gestão de usuários e permissões com verificação de privilégio.
5. Cobrir agenda, tarefas e audiovisual com criação, edição, transições válidas e histórico.

### P3 — Qualidade e operação
1. Adicionar testes automatizados unitários, de integração e fluxos críticos.
2. Corrigir scripts de lint/teste/build e configurar CI para pull requests.
3. Validar acessibilidade, estados vazios/erro/carregamento e uso mobile.
4. Preparar observabilidade, logs sem segredos e monitoramento de falhas.

### P4 — SaaS multi-loja (somente após estabilizar o produto interno)
1. Definir tenant/organização e migração segura dos registros atuais para a organização Korvix.
2. Aplicar isolamento por tenant no banco e nos serviços, com testes negativos.
3. Definir planos, limites, billing e onboarding; não ativar cobranças até o fluxo estar validado.
4. Preparar internacionalização e moedas como uma camada explícita, sem alterar a moeda histórica dos registros existentes.

## Critérios de segurança para cada entrega

- Alterações isoladas em branch/PR.
- Nenhuma migration destrutiva sem backup, plano de rollback e aprovação.
- Preview e testes antes de merge.
- Produção só após validação explícita.
- Não expor valores de segredos em logs ou documentação.

## Limitações desta auditoria

Não foi feita leitura ou alteração direta de dados no Supabase. Também não foi executado build/teste dentro de um ambiente de desenvolvimento nesta etapa. O estado de um deployment `READY` confirma que a Vercel reportou um deployment pronto, não que todos os fluxos funcionais estejam corretos.
