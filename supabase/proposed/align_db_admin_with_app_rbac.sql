-- PROPOSTA — requer decisão do responsável antes de aplicar.
--
-- Situação atual: o app (lib/auth/permissions.ts) considera administrador
-- apenas korvixdigital@gmail.com e restringe o cofundador a CRM/Agenda/Tarefas.
-- No banco, private.is_korvix_admin() ainda retorna true para os papéis
-- 'ceo' e 'cofundador'. Ou seja: o menu e o middleware bloqueiam, mas um
-- cofundador autenticado ainda consegue ler/alterar pagamentos, contratos,
-- caixa, comissões, audiovisual e auditoria chamando a API diretamente.
--
-- Efeito desta proposta: o banco passa a aplicar a mesma regra do app.
-- Consequências para usuários com papel ceo/cofundador (exceto o e-mail admin):
--   * deixam de ver todas as oportunidades/tarefas/agenda — passam a ver só as próprias;
--   * deixam de ver dados financeiros, audiovisual e auditoria;
--   * deixam de ver a lista completa de usuários (users_self_or_admin_select).
-- Não apaga nem altera dados.
--
-- Para aplicar: mova este arquivo para supabase/migrations/ com um timestamp.

create or replace function private.is_korvix_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users u
     where u.id = auth.uid()
       and u.active = true
       and lower(u.email) = 'korvixdigital@gmail.com'
  );
$$;
