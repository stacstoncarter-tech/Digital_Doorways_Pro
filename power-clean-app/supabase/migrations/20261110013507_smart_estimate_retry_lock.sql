-- Serialize finalization retries without requiring UPDATE access on finalized rows.
create or replace function public.finalize_smart_estimate(p_draft_id uuid,p_customer_id uuid,p_address_id uuid,p_snapshot jsonb,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b uuid; d uuid; e uuid; existing public.smart_estimate_drafts; item jsonb; pos integer:=0;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select c.business_id into b from public.customers c join public.business_members m on m.business_id=c.business_id where c.id=p_customer_id and m.user_id=auth.uid() and m.role in ('owner','admin','staff') limit 1;
 if b is null then raise exception 'Customer access denied'; end if;
 if not exists(select 1 from public.customer_addresses a where a.id=p_address_id and a.customer_id=p_customer_id and a.business_id=b) then raise exception 'Customer address mismatch'; end if;
 if p_snapshot->>'customerId' is distinct from p_customer_id::text or p_snapshot->>'serviceAddressId' is distinct from p_address_id::text then raise exception 'Snapshot identity mismatch'; end if;
 if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 120 then raise exception 'Invalid items'; end if;
 if p_draft_id is not null then
  perform pg_advisory_xact_lock(hashtextextended(p_draft_id::text,0));
  select * into existing from public.smart_estimate_drafts where id=p_draft_id and business_id=b;
  if not found then raise exception 'Draft access denied'; end if;
  if existing.customer_id<>p_customer_id then raise exception 'Draft customer mismatch'; end if;
  if existing.estimate_id is not null then return jsonb_build_object('draft_id',existing.id,'estimate_id',existing.estimate_id); end if;
  d:=existing.id;
 else
  insert into public.smart_estimate_drafts(business_id,customer_id,created_by,name,snapshot) values(b,p_customer_id,auth.uid(),p_snapshot->'areas'->0->>'name',p_snapshot) returning id into d;
 end if;
 insert into public.estimates(business_id,customer_id,created_by,service_address_id,notes,discount,tax_rate) values(b,p_customer_id,auth.uid(),p_address_id,coalesce(p_snapshot->>'notes',''),0,0) returning id into e;
 for item in select value from jsonb_array_elements(p_items) loop
  if length(coalesce(item->>'description','')) not between 1 and 2000 or (item->>'fixed_price')::numeric<0 or (item->>'fixed_price')::numeric>10000000 or item->>'fixed_price' is null then raise exception 'Invalid line'; end if;
  insert into public.estimate_items(estimate_id,description,pricing_mode,fixed_price,position) values(e,item->>'description','fixed',(item->>'fixed_price')::numeric,pos);
  pos:=pos+1;
 end loop;
 update public.smart_estimate_drafts set snapshot=p_snapshot,name=p_snapshot->'areas'->0->>'name',estimate_id=e,updated_at=now() where id=d;
 return jsonb_build_object('draft_id',d,'estimate_id',e);
end $$;
revoke all on function public.finalize_smart_estimate(uuid,uuid,uuid,jsonb,jsonb) from public,anon;
grant execute on function public.finalize_smart_estimate(uuid,uuid,uuid,jsonb,jsonb) to authenticated;
