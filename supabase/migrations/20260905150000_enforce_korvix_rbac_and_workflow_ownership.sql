create or replace function public.is_korvix_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.active = true and (u.role in ('ceo','cofundador') or lower(u.email) = 'korvixdigital@gmail.com'));
$$;
create or replace function public.is_korvix_finance_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.active = true and lower(u.email) = 'korvixdigital@gmail.com');
$$;
alter function public.is_korvix_admin() owner to postgres;
alter function public.is_korvix_finance_admin() owner to postgres;
revoke all on function public.is_korvix_admin() from public;
revoke all on function public.is_korvix_finance_admin() from public;
grant execute on function public.is_korvix_admin() to authenticated;
grant execute on function public.is_korvix_finance_admin() to authenticated;

alter table public.tasks add column if not exists assigned_to_id uuid references public.users(id), add column if not exists created_by uuid references public.users(id);
alter table public.tasks alter column related_entity_label set default '';
update public.tasks set related_entity_label = '' where related_entity_label is null;
alter table public.agenda_events add column if not exists responsible_user_id uuid references public.users(id), add column if not exists created_by uuid references public.users(id);
alter table public.av_demands add column if not exists responsible_user_id uuid references public.users(id), add column if not exists created_by uuid references public.users(id);
alter table public.opportunities add column if not exists archived_at timestamptz, add column if not exists archived_by uuid references public.users(id);
create index if not exists tasks_assigned_to_id_idx on public.tasks(assigned_to_id);
create index if not exists agenda_events_responsible_user_id_idx on public.agenda_events(responsible_user_id);
create index if not exists av_demands_responsible_user_id_idx on public.av_demands(responsible_user_id);
create index if not exists opportunities_origin_owner_id_idx on public.opportunities(origin_owner_id);

-- Users
 drop policy if exists users_authenticated_all on public.users;
create policy users_self_or_admin_select on public.users for select to authenticated using (id = auth.uid() or public.is_korvix_admin());
create policy users_self_or_admin_update on public.users for update to authenticated using (id = auth.uid() or public.is_korvix_admin()) with check (id = auth.uid() or public.is_korvix_admin());

-- CRM ownership
 drop policy if exists opportunities_authenticated_all on public.opportunities;
create policy opportunities_owner_or_admin_select on public.opportunities for select to authenticated using (archived_at is null and (public.is_korvix_admin() or origin_owner_id = auth.uid() or closing_user_id = auth.uid()));
create policy opportunities_owner_or_admin_insert on public.opportunities for insert to authenticated with check (public.is_korvix_admin() or origin_owner_id = auth.uid());
create policy opportunities_owner_or_admin_update on public.opportunities for update to authenticated using (public.is_korvix_admin() or origin_owner_id = auth.uid() or closing_user_id = auth.uid()) with check (public.is_korvix_admin() or origin_owner_id = auth.uid() or closing_user_id = auth.uid());
create policy opportunities_owner_or_admin_delete on public.opportunities for delete to authenticated using (public.is_korvix_admin() or origin_owner_id = auth.uid() or closing_user_id = auth.uid());

-- Tasks ownership
 drop policy if exists tasks_authenticated_all on public.tasks;
create policy tasks_owner_or_admin_select on public.tasks for select to authenticated using (public.is_korvix_admin() or assigned_to_id = auth.uid());
create policy tasks_owner_or_admin_insert on public.tasks for insert to authenticated with check (public.is_korvix_admin() or assigned_to_id = auth.uid());
create policy tasks_owner_or_admin_update on public.tasks for update to authenticated using (public.is_korvix_admin() or assigned_to_id = auth.uid()) with check (public.is_korvix_admin() or assigned_to_id = auth.uid());
create policy tasks_owner_or_admin_delete on public.tasks for delete to authenticated using (public.is_korvix_admin() or assigned_to_id = auth.uid());

-- Agenda: company events have no responsible_user_id and are visible to all; personal events are private.
 drop policy if exists agenda_events_authenticated_all on public.agenda_events;
create policy agenda_events_scope_select on public.agenda_events for select to authenticated using (public.is_korvix_admin() or responsible_user_id is null or responsible_user_id = auth.uid());
create policy agenda_events_scope_insert on public.agenda_events for insert to authenticated with check (public.is_korvix_admin() or responsible_user_id is null or responsible_user_id = auth.uid());
create policy agenda_events_scope_update on public.agenda_events for update to authenticated using (public.is_korvix_admin() or responsible_user_id is null or responsible_user_id = auth.uid()) with check (public.is_korvix_admin() or responsible_user_id is null or responsible_user_id = auth.uid());
create policy agenda_events_scope_delete on public.agenda_events for delete to authenticated using (public.is_korvix_admin() or responsible_user_id is null or responsible_user_id = auth.uid());

-- Audiovisual: admin/cofounder only.
 drop policy if exists av_demands_authenticated_all on public.av_demands;
create policy av_demands_admin_select on public.av_demands for select to authenticated using (public.is_korvix_admin());
create policy av_demands_admin_insert on public.av_demands for insert to authenticated with check (public.is_korvix_admin());
create policy av_demands_admin_update on public.av_demands for update to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());
create policy av_demands_admin_delete on public.av_demands for delete to authenticated using (public.is_korvix_admin());

-- Financial data is readable/manageable by admins; physical deletion is restricted to korvixdigital@gmail.com.
 drop policy if exists payments_authenticated_all on public.payments;
create policy payments_admin_select on public.payments for select to authenticated using (public.is_korvix_admin());
create policy payments_admin_insert on public.payments for insert to authenticated with check (public.is_korvix_admin());
create policy payments_admin_update on public.payments for update to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());
create policy payments_finance_primary_delete on public.payments for delete to authenticated using (public.is_korvix_finance_admin());
 drop policy if exists commissions_authenticated_all on public.commissions;
create policy commissions_admin_select on public.commissions for select to authenticated using (public.is_korvix_admin());
create policy commissions_admin_insert on public.commissions for insert to authenticated with check (public.is_korvix_admin());
create policy commissions_admin_update on public.commissions for update to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());
create policy commissions_finance_primary_delete on public.commissions for delete to authenticated using (public.is_korvix_finance_admin());
 drop policy if exists contracts_authenticated_all on public.contracts;
create policy contracts_admin_select on public.contracts for select to authenticated using (public.is_korvix_admin());
create policy contracts_admin_insert on public.contracts for insert to authenticated with check (public.is_korvix_admin());
create policy contracts_admin_update on public.contracts for update to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());
create policy contracts_finance_primary_delete on public.contracts for delete to authenticated using (public.is_korvix_finance_admin());
 drop policy if exists cash_movements_authenticated_all on public.cash_movements;
create policy cash_movements_admin_select on public.cash_movements for select to authenticated using (public.is_korvix_admin());
create policy cash_movements_admin_insert on public.cash_movements for insert to authenticated with check (public.is_korvix_admin());
create policy cash_movements_admin_update on public.cash_movements for update to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());
create policy cash_movements_finance_primary_delete on public.cash_movements for delete to authenticated using (public.is_korvix_finance_admin());

-- Audit: admin only.
 drop policy if exists audit_logs_authenticated_all on public.audit_logs;
create policy audit_logs_admin_all on public.audit_logs for all to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());
