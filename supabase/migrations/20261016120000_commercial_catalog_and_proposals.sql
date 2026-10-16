-- =============================================================================
-- Comercial: catálogo de serviços editável e propostas personalizadas
-- =============================================================================
-- Aditiva: cria tabelas novas, funções e políticas. Não altera nem remove
-- tabelas ou dados existentes. Os exemplos iniciais do catálogo só são
-- inseridos quando ainda não existe um serviço com o mesmo nome.
--
-- Permissões (alinhadas ao restante do banco):
--   * Catálogo: leitura por qualquer usuário ativo; alteração apenas por
--     private.is_korvix_admin(). Custos e observações internas ficam numa
--     tabela separada, legível só pela administração.
--   * Propostas: cada usuário ativo vê e edita as que criou; a administração
--     vê e edita todas. Excluir só rascunhos. Transições de status validadas
--     no banco. Gerar contrato/cobrança exige administração (RLS de contracts
--     e payments) e é idempotente.
--
-- Reversão (somente se nada tiver sido cadastrado e após backup):
--   drop function if exists public.create_payment_from_proposal(uuid, date, text, text);
--   drop function if exists public.create_contract_from_proposal(uuid, date, date);
--   drop function if exists public.save_proposal(jsonb);
--   drop function if exists public.save_service(jsonb);
--   drop table if exists public.proposal_items, public.proposals,
--     public.service_internals, public.services, public.service_categories;
--   drop sequence if exists public.proposal_code_seq;
--   drop function if exists private.touch_updated_at(), private.proposal_guard(),
--     private.proposal_items_guard(), private.compute_proposal_totals(uuid),
--     private.link_proposal_finance(uuid, uuid, uuid), private.proposal_protect(),
--     private.proposal_items_protect(), private.trusted_write();
--
-- Sem DROP/REVOKE: pode ser reaplicada com segurança (tudo é "if not exists"
-- ou "create or replace").
-- =============================================================================

create schema if not exists private;

-- Funções auxiliares ficam em "private" (não exposto pela API). Usuários logados
-- precisam de USAGE para que funções e gatilhos chamem as checagens de permissão
-- (as políticas RLS existentes já usam private.is_korvix_admin()).
grant usage on schema private to authenticated;

-- Usuário logado e ativo (substitui public.current_user_id(), que não é
-- executável por "authenticated" em produção).
create or replace function private.is_active_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.users u where u.id = auth.uid() and u.active = true);
$$;
grant execute on function private.is_active_user() to authenticated;

-- updated_at / updated_by automáticos -----------------------------------------
create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  if tg_table_name in ('services', 'proposals') then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Categorias ------------------------------------------------------------------
create table if not exists public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text check (description is null or char_length(description) <= 500),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists service_categories_name_key on public.service_categories (lower(btrim(name)));
create or replace trigger service_categories_touch before update on public.service_categories
  for each row execute function private.touch_updated_at();

-- Serviços e pacotes ----------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  kind text not null default 'servico' check (kind in ('servico', 'pacote')),
  category_id uuid references public.service_categories(id) on delete set null,
  name text not null check (char_length(btrim(name)) between 2 and 120),
  short_description text check (short_description is null or char_length(short_description) <= 280),
  description text check (description is null or char_length(description) <= 5000),
  icon text check (icon is null or char_length(icon) <= 40),
  image_url text check (image_url is null or (image_url ~ '^https://' and char_length(image_url) <= 1000)),
  price numeric(12,2) not null default 0 check (price >= 0),
  billing_type text not null default 'mensal' check (billing_type in ('mensal', 'unico', 'projeto', 'producao', 'hora', 'personalizado')),
  billing_unit text check (billing_unit is null or char_length(billing_unit) <= 60),
  billing_period text check (billing_period is null or char_length(billing_period) <= 120),
  delivery_estimate text check (delivery_estimate is null or char_length(delivery_estimate) <= 120),
  scope text check (scope is null or char_length(scope) <= 5000),
  deliverables text[] not null default '{}',
  limits text check (limits is null or char_length(limits) <= 2000),
  commercial_terms text check (commercial_terms is null or char_length(commercial_terms) <= 2000),
  status text not null default 'ativo' check (status in ('ativo', 'inativo', 'arquivado')),
  featured boolean not null default false,
  -- Itens de um pacote montado a partir de uma proposta (cópia dos valores).
  package_items jsonb not null default '[]'::jsonb check (jsonb_typeof(package_items) = 'array'),
  source_service_id uuid references public.services(id) on delete set null,
  created_by uuid references public.users(id) default auth.uid(),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Nomes únicos entre os serviços não arquivados (evita duplicar os exemplos).
