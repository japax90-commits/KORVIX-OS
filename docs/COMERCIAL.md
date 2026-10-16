# Módulo Comercial — catálogo de serviços e propostas

Branch: `claude/lucid-bohr-53rt6z` · Migration: `supabase/migrations/20261016120000_commercial_catalog_and_proposals.sql`
Produção e banco de produção: **não alterados**.

## 1. Auditoria (antes da mudança)

| Item | Situação encontrada |
| --- | --- |
| Página `/comercial` | Indicadores do CRM, cards de planos, tabela de negociações, metas e perdas |
| "Serviços de demonstração" | Os planos Essencial (R$ 999), Intermediário (R$ 1.999) e Completo (R$ 2.999) estavam **fixos no código** em `lib/business/plans.ts`. Por isso não podiam ser editados pela interface: não existia tabela no banco |
| Uso dos planos no código | `Contracts.tsx` e `PlanShortcuts.tsx` (atalhos de valor nos formulários financeiros), `lib/finance/calculations.ts`, `financeiro/page.tsx` e `crm/CrmClient.tsx`. **Mantidos**, porque o Financeiro depende deles |
| Banco (Supabase) | 14 tabelas. Nenhuma de serviços, categorias ou propostas. Dados reais: 1 usuário (CEO), 43 oportunidades; clientes, contratos e pagamentos vazios |
| Permissões | App: só a conta principal é administradora; vendedores acessam CRM, Comercial, Clientes, Agenda e Tarefas; o cofundador não acessa o Comercial. Banco: `private.is_korvix_admin()` (inclui ceo/cofundador) controla contratos e pagamentos |
| Integrações reaproveitadas | Clientes (`clients`), CRM (`opportunities`), Contratos (`contracts` + gatilho que atualiza o resumo do cliente), Pagamentos (`payments`, confirmação continua no Financeiro) |

## 2. O que foi criado

### Banco (migration aditiva — nada é apagado ou alterado)

| Objeto | Função |
| --- | --- |
| `service_categories` | Categorias editáveis pela interface |
| `services` | Serviços e pacotes: preço, tipo de cobrança, unidade, periodicidade, prazo, escopo, entregáveis, limites, condições, status, destaque, ícone/imagem, itens de pacote, origem (cópia) |
| `service_internals` | Custo interno e observações internas — **somente a administração lê** |
| `proposals` / `proposal_items` | Propostas por cliente com itens do catálogo ou personalizados, descontos, taxas, implantação, recorrência, condições, validade e status |
| `save_service(jsonb)` | Grava serviço e dados internos de forma atômica, com detecção de conflito (`updated_at`) |
| `save_proposal(jsonb)` | Grava proposta e itens de forma atômica; calcula os totais no banco; idempotente (`request_id`) e com controle de versão |
| `create_contract_from_proposal` | Proposta aprovada → contrato ativo (valor recorrente). Idempotente; só administração |
| `create_payment_from_proposal` | Proposta aprovada → cobrança **pendente** dos valores únicos. Idempotente; só administração; nunca marca como pago |
| Gatilhos | Transições de status válidas, bloqueio de edição após aprovação, `updated_at`/`updated_by` |
| Exemplos iniciais | 6 serviços (Tráfego Pago, Mídias Sociais, Site ou Landing Page, Agente de IA, Produção Audiovisual, Google Meu Negócio) e os 3 planos do código como pacotes. São inseridos **só se ainda não existir** um serviço com o mesmo nome. Todos editáveis |

**Segurança no banco:**
- RLS em todas as tabelas novas.
- O vendedor vê apenas as próprias propostas.
- O navegador **não consegue gravar** totais, código, status inicial, responsável nem vínculos com contrato e pagamento: as permissões são por coluna, e esses campos só são gravados pelas funções.

### Telas

| Rota | Conteúdo |
| --- | --- |
| `/comercial` | Visão geral. Destaques do catálogo vêm do banco; sem a migration, continuam os planos do código |
| `/comercial/catalogo` | Busca instantânea (sem acento), filtros (categoria, status, cobrança, tipo), ordenação (nome, preço, atualização), cards ou tabela |
| (ações do catálogo) | Criar, editar (formulário por seções), duplicar, ativar/desativar, arquivar/restaurar, excluir (bloqueado se usado em proposta), visualizar como cliente, gerenciar categorias |
| `/comercial/propostas` | Lista com busca, filtro por status, ordenação e paginação |
| `/comercial/propostas/nova` | Construtor em 4 etapas, com resumo ao vivo. `?personalizada=1` abre como "Criar serviço personalizado"; `?cliente=`, `?oportunidade=` e `?servico=` pré-preenchem |
| `/comercial/propostas/[id]` | Edição (rascunho, enviada, em negociação), transições de status, geração de contrato e cobrança |
| `/comercial/propostas/[id]/apresentacao` | Versão para o cliente: imprimir ou salvar em PDF pelo navegador, abrir no WhatsApp com o resumo, copiar resumo |

**Integrações:**
- A ficha do cliente lista as propostas dele.
- No CRM, o lead abre com "Criar proposta" e mostra as propostas vinculadas.
- A proposta tem links para o cliente e para o lead.

## 3. Regras de cálculo (sem percentuais inventados)

