-- Store only the customer-facing breakdown on estimates and invoices.
-- Internal reasons and minimum override audit data stay in the Smart Estimate snapshot.
alter table public.estimates add column discount_details jsonb not null default '[]'::jsonb
 check (jsonb_typeof(discount_details) = 'array');
alter table public.invoices add column discount_details jsonb not null default '[]'::jsonb
 check (jsonb_typeof(discount_details) = 'array');

create or replace function public.finalize_smart_estimate(p_draft_id uuid,p_customer_id uuid,p_address_id uuid,p_snapshot jsonb,p_items jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare b uuid; d uuid; e uuid; existing public.smart_estimate_drafts; item jsonb; pos integer:=0; original_address text;
 discount_details jsonb := coalesce(p_snapshot->'discountDetails', '[]'::jsonb);
 discount_total numeric := 0; subtotal numeric := 0; job_minimum numeric; member_role text;
 expected_count integer; override_reason text;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select c.business_id, nullif(btrim(c.service_address),'')  , m.role into b, original_address, member_role from public.customers c join public.business_members m on m.business_id=c.business_id where c.id=p_customer_id and m.user_id=auth.uid() and m.role in ('owner','admin','staff') limit 1;
 if b is null then raise exception 'Customer access denied'; end if;
 if p_snapshot->>'customerId' is distinct from p_customer_id::text or p_snapshot->>'serviceAddressId' is distinct from coalesce(p_address_id::text,'customer-service-address') then raise exception 'Snapshot identity mismatch'; end if;
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
 if p_address_id is null then
  if original_address is null then raise exception 'Customer has no saved service address'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_customer_id::text,1));
  select a.id into p_address_id from public.customer_addresses a
   where a.customer_id=p_customer_id and a.business_id=b and btrim(a.address)=original_address
   order by a.is_primary desc nulls last, a.created_at, a.id limit 1;
  if p_address_id is null then
   insert into public.customer_addresses(business_id,customer_id,label,address,is_primary)
    values(b,p_customer_id,'Customer address',original_address,false) returning id into p_address_id;
  end if;
  p_snapshot:=jsonb_set(p_snapshot,'{serviceAddressId}',to_jsonb(p_address_id::text));
 elsif not exists(select 1 from public.customer_addresses a where a.id=p_address_id and a.customer_id=p_customer_id and a.business_id=b) then
  raise exception 'Customer address mismatch';
 end if;
 -- Validate persisted amounts and authorize any below-minimum pricing in the same transaction.
 if jsonb_typeof(discount_details) is distinct from 'array' or jsonb_array_length(discount_details)>20
    or jsonb_typeof(coalesce(p_snapshot->'discounts','[]'::jsonb)) is distinct from 'array' then
  raise exception 'Invalid discount details';
 end if;
 expected_count:=jsonb_array_length(coalesce(p_snapshot->'discounts','[]'::jsonb));
 if expected_count<>jsonb_array_length(discount_details) then raise exception 'Discount details are incomplete'; end if;
 for item in select value from jsonb_array_elements(discount_details) loop
  if jsonb_typeof(item->'label') is distinct from 'string'
    or length(btrim(item->>'label')) not between 1 and 300
    or jsonb_typeof(item->'amount') is distinct from 'number'
    or (item->>'amount')::numeric<=0 or scale((item->>'amount')::numeric)>2 then
   raise exception 'Invalid discount amount or label';
  end if;
  discount_total:=discount_total+(item->>'amount')::numeric;
 end loop;
 p_snapshot:=p_snapshot-'minimumOverrideBy'-'minimumOverrideAt';
 if discount_total>0 then
  select sum(round((value->>'fixed_price')::numeric,2)) into subtotal from jsonb_array_elements(p_items);
  job_minimum:=round((p_snapshot->'config'->>'minimum')::numeric,2);
  if job_minimum is null or job_minimum<0 or subtotal is null or subtotal-discount_total<=0 then
   raise exception 'Invalid discounted estimate total';
  end if;
  if subtotal-discount_total<job_minimum then
   override_reason:=btrim(p_snapshot->>'minimumOverrideReason');
   if member_role not in ('owner','admin') or coalesce(length(override_reason),0) not between 1 and 250 then
    raise exception 'Only an owner or admin can authorize pricing below the minimum';
   end if;
   p_snapshot:=p_snapshot || jsonb_build_object('minimumOverrideBy',auth.uid(),'minimumOverrideAt',now());
  else
   p_snapshot:=p_snapshot-'minimumOverrideReason';
  end if;
 end if;
 insert into public.estimates(business_id,customer_id,created_by,service_address_id,notes,discount,tax_rate,discount_details)
 values(b,p_customer_id,auth.uid(),p_address_id,coalesce(p_snapshot->>'notes',''),discount_total,0,discount_details) returning id into e;
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
CREATE OR REPLACE FUNCTION public.get_customer_estimate(p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare a record; e record; j jsonb; v_subtotal numeric; v_discount numeric;
begin
 if length(p_token)<>64 or p_token !~ '^[0-9a-f]+$' then return null; end if;
 select * into a from public.estimate_approval_links where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and expires_at>now() limit 1;
 if not found then return null; end if;
 select * into e from public.estimates where id=a.estimate_id and deleted_at is null;
 if not found or e.business_id<>a.business_id then return null; end if;
 select coalesce(jsonb_agg(jsonb_build_object('description',description,'mode',pricing_mode,'squareFeet',square_feet,'rate',rate,'fixedPrice',fixed_price) order by position), '[]'::jsonb),
 coalesce(sum(round(case when pricing_mode='area' then square_feet*rate else fixed_price end,2)),0)
 into j,v_subtotal from public.estimate_items where estimate_id=e.id;
 v_discount=least(v_subtotal,e.discount);
 return jsonb_build_object('id',e.id,'status',e.status,'response',a.response,'expiresAt',a.expires_at,'customerName',(select name from public.customers where id=e.customer_id),'property',coalesce((select address from public.customer_addresses where id=e.service_address_id and customer_id=e.customer_id and business_id=e.business_id),(select address from public.customer_addresses where customer_id=e.customer_id and business_id=e.business_id and is_primary order by created_at limit 1),(select service_address from public.customers where id=e.customer_id and business_id=e.business_id)),'items',j,'notes',e.notes,'subtotal',v_subtotal,'discount',v_discount,'discountDetails',e.discount_details,'taxRate',e.tax_rate,'total',round((v_subtotal-v_discount)*(1+e.tax_rate/100),2));
end $function$

;
revoke all on function public.get_customer_estimate(text) from public;
grant execute on function public.get_customer_estimate(text) to anon, authenticated;

-- Copy the approved estimate's amounts, promotions and line items as one transaction.
create function public.invoice_completed_job(p_job_id uuid)
returns uuid language plpgsql security invoker set search_path='' as $$
declare j public.jobs; e public.estimates; invoice uuid; subtotal numeric;
begin
 if auth.uid() is null then raise exception 'Sign in required'; end if;
 select * into j from public.jobs where id=p_job_id and deleted_at is null;
 if not found or j.status<>'completed' or j.estimate_id is null or
    not private.has_business_role(j.business_id,array['owner','admin','staff']) then
  raise exception 'A completed job with an estimate is required';
 end if;
 select * into e from public.estimates where id=j.estimate_id and business_id=j.business_id
    and customer_id=j.customer_id and deleted_at is null for share;
 if not found then raise exception 'Estimate not found'; end if;
 select sum(case when pricing_mode='area' then square_feet*rate else fixed_price end)
    into subtotal from public.estimate_items
    where estimate_id=e.id and (pricing_mode='fixed' or square_feet>0);
 if subtotal is null then raise exception 'Estimate has no billable services'; end if;
 insert into public.invoices(business_id,customer_id,job_id,created_by,invoice_number,subtotal,discount,tax_rate,discount_details)
 values(j.business_id,j.customer_id,j.id,auth.uid(),'PC-'||upper(left(j.id::text,8)),round(subtotal,2),e.discount,e.tax_rate,e.discount_details)
 returning id into invoice;
 insert into public.invoice_items(invoice_id,description,quantity,unit_price,position)
 select invoice,description,case when pricing_mode='area' then square_feet else 1 end,
    case when pricing_mode='area' then rate else fixed_price end,position
 from public.estimate_items where estimate_id=e.id and (pricing_mode='fixed' or square_feet>0);
 return invoice;
end $$;
revoke all on function public.invoice_completed_job(uuid) from public,anon;
grant execute on function public.invoice_completed_job(uuid) to authenticated;
