drop policy if exists users_self_or_admin_update on public.users;
create policy users_admin_update on public.users for update to authenticated using (public.is_korvix_admin()) with check (public.is_korvix_admin());

drop policy if exists opportunities_owner_or_admin_update on public.opportunities;
create policy opportunities_owner_or_admin_update on public.opportunities
for update to authenticated
using (public.is_korvix_admin() or origin_owner_id = auth.uid() or closing_user_id = auth.uid())
with check (public.is_korvix_admin() or (origin_owner_id = auth.uid() and (closing_user_id is null or closing_user_id = auth.uid())));

drop policy if exists opportunities_owner_or_admin_delete on public.opportunities;
create policy opportunities_admin_delete on public.opportunities for delete to authenticated using (public.is_korvix_admin());
