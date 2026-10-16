-- Testes de banco do módulo Comercial (migration 20261016120000).
-- ATENÇÃO: execute SOMENTE num banco local descartável, nunca em produção.
-- Pré-requisitos: schema equivalente ao de produção + a migration aplicada.
-- Uso: psql -d <banco_local> -f supabase/tests/commercial_catalog_and_proposals.test.sql
-- Cada bloco "T" imprime o resultado esperado ou o erro esperado.
insert into users(id,name,email,role) values
 ('00000000-0000-0000-0000-000000000001','Admin','korvixdigital@gmail.com','ceo'),
 ('00000000-0000-0000-0000-000000000002','Vend A','a@x.com','vendedor'),
 ('00000000-0000-0000-0000-000000000003','Vend B','b@x.com','vendedor');
insert into clients(id,company_name,contact_name,phone) values ('10000000-0000-0000-0000-000000000001','ACME','Ana','1');
\set ON_ERROR_STOP 0
\set ADMIN '00000000-0000-0000-0000-000000000001'
\set A '00000000-0000-0000-0000-000000000002'
\set B '00000000-0000-0000-0000-000000000003'
set role authenticated;
-- vendedor não altera catálogo
select set_config('request.jwt.claim.sub', :'A', false);
\echo T1 vendedor save_service (espera erro de permissão)
select save_service('{"name":"X","price":1}');
\echo T2 vendedor update direto (espera 0 linhas)
update services set price = 1 where name='Tráfego Pago';
\echo T3 vendedor lê catálogo (9) e não lê internos
select count(*) from services; select count(*) from service_internals;
-- admin cria/edita
select set_config('request.jwt.claim.sub', :'ADMIN', false);
\echo T4 admin cria serviço com custo
select name, price, billing_type from save_service('{"name":"Consultoria","price":"350.50","billing_type":"hora","deliverables":["Relatório"," ",""],"internal_cost":"100","internal_notes":"x"}');
select s.deliverables, i.internal_cost from services s join service_internals i on i.service_id=s.id where s.name='Consultoria';
\echo T5 conflito de edição (espera CONFLITO)
select save_service(jsonb_build_object('id',(select id from services where name='Consultoria'),'name','Consultoria 2','price',1,'expected_updated_at','2000-01-01T00:00:00Z'));
\echo T6 edição com updated_at correto
select name, price from save_service((select jsonb_build_object('id',id,'name','Consultoria 2','price',400,'billing_type','hora','expected_updated_at',updated_at) from services where name='Consultoria'));
\echo T7 nome duplicado (espera duplicate key)
select save_service('{"name":"tráfego pago","price":1}');
-- propostas
select set_config('request.jwt.claim.sub', :'A', false);
\echo T8 vendedor A cria proposta com itens
select code, status, subtotal_once, subtotal_recurring, discount_once, discount_recurring, total_once, total_recurring from save_proposal(jsonb_build_object(
 'request_id','20000000-0000-0000-0000-000000000001','title','Proposta ACME','client_id','10000000-0000-0000-0000-000000000001','client_name','ACME',
 'discount_type','percentual','discount_value',10,'discount_target','ambos','setup_fee',500,'extra_fees',50,
 'items', jsonb_build_array(
   jsonb_build_object('service_id',(select id from services where name='Tráfego Pago'),'name','Tráfego Pago','billing_type','mensal','recurring',true,'quantity',1,'unit_price',997,'list_price',997),
   jsonb_build_object('service_id',(select id from services where name='Mídias Sociais'),'name','Mídias Sociais','billing_type','mensal','recurring',true,'quantity',1,'unit_price',900,'discount',100),
   jsonb_build_object('service_id',(select id from services where name='Agente de IA'),'name','Agente de IA','billing_type','projeto','recurring',false,'quantity',1,'unit_price',1997),
   jsonb_build_object('name','Treinamento da equipe','billing_type','unico','recurring',false,'quantity',2,'unit_price',150))));