create unique index if not exists services_name_active_key on public.services (lower(btrim(name))) where status <> 'arquivado';
create index if not exists services_category_idx on public.services (category_id);
create index if not exists services_status_idx on public.services (status);
create index if not exists services_source_idx on public.services (source_service_id);
create index if not exists services_created_by_idx on public.services (created_by);
create index if not exists services_updated_by_idx on public.services (updated_by);
create or replace trigger services_touch before update on public.services
  for each row execute function private.touch_updated_at();

-- Dados internos (custo e observações) — somente administração ---------------
create table if not exists public.service_internals (
  service_id uuid primary key references public.services(id) on delete cascade,
  internal_cost numeric(12,2) check (internal_cost is null or internal_cost >= 0),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 5000),
  updated_at timestamptz not null default now()
);
create or replace trigger service_internals_touch before update on public.service_internals
  for each row execute function private.touch_updated_at();

-- Propostas -------------------------------------------------------------------
create sequence if not exists public.proposal_code_seq;

create table if not exists public.proposals (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default ('PROP-' || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY') || '-' || lpad(nextval('public.proposal_code_seq')::text, 4, '0')),
  request_id uuid unique,
  title text not null check (char_length(btrim(title)) between 2 and 160),
  client_id uuid references public.clients(id) on delete set null,
  client_name text not null check (char_length(btrim(client_name)) between 1 and 160),
  opportunity_id uuid references public.opportunities(id) on delete set null,
  status text not null default 'rascunho' check (status in ('rascunho', 'enviada', 'negociacao', 'aprovada', 'recusada', 'expirada', 'cancelada')),
  objective text check (objective is null or char_length(objective) <= 2000),
  description text check (description is null or char_length(description) <= 5000),
  recurrence_period text not null default 'mensal' check (recurrence_period in ('mensal', 'trimestral', 'semestral', 'anual')),
  discount_type text check (discount_type is null or discount_type in ('valor', 'percentual')),
  discount_value numeric(12,2) not null default 0 check (discount_value >= 0),
  discount_target text not null default 'ambos' check (discount_target in ('unico', 'recorrente', 'ambos')),
  extra_fees numeric(12,2) not null default 0 check (extra_fees >= 0),
  extra_fees_label text check (extra_fees_label is null or char_length(extra_fees_label) <= 120),
  setup_fee numeric(12,2) not null default 0 check (setup_fee >= 0),
  payment_terms text check (payment_terms is null or char_length(payment_terms) <= 2000),
  delivery_terms text check (delivery_terms is null or char_length(delivery_terms) <= 2000),
  scope text check (scope is null or char_length(scope) <= 5000),
  deliverables text check (deliverables is null or char_length(deliverables) <= 5000),
  included text check (included is null or char_length(included) <= 3000),
  not_included text check (not_included is null or char_length(not_included) <= 3000),
  internal_notes text check (internal_notes is null or char_length(internal_notes) <= 5000),
  valid_until date,
  -- Totais calculados pelo banco (save_proposal); nunca enviados pelo navegador.
  subtotal_once numeric(12,2) not null default 0,
  subtotal_recurring numeric(12,2) not null default 0,
  discount_once numeric(12,2) not null default 0,
  discount_recurring numeric(12,2) not null default 0,
  total_once numeric(12,2) not null default 0,
  total_recurring numeric(12,2) not null default 0,
  contract_id uuid unique references public.contracts(id) on delete set null,
  payment_id uuid unique references public.payments(id) on delete set null,
  sent_at timestamptz,
  decided_at timestamptz,
  version integer not null default 1,
  created_by uuid not null default auth.uid() references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proposals_percent_max check (discount_type is distinct from 'percentual' or discount_value <= 100),
  constraint proposals_fixed_target check (discount_type is distinct from 'valor' or discount_target <> 'ambos')
);
create index if not exists proposals_client_idx on public.proposals (client_id);
create index if not exists proposals_opportunity_idx on public.proposals (opportunity_id);
create index if not exists proposals_status_idx on public.proposals (status);
create index if not exists proposals_created_by_idx on public.proposals (created_by);
create index if not exists proposals_updated_by_idx on public.proposals (updated_by);

create table if not exists public.proposal_items (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  position integer not null default 0,
  -- Restrict: um serviço usado em proposta não pode ser excluído (arquive-o).
  service_id uuid references public.services(id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 160),
  description text check (description is null or char_length(description) <= 2000),
  billing_type text not null default 'unico' check (billing_type in ('mensal', 'unico', 'projeto', 'producao', 'hora', 'personalizado')),
  recurring boolean not null default false,
  quantity numeric(10,2) not null default 1 check (quantity > 0),
  unit_price numeric(12,2) not null default 0 check (unit_price >= 0),
  list_price numeric(12,2) check (list_price is null or list_price >= 0),
  discount numeric(12,2) not null default 0 check (discount >= 0),
  line_total numeric(12,2) not null default 0
);
create index if not exists proposal_items_proposal_idx on public.proposal_items (proposal_id, position);
create index if not exists proposal_items_service_idx on public.proposal_items (service_id);

-- Regras de status e bloqueio de edição ---------------------------------------
create or replace function private.proposal_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  allowed text[];
begin
  if new.status is distinct from old.status then
    allowed := case old.status
      when 'rascunho'   then array['enviada', 'cancelada']
      when 'enviada'    then array['negociacao', 'aprovada', 'recusada', 'expirada', 'cancelada', 'rascunho']
      when 'negociacao' then array['enviada', 'aprovada', 'recusada', 'expirada', 'cancelada']
      when 'recusada'   then array['negociacao', 'cancelada']
      when 'expirada'   then array['negociacao', 'cancelada']
      when 'aprovada'   then array['cancelada']
      else array[]::text[]
    end;
    if not (new.status = any(allowed)) then
      raise exception 'Transição de status inválida: % → %', old.status, new.status using errcode = 'P0001';
    end if;
    if old.status = 'aprovada' and (old.contract_id is not null or old.payment_id is not null) then
      raise exception 'Proposta com contrato ou cobrança gerados não pode ser cancelada aqui. Ajuste no Financeiro.' using errcode = 'P0001';
    end if;
    if new.status = 'enviada' and new.sent_at is null then new.sent_at := now(); end if;
    if new.status in ('aprovada', 'recusada') then new.decided_at := now(); end if;
  end if;

  -- Conteúdo comercial só muda enquanto a proposta está em elaboração.
  if old.status not in ('rascunho', 'enviada', 'negociacao') and (
    new.title, new.client_id, new.client_name, new.opportunity_id, new.objective, new.description,
    new.recurrence_period, new.discount_type, new.discount_value, new.discount_target, new.extra_fees,
    new.extra_fees_label, new.setup_fee, new.payment_terms, new.delivery_terms, new.scope, new.deliverables,
    new.included, new.not_included, new.valid_until, new.total_once, new.total_recurring
  ) is distinct from (
    old.title, old.client_id, old.client_name, old.opportunity_id, old.objective, old.description,
    old.recurrence_period, old.discount_type, old.discount_value, old.discount_target, old.extra_fees,
    old.extra_fees_label, old.setup_fee, old.payment_terms, old.delivery_terms, old.scope, old.deliverables,
    old.included, old.not_included, old.valid_until, old.total_once, old.total_recurring
  ) then
    raise exception 'Esta proposta está %; o conteúdo não pode mais ser alterado.', old.status using errcode = 'P0001';
  end if;

  -- Vínculos financeiros, uma vez criados, não são trocados por outro registro.
  if old.contract_id is not null and new.contract_id is not null and new.contract_id <> old.contract_id then
    raise exception 'A proposta já tem um contrato vinculado.' using errcode = 'P0001';
  end if;
  if old.payment_id is not null and new.payment_id is not null and new.payment_id <> old.payment_id then
    raise exception 'A proposta já tem uma cobrança vinculada.' using errcode = 'P0001';
  end if;
  if new.created_by is distinct from old.created_by then
    raise exception 'O responsável pela proposta não pode ser alterado.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
create or replace trigger proposals_guard before update on public.proposals
  for each row execute function private.proposal_guard();
create or replace trigger proposals_touch before update on public.proposals
  for each row execute function private.touch_updated_at();

create or replace function private.proposal_items_guard()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  st text;
begin
  select status into st from public.proposals where id = coalesce(new.proposal_id, old.proposal_id);
  -- Exclusão em cascata da proposta (rascunho) não encontra mais a linha-mãe.
  if st is not null and st not in ('rascunho', 'enviada', 'negociacao') then
    raise exception 'Os itens de uma proposta % não podem ser alterados.', st using errcode = 'P0001';
  end if;
  return coalesce(new, old);
end;
$$;
create or replace trigger proposal_items_guard before insert or update or delete on public.proposal_items
  for each row execute function private.proposal_items_guard();

-- Travas contra gravação direta pela API --------------------------------------
-- As funções desta migration marcam a transação como confiável
-- (korvix.trusted, válido só até o fim da transação). Fora delas:
--   * proposta não pode ser criada diretamente (use save_proposal);
--   * na edição direta só o status (e a versão) podem mudar — totais, código,
--     responsável e vínculos com contrato/cobrança ficam protegidos;
--   * itens só mudam via save_proposal (exceto a exclusão em cascata).
create or replace function private.trusted_write()
returns boolean language sql stable set search_path = public as $$ select coalesce(current_setting('korvix.trusted', true), '') = 'on' $$;

create or replace function private.proposal_protect()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if private.trusted_write() then return new; end if;
  if tg_op = 'INSERT' then
    raise exception 'Use o construtor de propostas para criar propostas.' using errcode = '42501';
  end if;
  if (to_jsonb(new) - array['status', 'version', 'updated_at', 'updated_by', 'sent_at', 'decided_at'])
     is distinct from (to_jsonb(old) - array['status', 'version', 'updated_at', 'updated_by', 'sent_at', 'decided_at']) then
    raise exception 'Somente o status pode ser alterado diretamente. Use o construtor de propostas para editar o conteúdo.' using errcode = '42501';
  end if;
  return new;
end;
$$;
create or replace trigger proposals_a_protect before insert or update on public.proposals
  for each row execute function private.proposal_protect();

create or replace function private.proposal_items_protect()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if private.trusted_write() then return coalesce(new, old); end if;
  -- Exclusão em cascata da proposta (rascunho): a linha-mãe já não existe.
  if tg_op = 'DELETE' and not exists (select 1 from public.proposals where id = old.proposal_id) then return old; end if;
  raise exception 'Os itens só podem ser alterados pelo construtor de propostas.' using errcode = '42501';
end;
$$;
create or replace trigger proposal_items_a_protect before insert or update or delete on public.proposal_items
  for each row execute function private.proposal_items_protect();

-- Cálculo dos totais (mesma regra de lib/commercial/calc.ts) -------------------
create or replace function private.compute_proposal_totals(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.proposals%rowtype;
  s_once numeric(12,2);
  s_rec numeric(12,2);
  d_once numeric(12,2) := 0;
  d_rec numeric(12,2) := 0;
begin
  perform set_config('korvix.trusted', 'on', true);
  update public.proposal_items
     set line_total = greatest(round(quantity * unit_price, 2) - discount, 0)
   where proposal_id = p_id;

  select coalesce(sum(line_total) filter (where not recurring), 0),
         coalesce(sum(line_total) filter (where recurring), 0)
    into s_once, s_rec
    from public.proposal_items where proposal_id = p_id;

  select * into p from public.proposals where id = p_id;
  if p.discount_type = 'percentual' and p.discount_value > 0 then
    if p.discount_target in ('unico', 'ambos') then d_once := round(s_once * p.discount_value / 100, 2); end if;
    if p.discount_target in ('recorrente', 'ambos') then d_rec := round(s_rec * p.discount_value / 100, 2); end if;
  elsif p.discount_type = 'valor' and p.discount_value > 0 then
    if p.discount_target = 'unico' then d_once := least(p.discount_value, s_once); end if;
    if p.discount_target = 'recorrente' then d_rec := least(p.discount_value, s_rec); end if;
  end if;

  update public.proposals
     set subtotal_once = s_once,
         subtotal_recurring = s_rec,
         discount_once = d_once,
         discount_recurring = d_rec,
         total_once = s_once - d_once + setup_fee + extra_fees,
         total_recurring = s_rec - d_rec
   where id = p_id;
end;
$$;

-- Vincula contrato/cobrança gerados (colunas não graváveis pelo navegador).
create or replace function private.link_proposal_finance(p_id uuid, p_contract uuid, p_payment uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('korvix.trusted', 'on', true);
  if not private.is_korvix_admin() then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;
  update public.proposals
     set contract_id = coalesce(contract_id, p_contract),
         payment_id = coalesce(payment_id, p_payment)
   where id = p_id;
end;
$$;

-- Salvar serviço (atômico, com controle de conflito) --------------------------
create or replace function public.save_service(p jsonb)
returns public.services
language plpgsql
security invoker
set search_path = public
as $$
declare
  rec public.services%rowtype;
  sid uuid := nullif(p->>'id', '')::uuid;
  v_deliverables text[] := coalesce(array(select btrim(x) from jsonb_array_elements_text(coalesce(p->'deliverables', '[]'::jsonb)) x where btrim(x) <> ''), '{}');
begin
  if not private.is_korvix_admin() then
    raise exception 'Sem permissão para alterar o catálogo.' using errcode = '42501';
  end if;

  if sid is null then
    insert into public.services (kind, category_id, name, short_description, description, icon, image_url, price,
      billing_type, billing_unit, billing_period, delivery_estimate, scope, deliverables, limits, commercial_terms,
      status, featured, package_items, source_service_id)
    values (coalesce(nullif(p->>'kind', ''), 'servico'), nullif(p->>'category_id', '')::uuid, btrim(p->>'name'),
      nullif(btrim(p->>'short_description'), ''), nullif(btrim(p->>'description'), ''), nullif(p->>'icon', ''),
      nullif(btrim(p->>'image_url'), ''), coalesce((p->>'price')::numeric, 0), coalesce(nullif(p->>'billing_type', ''), 'mensal'),
      nullif(btrim(p->>'billing_unit'), ''), nullif(btrim(p->>'billing_period'), ''), nullif(btrim(p->>'delivery_estimate'), ''),
      nullif(btrim(p->>'scope'), ''), v_deliverables, nullif(btrim(p->>'limits'), ''), nullif(btrim(p->>'commercial_terms'), ''),
      coalesce(nullif(p->>'status', ''), 'ativo'), coalesce((p->>'featured')::boolean, false),
      coalesce(p->'package_items', '[]'::jsonb), nullif(p->>'source_service_id', '')::uuid)
    returning * into rec;
  else
    update public.services set
      kind = coalesce(nullif(p->>'kind', ''), kind),
      category_id = nullif(p->>'category_id', '')::uuid,
      name = btrim(p->>'name'),
      short_description = nullif(btrim(p->>'short_description'), ''),
      description = nullif(btrim(p->>'description'), ''),
      icon = nullif(p->>'icon', ''),
      image_url = nullif(btrim(p->>'image_url'), ''),
      price = coalesce((p->>'price')::numeric, 0),
      billing_type = coalesce(nullif(p->>'billing_type', ''), billing_type),
      billing_unit = nullif(btrim(p->>'billing_unit'), ''),
      billing_period = nullif(btrim(p->>'billing_period'), ''),
      delivery_estimate = nullif(btrim(p->>'delivery_estimate'), ''),
      scope = nullif(btrim(p->>'scope'), ''),
      deliverables = v_deliverables,
      limits = nullif(btrim(p->>'limits'), ''),
      commercial_terms = nullif(btrim(p->>'commercial_terms'), ''),
      status = coalesce(nullif(p->>'status', ''), status),
      featured = coalesce((p->>'featured')::boolean, featured),
      package_items = coalesce(p->'package_items', package_items)
    where id = sid
      and (p->>'expected_updated_at' is null or date_trunc('milliseconds', updated_at) = date_trunc('milliseconds', (p->>'expected_updated_at')::timestamptz))
    returning * into rec;
    if not found then
      if exists (select 1 from public.services where id = sid) then
        raise exception 'CONFLITO: este serviço foi alterado por outra pessoa. Recarregue para ver a versão atual.' using errcode = 'P0001';
      end if;
      raise exception 'Serviço não encontrado.' using errcode = 'P0001';
    end if;
  end if;

  if p ? 'internal_cost' or p ? 'internal_notes' then
    insert into public.service_internals (service_id, internal_cost, internal_notes)
    values (rec.id, nullif(p->>'internal_cost', '')::numeric, nullif(btrim(p->>'internal_notes'), ''))
    on conflict (service_id) do update
      set internal_cost = excluded.internal_cost, internal_notes = excluded.internal_notes;
  end if;
  return rec;
end;
$$;

-- Salvar proposta + itens (atômico, idempotente, com controle de versão) ------
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

-- Proposta aprovada → contrato (idempotente; exige administração) -------------
create or replace function public.create_contract_from_proposal(p_id uuid, p_start_date date default current_date, p_next_billing date default null)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.proposals%rowtype;
  company text;
  cid uuid;
begin
  perform set_config('korvix.trusted', 'on', true);
  if not private.is_korvix_admin() then
    raise exception 'Somente a administração pode gerar contratos.' using errcode = '42501';
  end if;
  select * into p from public.proposals where id = p_id for update;
  if not found then raise exception 'Proposta não encontrada.' using errcode = 'P0001'; end if;
  if p.contract_id is not null then return p.contract_id; end if;
  if p.status <> 'aprovada' then raise exception 'Gere o contrato somente a partir de uma proposta aprovada.' using errcode = 'P0001'; end if;
  if p.total_recurring <= 0 then raise exception 'A proposta não tem valor recorrente para um contrato.' using errcode = 'P0001'; end if;
  if p.client_id is null then raise exception 'Vincule a proposta a um cliente cadastrado antes de gerar o contrato.' using errcode = 'P0001'; end if;
  select company_name into company from public.clients where id = p.client_id;
  if company is null then raise exception 'Cliente da proposta não encontrado.' using errcode = 'P0001'; end if;

  insert into public.contracts (client_name, plan_name, value, frequency, status, start_date, next_billing_date)
  values (company, left(p.title, 160), p.total_recurring, p.recurrence_period, 'ativo', coalesce(p_start_date, current_date), p_next_billing)
  returning id into cid;
  perform private.link_proposal_finance(p_id, cid, null);
  return cid;
end;
$$;

-- Proposta aprovada → cobrança PENDENTE dos valores únicos (idempotente) ------
create or replace function public.create_payment_from_proposal(p_id uuid, p_due_date date, p_method text, p_type text default 'primeira_venda')
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  p public.proposals%rowtype;
  company text;
  pay uuid;
begin
  perform set_config('korvix.trusted', 'on', true);
  if not private.is_korvix_admin() then
    raise exception 'Somente a administração pode lançar cobranças.' using errcode = '42501';
  end if;
  if p_due_date is null then raise exception 'Informe o vencimento.' using errcode = '22023'; end if;
  if p_method not in ('pix', 'boleto', 'credito', 'debito', 'dinheiro') then raise exception 'Forma de pagamento inválida.' using errcode = '22023'; end if;
  if p_type not in ('primeira_venda', 'recorrencia', 'avulso') then raise exception 'Tipo de pagamento inválido.' using errcode = '22023'; end if;
  select * into p from public.proposals where id = p_id for update;
  if not found then raise exception 'Proposta não encontrada.' using errcode = 'P0001'; end if;
  if p.payment_id is not null then return p.payment_id; end if;
  if p.status <> 'aprovada' then raise exception 'Lance a cobrança somente a partir de uma proposta aprovada.' using errcode = 'P0001'; end if;
  if p.total_once <= 0 then raise exception 'A proposta não tem valores únicos a cobrar.' using errcode = 'P0001'; end if;
  if p.client_id is null then raise exception 'Vincule a proposta a um cliente cadastrado antes de lançar a cobrança.' using errcode = 'P0001'; end if;
  select company_name into company from public.clients where id = p.client_id;

  -- Sempre pendente: a confirmação do recebimento continua no Financeiro.
  insert into public.payments (client_id, client_name, amount, type, method, status, due_date)
  values (p.client_id, company, p.total_once, p_type, p_method, 'pendente', p_due_date)
  returning id into pay;
  perform private.link_proposal_finance(p_id, null, pay);
  return pay;
end;
$$;

-- Privilégios e RLS -----------------------------------------------------------
alter table public.service_categories enable row level security;
alter table public.services enable row level security;
alter table public.service_internals enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_items enable row level security;

-- Privilégios de tabela (iguais aos padrões do Supabase). O acesso real é
-- definido pelas políticas RLS abaixo e pelas travas de proposals_a_protect.
grant select, insert, update, delete on public.service_categories, public.services, public.service_internals,
  public.proposals, public.proposal_items to authenticated;
grant usage on sequence public.proposal_code_seq to authenticated;

do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_categories' and policyname = 'service_categories_select') then
    execute 'create policy service_categories_select on public.service_categories for select to authenticated using ((select private.is_active_user()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_categories' and policyname = 'service_categories_admin_insert') then
    execute 'create policy service_categories_admin_insert on public.service_categories for insert to authenticated with check ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_categories' and policyname = 'service_categories_admin_update') then
    execute 'create policy service_categories_admin_update on public.service_categories for update to authenticated using ((select private.is_korvix_admin())) with check ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_categories' and policyname = 'service_categories_admin_delete') then
    execute 'create policy service_categories_admin_delete on public.service_categories for delete to authenticated using ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'services_select') then
    execute 'create policy services_select on public.services for select to authenticated using ((select private.is_active_user()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'services_admin_insert') then
    execute 'create policy services_admin_insert on public.services for insert to authenticated with check ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'services_admin_update') then
    execute 'create policy services_admin_update on public.services for update to authenticated using ((select private.is_korvix_admin())) with check ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'services' and policyname = 'services_admin_delete') then
    execute 'create policy services_admin_delete on public.services for delete to authenticated using ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'service_internals' and policyname = 'service_internals_admin_all') then
    execute 'create policy service_internals_admin_all on public.service_internals for all to authenticated using ((select private.is_korvix_admin())) with check ((select private.is_korvix_admin()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposals' and policyname = 'proposals_owner_or_admin_select') then
    execute 'create policy proposals_owner_or_admin_select on public.proposals for select to authenticated
  using ((select private.is_korvix_admin()) or created_by = (select auth.uid()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposals' and policyname = 'proposals_owner_insert') then
    execute 'create policy proposals_owner_insert on public.proposals for insert to authenticated
  with check ((select private.is_active_user()) and created_by = (select auth.uid()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposals' and policyname = 'proposals_owner_or_admin_update') then
    execute 'create policy proposals_owner_or_admin_update on public.proposals for update to authenticated
  using ((select private.is_korvix_admin()) or created_by = (select auth.uid()))
  with check ((select private.is_korvix_admin()) or created_by = (select auth.uid()))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposals' and policyname = 'proposals_draft_delete') then
    execute 'create policy proposals_draft_delete on public.proposals for delete to authenticated
  using (status = ''rascunho'' and ((select private.is_korvix_admin()) or created_by = (select auth.uid())))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposal_items' and policyname = 'proposal_items_select') then
    execute 'create policy proposal_items_select on public.proposal_items for select to authenticated
  using (exists (select 1 from public.proposals p where p.id = proposal_id and ((select private.is_korvix_admin()) or p.created_by = (select auth.uid()))))';
  end if;
end $p$;
do $p$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'proposal_items' and policyname = 'proposal_items_write') then
    execute 'create policy proposal_items_write on public.proposal_items for all to authenticated
  using (exists (select 1 from public.proposals p where p.id = proposal_id and ((select private.is_korvix_admin()) or p.created_by = (select auth.uid()))))
  with check (exists (select 1 from public.proposals p where p.id = proposal_id and ((select private.is_korvix_admin()) or p.created_by = (select auth.uid()))))';
  end if;
end $p$;

-- As funções validam a permissão internamente (administração ou usuário ativo);
-- as do schema private não são expostas pela API.
grant execute on function public.save_service(jsonb) to authenticated;
grant execute on function public.save_proposal(jsonb) to authenticated;
grant execute on function public.create_contract_from_proposal(uuid, date, date) to authenticated;
grant execute on function public.create_payment_from_proposal(uuid, date, text, text) to authenticated;
grant execute on function private.compute_proposal_totals(uuid) to authenticated;
grant execute on function private.link_proposal_finance(uuid, uuid, uuid) to authenticated;

-- Exemplos iniciais (editáveis; não duplica se já existirem) -------------------
insert into public.service_categories (name, description, sort_order)
select v.name, v.description, v.sort_order
from (values
  ('Marketing digital', 'Tráfego, redes sociais e presença no Google', 1),
  ('Tecnologia', 'Sites, landing pages e automações com IA', 2),
  ('Audiovisual', 'Produção de vídeos e conteúdo', 3),
  ('Planos mensais', 'Pacotes recorrentes da Korvix Digital', 4)
) as v(name, description, sort_order)
where not exists (select 1 from public.service_categories c where lower(btrim(c.name)) = lower(btrim(v.name)));

insert into public.services (kind, category_id, name, short_description, icon, price, billing_type, billing_unit, deliverables, featured, created_by)
select v.kind, (select id from public.service_categories c where lower(c.name) = lower(v.category)), v.name, v.short_description,
       v.icon, v.price, v.billing_type, v.billing_unit, v.deliverables, v.featured, null
from (values
  ('servico', 'Marketing digital', 'Tráfego Pago', 'Campanhas estratégicas no Google, Meta e outros canais.', 'megaphone', 997.00, 'mensal', 'mês', '{}'::text[], true),
  ('servico', 'Marketing digital', 'Mídias Sociais', 'Criação de conteúdo, gestão de redes sociais e fortalecimento da marca.', 'share', 997.00, 'mensal', 'mês', '{}'::text[], true),
  ('servico', 'Tecnologia', 'Site ou Landing Page', 'Desenvolvimento de sites e páginas estratégicas para geração de leads e vendas.', 'globe', 1997.00, 'projeto', 'projeto', '{}'::text[], true),
  ('servico', 'Tecnologia', 'Agente de IA', 'Automação de processos, atendimento e geração de leads com inteligência artificial.', 'bot', 1997.00, 'projeto', 'projeto', '{}'::text[], true),
  ('servico', 'Audiovisual', 'Produção Audiovisual', 'Vídeos profissionais para apresentar produtos, serviços e diferenciais da empresa.', 'video', 997.00, 'producao', 'produção', '{}'::text[], true),
  ('servico', 'Marketing digital', 'Google Meu Negócio', 'Configuração e otimização do perfil da empresa para melhorar sua presença no Google e no Maps.', 'map-pin', 597.00, 'unico', 'serviço', '{}'::text[], true),
  -- Planos que já existiam no código (lib/business/plans.ts), agora editáveis.
  ('pacote', 'Planos mensais', 'Plano Essencial', 'Presença no Google e gestão de tráfego pago.', 'layers', 999.00, 'mensal', 'mês', array['Google Meu Negócio', 'Tráfego Pago (anúncio cobrado à parte)'], false),
  ('pacote', 'Planos mensais', 'Plano Intermediário', 'Google, tráfego pago, redes sociais e visitas presenciais.', 'layers', 1999.00, 'mensal', 'mês', array['Google Meu Negócio', 'Tráfego Pago (anúncio cobrado à parte)', 'Gestão de Mídias Sociais', '3 Visitas Presenciais por mês'], true),
  ('pacote', 'Planos mensais', 'Plano Completo', 'Operação completa com site profissional e agente de IA.', 'layers', 2999.00, 'mensal', 'mês', array['Google Meu Negócio', 'Tráfego Pago (anúncio cobrado à parte)', 'Gestão de Mídias Sociais', '3 Visitas Presenciais por mês', 'Site Profissional', 'Agente de IA'], false)
) as v(kind, category, name, short_description, icon, price, billing_type, billing_unit, deliverables, featured)
where not exists (select 1 from public.services s where lower(btrim(s.name)) = lower(btrim(v.name)) and s.status <> 'arquivado');