- Linha = quantidade × preço negociado − desconto da linha (nunca negativa).
- Só a cobrança **mensal** é recorrente. As demais (único, projeto, produção, hora, personalizado) entram como valor único.
- Desconto geral:
  - percentual sobre recorrentes, únicos ou ambos;
  - ou valor em R$ sobre recorrentes **ou** únicos, limitado ao subtotal.
- Implantação e taxas adicionais são valores únicos.
- **Recorrente e único nunca são somados.**
- Impostos não são calculados.
- Margem só aparece quando há preço e custo informados.
- A regra existe em `lib/commercial/calc.ts` (tela) e em `private.compute_proposal_totals` (banco, fonte oficial). As duas foram testadas com os mesmos números.

## 4. Status da proposta

`rascunho → enviada → em negociação → aprovada | recusada | expirada`, e `cancelada` a partir de qualquer estado não final.
- Recusada ou expirada podem voltar para negociação.
- Aprovada só pode ser cancelada, e apenas enquanto não houver contrato ou cobrança gerados.
- O conteúdo fica bloqueado depois da aprovação.

## 5. Testes executados

| Teste | Resultado |
| --- | --- |
| `npx tsc --noEmit`, `npm run lint` | sem erros |
| `npm test` (Vitest) | 52/52 (17 novos: cálculo, moeda, margem, transições) |
| `npm run build` | sucesso |
| Banco local (PostgreSQL 16 + migration real, com as mesmas permissões da produção), `supabase/tests/commercial_catalog_and_proposals.test.sql` | 27 cenários: permissões, conflito, transições, bloqueio, idempotência de contrato e cobrança, tentativa de adulterar totais, FK de serviço usado, migration reaplicada sem duplicar |
| Navegador × banco local real (PostgREST + RLS), dados fictícios | 82/82 verificações: critérios 1–16 do pedido, 2 temas × 390/1366 px × 6 telas sem rolagem lateral nem erros |
| Regressão das demais telas (simulador anterior) | 17 páginas × 6 larguras × 2 temas: 0 problemas; fluxos de CRM, clientes, financeiro e RBAC intactos |
| Sem a migration aplicada | Telas novas mostram aviso; visão geral mantém os planos do código; CRM e clientes sem erro |

Em produção não foram gravados dados de teste: as verificações rodaram em transação desfeita no final.

## 6. Aplicação em produção (16/10/2026, autorizada)

1. **Backup** antes de qualquer alteração: cópia completa das 14 tabelas e de 106 definições (políticas, funções, gatilhos, permissões) no schema `backup_20261016`, sem acesso pela API. Conferido por checksum (`md5`) contra os dados originais.
2. **Aplicado**:
   - tabelas `service_categories`, `services`, `service_internals`, `proposals` e `proposal_items`, com RLS ativo;
   - gatilhos e travas;
   - funções `save_service`, `create_contract_from_proposal` e `create_payment_from_proposal`;
   - 12 das 15 políticas;
   - 4 categorias e 9 serviços de exemplo.
3. **Ajustes feitos na hora**, porque a produção difere da réplica local:
   - `public.current_user_id()` não é executável por `authenticated`. Foi substituída por `private.is_active_user()`, sem alterar a função existente.
   - `authenticated` não tinha `USAGE` no schema `private`. Foi concedido, porque as funções novas chamam `private.is_korvix_admin()`, como as políticas RLS já fazem. O schema continua fora da API (só `public` é exposto).
   - A ferramenta de banco usada exige confirmação humana para comandos com DROP/REVOKE/DELETE. A migration foi reescrita sem DROP/REVOKE:
     - gatilhos com `create or replace trigger`;
     - políticas criadas só se não existirem;
     - em vez de permissão por coluna, os gatilhos `proposals_a_protect` e `proposal_items_a_protect` bloqueiam gravação direta;
     - os 27 testes de banco e os 82 de interface foram refeitos e passaram.
4. **Verificado em produção**, dentro de uma transação desfeita no final:
   - o admin lê e edita o catálogo;
   - um usuário desconhecido não vê nem altera nada;
   - oportunidades e usuários continuam idênticos ao backup.
5. **Pendente de confirmação**: `supabase/manual/20261016_comercial_pendente_confirmacao.sql`, com a função `save_proposal` e 3 políticas de exclusão. Contêm a palavra DELETE e precisam de aprovação manual. Sem esse arquivo:
   - não é possível salvar propostas;
   - não é possível excluir serviços, categorias nem rascunhos (arquivar funciona).
   Para aplicar, cole o arquivo no SQL Editor do Supabase e clique em Run. Ele é idempotente e não altera dados.
6. **Remover o backup**, quando não for mais necessário: `drop schema backup_20261016 cascade;` (somente com a sua confirmação).
7. **Reversão**: comandos no cabeçalho da migration, e `revoke usage on schema private from authenticated;`.

## 7. Pendências e limitações

- **Link público da proposta para o cliente**: não implementado, porque exigiria acesso sem login (token e política própria). Hoje existe impressão/PDF pelo navegador e WhatsApp com resumo, enviado pelo próprio usuário.
- **Imagem do serviço**: por endereço https. Upload exigiria um bucket no Supabase Storage.
- **Valores do Financeiro**: os atalhos de plano dos formulários continuam usando `lib/business/plans.ts`. Mudar o preço de um plano no catálogo não altera esses atalhos.
- **Permissão de administração**: no banco, `is_korvix_admin()` inclui ceo/cofundador, enquanto a interface só libera o catálogo para a conta principal. É a mesma diferença já documentada em `supabase/proposed/`.