\echo   esperado: once 2297, rec 1797, d_once 229.70, d_rec 179.70, total_once 2617.30, total_rec 1617.30
\echo T9 reenvio do mesmo request_id não duplica
select count(*) from save_proposal('{"request_id":"20000000-0000-0000-0000-000000000001","title":"dup","client_name":"ACME"}'); select count(*) as propostas from proposals;
\echo T10 vendedor B não vê a proposta de A
select set_config('request.jwt.claim.sub', :'B', false);
select count(*) from proposals; select count(*) from proposal_items;
update proposals set title='hack'; 
select save_proposal(jsonb_build_object('id',(select id from proposals limit 1),'title','hack','client_name','x'));
\echo T11 B não cria proposta em nome de A
insert into proposals(title,client_name,created_by) values ('x','y',:'A');
select set_config('request.jwt.claim.sub', :'A', false);
\echo T12 conflito de versão
select save_proposal(jsonb_build_object('id',(select id from proposals where title='Proposta ACME'),'version',99,'title','Proposta ACME','client_name','ACME'));
\echo T13 transição inválida rascunho → aprovada
update proposals set status='aprovada' where title='Proposta ACME';
\echo T14 rascunho → enviada → aprovada
update proposals set status='enviada' where title='Proposta ACME'; update proposals set status='aprovada' where title='Proposta ACME'; select status, sent_at is not null s, decided_at is not null d from proposals;
\echo T15 aprovada: conteúdo bloqueado
select save_proposal(jsonb_build_object('id',(select id from proposals where title='Proposta ACME'),'title','Mudou','client_name','ACME','items','[]'::jsonb));
update proposal_items set unit_price=1;
\echo T16 vendedor não gera contrato
select create_contract_from_proposal((select id from proposals where title='Proposta ACME'));
\echo T17 vendedor não exclui proposta aprovada
delete from proposals; select count(*) from proposals;
select set_config('request.jwt.claim.sub', :'ADMIN', false);
\echo T18 admin gera contrato duas vezes (mesmo id, 1 contrato)
select create_contract_from_proposal((select id from proposals where title='Proposta ACME')) = create_contract_from_proposal((select id from proposals where title='Proposta ACME')) as same; select count(*) contratos, max(value) valor, max(plan_name) plano from contracts; select active_contract_value, active_plan_name from clients;
\echo T19 cobrança pendente idempotente
select create_payment_from_proposal((select id from proposals where title='Proposta ACME'), current_date + 7, 'pix') = create_payment_from_proposal((select id from proposals where title='Proposta ACME'), current_date + 7, 'pix') same; select count(*), max(amount), max(status) from payments;
\echo T20 cancelar aprovada com contrato (espera erro)
update proposals set status='cancelada' where title='Proposta ACME';
\echo T21 excluir serviço usado em proposta (espera FK)
delete from services where name='Tráfego Pago';
\echo T22 excluir serviço sem vínculo
delete from services where name='Consultoria 2'; select count(*) from service_internals;
\echo T23 desconto em valor sem alvo (espera check)
select save_proposal('{"title":"Fixo","client_name":"Z","discount_type":"valor","discount_value":10,"discount_target":"ambos"}');
\echo T24 desconto valor maior que subtotal
select total_once, total_recurring, discount_recurring from save_proposal('{"title":"Fixo","client_name":"Z","discount_type":"valor","discount_value":5000,"discount_target":"recorrente","items":[{"name":"A","recurring":true,"billing_type":"mensal","quantity":1,"unit_price":100}]}');
\echo T25 rascunho excluído pelo dono
select set_config('request.jwt.claim.sub', :'ADMIN', false);
delete from proposals where title='Fixo'; select count(*) from proposals; select count(*) from proposal_items;
\echo T26 dono tenta adulterar totais / status / vínculo pela API
select set_config('request.jwt.claim.sub', :'A', false);
select save_proposal('{"title":"Tamper","client_name":"Z","items":[{"name":"A","recurring":true,"billing_type":"mensal","quantity":1,"unit_price":100}]}') is not null;
update proposals set total_recurring = 1 where title='Tamper';
update proposal_items set line_total = 1;
insert into proposals(title, client_name, status) values ('Direto','Z','aprovada');
insert into proposals(title, client_name, total_once) values ('Direto','Z',1);
update proposals set contract_id = gen_random_uuid() where title='Tamper';
\echo T27 inserção direta permitida só com colunas de conteúdo (status padrão rascunho)
insert into proposals(title, client_name) values ('Direto ok','Z') returning status, total_once;
