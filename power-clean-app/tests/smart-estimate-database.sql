-- Run with database test/admin connection. Every disposable row rolls back.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.business_members where role='owner' limit 1),true);
create temporary table smart_test_context(customer_id uuid,address_id uuid,business_id uuid);
insert into smart_test_context(business_id) select business_id from public.business_members where user_id=auth.uid() and role='owner' limit 1;
with c as (insert into public.customers(business_id,name) select business_id,'DISPOSABLE SMART ESTIMATOR SQL TEST' from smart_test_context returning id) update smart_test_context set customer_id=c.id from c;
with a as (insert into public.customer_addresses(business_id,customer_id,address) select business_id,customer_id,'123 Disposable Test Street' from smart_test_context returning id) update smart_test_context set address_id=a.id from a;
grant select on smart_test_context to authenticated;
set local role authenticated;
do $$
declare ctx record; d uuid; r jsonb; again jsonb; snap jsonb; before_count integer; failed boolean:=false; n integer;
begin
 select * into ctx from smart_test_context;
 snap:=jsonb_build_object('version',1,'customerId',ctx.customer_id,'serviceAddressId',ctx.address_id,'notes','TEST ONLY','areas',jsonb_build_array(jsonb_build_object('name','Disposable area')));
 insert into public.smart_estimate_drafts(business_id,customer_id,created_by,name,snapshot) values(ctx.business_id,ctx.customer_id,auth.uid(),'Disposable area',snap) returning id into d;
 if not exists(select 1 from public.smart_estimate_drafts where id=d and snapshot=snap) then raise exception 'Draft roundtrip failed'; end if;
 update public.smart_estimate_drafts set name='Updated test draft' where id=d;
 r:=public.finalize_smart_estimate(d,ctx.customer_id,ctx.address_id,snap,'[{"description":"Organic growth test","fixed_price":150},{"description":"Clay test","fixed_price":50}]'::jsonb);
 again:=public.finalize_smart_estimate(d,ctx.customer_id,ctx.address_id,snap,'[{"description":"Retry","fixed_price":999}]'::jsonb);
 if r<>again then raise exception 'Retry was not idempotent'; end if;
 if (select sum(fixed_price) from public.estimate_items where estimate_id=(r->>'estimate_id')::uuid)<>200 then raise exception 'Item total mismatch'; end if;
 update public.smart_estimate_drafts set name='Must not update' where id=d;get diagnostics n=row_count;
 if n<>0 then raise exception 'Finalized snapshot was mutable'; end if;
 select count(*) into before_count from public.estimates where customer_id=ctx.customer_id;
 begin
  perform public.finalize_smart_estimate(null,ctx.customer_id,ctx.address_id,snap,'[{"description":"First valid item","fixed_price":150},{"description":"Invalid second item","fixed_price":-1}]'::jsonb);
 exception when others then failed:=true;
 end;
 if not failed or (select count(*) from public.estimates where customer_id=ctx.customer_id)<>before_count then raise exception 'Transaction rollback failed'; end if;
 failed:=false;
 begin
  perform public.finalize_smart_estimate(null,ctx.customer_id,gen_random_uuid(),snap,'[{"description":"Test","fixed_price":50}]'::jsonb);
 exception when others then failed:=true;
 end;
 if not failed then raise exception 'Address ownership guard failed'; end if;
end $$;
-- A signed-in identity with no membership cannot see snapshots.
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
do $$ begin if exists(select 1 from public.smart_estimate_drafts) then raise exception 'Cross-business isolation failed'; end if;end $$;
reset role;
select 'PASS: authenticated draft roundtrip, finalization, retries, immutable snapshots, rollback, address validation, business isolation; all rows rolled back' as test_result;
rollback;
