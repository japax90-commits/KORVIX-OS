-- =============================================================================
-- PENDENTE DE CONFIRMAÇÃO — parte final da migration 20261016120000
-- =============================================================================
-- Todo o resto da migration já foi aplicado em produção em 16/10/2026.
-- Estes comandos ficaram de fora porque contêm a palavra DELETE (a função
-- substitui os itens ao editar uma proposta; as políticas autorizam excluir
-- categorias, serviços e rascunhos), e a ferramenta usada exige confirmação
-- humana para isso.
--
-- Como aplicar: Supabase → SQL Editor → colar este arquivo inteiro → Run.
-- É seguro rodar mais de uma vez. Não apaga nem altera nenhum dado.
-- =============================================================================

create or replace function public.save_proposal(p jsonb)
returns public.proposals
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec public.proposals%rowtype;
  pid uuid := nullif(p->>'id', '')::uuid;
  req uuid := nullif(p->>'request_id', '')::uuid;
  item jsonb;
  pos integer := 0;
begin
  perform set_config('korvix.trusted', 'on', true);
  if not private.is_active_user() then
    raise exception 'Sessão inválida ou usuário inativo.' using errcode = '42501';
  end if;
  if jsonb_typeof(coalesce(p->'items', '[]'::jsonb)) <> 'array' then
    raise exception 'Itens inválidos.' using errcode = '22023';
  end if;

  if pid is null then
    -- Reenvio da mesma criação (clique duplo, rede instável): devolve a existente.
    if req is not null then
      select * into rec from public.proposals where request_id = req;
      if found then return rec; end if;
    end if;
    insert into public.proposals (request_id, title, client_id, client_name, opportunity_id, objective, description,
      recurrence_period, discount_type, discount_value, discount_target, extra_fees, extra_fees_label, setup_fee,
      payment_terms, delivery_terms, scope, deliverables, included, not_included, internal_notes, valid_until)
    values (req, btrim(p->>'title'), nullif(p->>'client_id', '')::uuid, btrim(p->>'client_name'), nullif(p->>'opportunity_id', '')::uuid,
      nullif(btrim(p->>'objective'), ''), nullif(btrim(p->>'description'), ''), coalesce(nullif(p->>'recurrence_period', ''), 'mensal'),
      nullif(p->>'discount_type', ''), coalesce((p->>'discount_value')::numeric, 0), coalesce(nullif(p->>'discount_target', ''), 'ambos'),
      coalesce((p->>'extra_fees')::numeric, 0), nullif(btrim(p->>'extra_fees_label'), ''), coalesce((p->>'setup_fee')::numeric, 0),
      nullif(btrim(p->>'payment_terms'), ''), nullif(btrim(p->>'delivery_terms'), ''), nullif(btrim(p->>'scope'), ''),
      nullif(btrim(p->>'deliverables'), ''), nullif(btrim(p->>'included'), ''), nullif(btrim(p->>'not_included'), ''),
      nullif(btrim(p->>'internal_notes'), ''), nullif(p->>'valid_until', '')::date)
    returning * into rec;
  else
    update public.proposals set
      title = btrim(p->>'title'),
      client_id = nullif(p->>'client_id', '')::uuid,
      client_name = btrim(p->>'client_name'),
      opportunity_id = nullif(p->>'opportunity_id', '')::uuid,
      objective = nullif(btrim(p->>'objective'), ''),
      description = nullif(btrim(p->>'description'), ''),
      recurrence_period = coalesce(nullif(p->>'recurrence_period', ''), 'mensal'),
      discount_type = nullif(p->>'discount_type', ''),
      discount_value = coalesce((p->>'discount_value')::numeric, 0),
      discount_target = coalesce(nullif(p->>'discount_target', ''), 'ambos'),
      extra_fees = coalesce((p->>'extra_fees')::numeric, 0),
      extra_fees_label = nullif(btrim(p->>'extra_fees_label'), ''),
      setup_fee = coalesce((p->>'setup_fee')::numeric, 0),
      payment_terms = nullif(btrim(p->>'payment_terms'), ''),
      delivery_terms = nullif(btrim(p->>'delivery_terms'), ''),
      scope = nullif(btrim(p->>'scope'), ''),
      deliverables = nullif(btrim(p->>'deliverables'), ''),
      included = nullif(btrim(p->>'included'), ''),
      not_included = nullif(btrim(p->>'not_included'), ''),
      internal_notes = nullif(btrim(p->>'internal_notes'), ''),
      valid_until = nullif(p->>'valid_until', '')::date,
      version = version + 1
    where id = pid and version = coalesce((p->>'version')::integer, version)
    returning * into rec;
    if not found then
      if exists (select 1 from public.proposals where id = pid) then
        raise exception 'CONFLITO: esta proposta foi alterada em outro lugar. Recarregue para ver a versão atual.' using errcode = 'P0001';
      end if;
      raise exception 'Proposta não encontrada ou sem permissão.' using errcode = '42501';
    end if;
    delete from public.proposal_items where proposal_id = pid;
  end if;

  for item in select * from jsonb_array_elements(coalesce(p->'items', '[]'::jsonb)) loop
    insert into public.proposal_items (proposal_id, position, service_id, name, description, billing_type, recurring,
      quantity, unit_price, list_price, discount)
    values (rec.id, pos, nullif(item->>'service_id', '')::uuid, btrim(item->>'name'), nullif(btrim(item->>'description'), ''),
      coalesce(nullif(item->>'billing_type', ''), 'unico'), coalesce((item->>'recurring')::boolean, false),
      coalesce((item->>'quantity')::numeric, 1), coalesce((item->>'unit_price')::numeric, 0),
      nullif(item->>'list_price', '')::numeric, coalesce((item->>'discount')::numeric, 0));
    pos := pos + 1;
  end loop;

  perform private.compute_proposal_totals(rec.id);
  select * into rec from public.proposals where id = rec.id;
  return rec;
end;
$$;
grant execute on function public.save_proposal(jsonb) to authenticated;

do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_categories' and policyname = 'service_categories_admin_delete') then
    execute 'create policy service_categories_admin_delete on public.service_categories for delete to authenticated using ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'services_admin_delete') then
    execute 'create policy services_admin_delete on public.services for delete to authenticated using ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposals' and policyname = 'proposals_draft_delete') then
    execute 'create policy proposals_draft_delete on public.proposals for delete to authenticated
  using (status = ''rascunho'' and ((select private.is_korvix_admin()) or created_by = (select auth.uid())))';
  end if;
end $p$;

-- Conferência (deve retornar save_proposal e 3 políticas):
select to_regprocedure('public.save_proposal(jsonb)') as funcao,
       (select count(*) from pg_policies where policyname in ('service_categories_admin_delete','services_admin_delete','proposals_draft_delete')) as politicas;
