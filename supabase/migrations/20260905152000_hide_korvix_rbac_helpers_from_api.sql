create schema if not exists private;
alter function public.is_korvix_admin() set schema private;
alter function public.is_korvix_finance_admin() set schema private;
revoke all on function private.is_korvix_admin() from public, anon;
revoke all on function private.is_korvix_finance_admin() from public, anon;
grant execute on function private.is_korvix_admin() to authenticated;
grant execute on function private.is_korvix_finance_admin() to authenticated;
