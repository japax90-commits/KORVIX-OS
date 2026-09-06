alter table public.commissions
  add column if not exists commission_type text not null default 'vendedor_recorrente',
  add column if not exists recipient_role text,
  add column if not exists plan_name text,
  add column if not exists period_start date;

alter table public.commissions alter column vendor_id drop not null;

create or replace function public.sync_payment_finance(p_payment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  p public.payments%rowtype;
  opp public.opportunities%rowtype;
  contract_row public.contracts%rowtype;
  seller public.users%rowtype;
  mathias public.users%rowtype;
  pablo public.users%rowtype;
  plan text;
  seller_initial numeric;
  recurring numeric;
  mathias_initial numeric;
  pablo_initial numeric;
  created_commission uuid;
begin
  select * into p from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Pagamento não encontrado'; end if;

  delete from public.cash_movements
  where source_type = 'commission'
    and source_id in (select id from public.commissions where payment_id = p.id);
  delete from public.commissions where payment_id = p.id;
  delete from public.cash_movements where source_type = 'payment' and source_id = p.id;

  if p.status = 'pago' then
    select * into opp
    from public.opportunities
    where client_name = p.client_name
      and stage in ('ganho','fechado_ganho')
    order by created_at desc
    limit 1;

    select * into contract_row
    from public.contracts
    where client_name = p.client_name
    order by created_at desc
    limit 1;

    plan := coalesce(contract_row.plan_name, case
      when p.amount = 999 then 'Essencial'
      when p.amount = 1999 then 'Intermediário'
      when p.amount = 2999 then 'Completo'
      else null
    end);

    if opp.closing_user_id is not null then
      select * into seller from public.users where id = opp.closing_user_id;
    elsif opp.origin_owner_id is not null then
      select * into seller from public.users where id = opp.origin_owner_id;
    end if;

    recurring := round(p.amount * 0.10, 2);
    seller_initial := case plan
      when 'Essencial' then 500
      when 'Intermediário' then 1000
      when 'Intermediario' then 1000
      when 'Completo' then 1000
      else round(p.amount * 0.50, 2)
    end;

    if seller.id is not null then
      if p.type = 'primeira_venda' then
        insert into public.commissions(payment_id,vendor_id,vendor_name,amount,percentage,status,client_name,commission_type,recipient_role,plan_name,period_start)
        values(p.id,seller.id,seller.name,seller_initial,null,'liberada',p.client_name,'vendedor_inicial','vendedor',plan,coalesce(p.paid_at::date,current_date));
      end if;
      insert into public.commissions(payment_id,vendor_id,vendor_name,amount,percentage,status,client_name,commission_type,recipient_role,plan_name,period_start)
      values(p.id,seller.id,seller.name,recurring,10,'liberada',p.client_name,'vendedor_recorrente','vendedor',plan,coalesce(p.paid_at::date,current_date));
    end if;

    if plan in ('Intermediário','Intermediario','Completo') then
      select * into mathias from public.users where lower(name) = 'mathias' or lower(role) = 'audiovisual' order by case when lower(name)='mathias' then 0 else 1 end limit 1;
      if mathias.id is not null then
        if p.type = 'primeira_venda' then
          insert into public.commissions(payment_id,vendor_id,vendor_name,amount,percentage,status,client_name,commission_type,recipient_role,plan_name,period_start)
          values(p.id,mathias.id,mathias.name,500,null,'liberada',p.client_name,'operacao_inicial','audiovisual',plan,coalesce(p.paid_at::date,current_date));
        end if;
        insert into public.commissions(payment_id,vendor_id,vendor_name,amount,percentage,status,client_name,commission_type,recipient_role,plan_name,period_start)
        values(p.id,mathias.id,mathias.name,recurring,10,'liberada',p.client_name,'operacao_recorrente','audiovisual',plan,coalesce(p.paid_at::date,current_date));
      end if;
    end if;

    if plan in ('Completo') then
      select * into pablo from public.users where lower(name) = 'pablo' or lower(role) = 'cto' order by case when lower(name)='pablo' then 0 else 1 end limit 1;
      if pablo.id is not null then
        if p.type = 'primeira_venda' then
          insert into public.commissions(payment_id,vendor_id,vendor_name,amount,percentage,status,client_name,commission_type,recipient_role,plan_name,period_start)
          values(p.id,pablo.id,pablo.name,1000,null,'liberada',p.client_name,'implantacao_inicial','cto',plan,coalesce(p.paid_at::date,current_date));
        end if;
        insert into public.commissions(payment_id,vendor_id,vendor_name,amount,percentage,status,client_name,commission_type,recipient_role,plan_name,period_start)
        values(p.id,pablo.id,pablo.name,recurring,10,'liberada',p.client_name,'cto_recorrente','cto',plan,coalesce(p.paid_at::date,current_date));
      end if;
    end if;

    insert into public.cash_movements(category,direction,amount,description,movement_date,created_by,source_type,source_id)
    values('Receita','entrada',p.amount,'Pagamento de '||p.client_name||' · '||p.id::text,coalesce(p.paid_at::date,current_date),auth.uid(),'payment',p.id);

    for created_commission in select id from public.commissions where payment_id=p.id loop
      insert into public.cash_movements(category,direction,amount,description,movement_date,created_by,source_type,source_id)
      values('Comissão','saida',(select amount from public.commissions where id=created_commission),'Remuneração · '||p.client_name||' · '||created_commission::text,coalesce(p.paid_at::date,current_date),auth.uid(),'commission',created_commission);
    end loop;
  end if;

  return jsonb_build_object('success',true,'payment_id',p.id);
end;
$function$;

revoke execute on function public.sync_payment_finance(uuid) from anon;
revoke execute on function public.sync_payment_finance(uuid) from public;
