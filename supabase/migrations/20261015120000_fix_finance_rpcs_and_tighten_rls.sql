-- KORVIX OS — correções de RPC financeiras e endurecimento de RLS.
-- Não destrutivo: não apaga nem altera linhas existentes; só substitui
-- funções e políticas. Idempotente (pode ser reaplicado).

-- 1) "Confirmar pagamento" falhava com "permission denied": a função já valida
--    private.is_korvix_admin() internamente, mas authenticated não tinha EXECUTE.
revoke all on function public.confirm_payment_and_sync_finance(uuid) from public, anon;
grant execute on function public.confirm_payment_and_sync_finance(uuid) to authenticated;

-- 2) "Editar pagamento" falhava: a função (SECURITY INVOKER) chama
--    sync_payment_finance, que authenticated não pode executar. Passa a ser
--    SECURITY DEFINER com checagem explícita de administrador.
create or replace function public.update_payment_and_sync_finance(
  p_payment_id uuid,
  p_amount numeric,
  p_type text,
  p_method text,
  p_status text,
  p_due_date date,
  p_paid_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not private.is_korvix_admin() then
    raise exception 'Sem permissão para editar pagamentos';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Valor do pagamento deve ser maior que zero';
  end if;
  if p_status not in ('pendente', 'pago', 'atrasado', 'cancelado') then
    raise exception 'Status de pagamento inválido';
  end if;

  update public.payments
     set amount = p_amount,
         type = p_type,
         method = p_method,
         status = p_status,
         due_date = p_due_date,
         paid_at = case when p_status = 'pago' then coalesce(p_paid_at, paid_at, now()) else null end
   where id = p_payment_id;
  if not found then raise exception 'Pagamento não encontrado'; end if;

  return public.sync_payment_finance(p_payment_id);
end;
$function$;

revoke all on function public.update_payment_and_sync_finance(uuid, numeric, text, text, text, date, timestamptz) from public, anon;
grant execute on function public.update_payment_and_sync_finance(uuid, numeric, text, text, text, date, timestamptz) to authenticated;

-- 3) "Excluir pagamento" deixava órfãos os lançamentos de caixa das comissões
--    (source_type = 'commission'), inflando as saídas do caixa. Agora remove
--    receita, comissões e os lançamentos de caixa de ambas, de forma atômica.
create or replace function public.delete_payment_and_sync_finance(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
begin
  if not private.is_korvix_finance_admin() then
    raise exception 'Sem permissão para excluir pagamentos';
  end if;

  delete from public.cash_movements
   where source_type = 'commission'
     and source_id in (select id from public.commissions where payment_id = p_payment_id);
  delete from public.commissions where payment_id = p_payment_id;
  delete from public.cash_movements where source_type = 'payment' and source_id = p_payment_id;
  delete from public.payments where id = p_payment_id;
  if not found then raise exception 'Pagamento não encontrado'; end if;

  return jsonb_build_object('success', true, 'payment_id', p_payment_id);
end;
$function$;

revoke all on function public.delete_payment_and_sync_finance(uuid) from public, anon;
grant execute on function public.delete_payment_and_sync_finance(uuid) to authenticated;

-- sync_payment_finance é SECURITY DEFINER sem checagem própria: deve continuar
-- inacessível diretamente pela API.
revoke all on function public.sync_payment_finance(uuid) from public, anon, authenticated;

-- 4) Clientes: qualquer usuário autenticado podia excluir qualquer cliente.
--    Leitura e cadastro seguem abertos à equipe comercial; exclusão só admin.
drop policy if exists clients_authenticated_all on public.clients;
drop policy if exists clients_team_select on public.clients;
drop policy if exists clients_team_insert on public.clients;
drop policy if exists clients_team_update on public.clients;
drop policy if exists clients_admin_delete on public.clients;
create policy clients_team_select on public.clients for select to authenticated using (true);
create policy clients_team_insert on public.clients for insert to authenticated with check (true);
create policy clients_team_update on public.clients for update to authenticated using (true) with check (true);
create policy clients_admin_delete on public.clients for delete to authenticated using (private.is_korvix_admin());

-- 5) Indicações são dados financeiros: mesmo padrão das demais tabelas do
--    financeiro (admin lê/escreve; exclusão física só o administrador financeiro).
drop policy if exists referral_commissions_authenticated_all on public.referral_commissions;
drop policy if exists referral_commissions_admin_select on public.referral_commissions;
drop policy if exists referral_commissions_admin_insert on public.referral_commissions;
drop policy if exists referral_commissions_admin_update on public.referral_commissions;
drop policy if exists referral_commissions_finance_primary_delete on public.referral_commissions;
create policy referral_commissions_admin_select on public.referral_commissions for select to authenticated using (private.is_korvix_admin());
create policy referral_commissions_admin_insert on public.referral_commissions for insert to authenticated with check (private.is_korvix_admin());
create policy referral_commissions_admin_update on public.referral_commissions for update to authenticated using (private.is_korvix_admin()) with check (private.is_korvix_admin());
create policy referral_commissions_finance_primary_delete on public.referral_commissions for delete to authenticated using (private.is_korvix_finance_admin());

-- 6) Metas: a equipe consulta; somente administração define/ajusta.
drop policy if exists goals_authenticated_all on public.goals;
drop policy if exists goals_team_select on public.goals;
drop policy if exists goals_admin_insert on public.goals;
drop policy if exists goals_admin_update on public.goals;
drop policy if exists goals_admin_delete on public.goals;
create policy goals_team_select on public.goals for select to authenticated using (true);
create policy goals_admin_insert on public.goals for insert to authenticated with check (private.is_korvix_admin());
create policy goals_admin_update on public.goals for update to authenticated using (private.is_korvix_admin()) with check (private.is_korvix_admin());
create policy goals_admin_delete on public.goals for delete to authenticated using (private.is_korvix_admin());
