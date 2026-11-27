create table public.estimate_photo_copies (
  customer_id uuid not null references public.customers(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check(name ~ '^(before|after|condition)-[0-9a-f-]{36}\.jpg$'),
  jpeg text not null check(length(jpeg) between 16 and 120000 and jpeg ~ '^/9j/[A-Za-z0-9+/=]+$'),
  primary key(customer_id,name)
);
alter table public.estimate_photo_copies enable row level security;
revoke all on public.estimate_photo_copies from anon,authenticated;
grant select,insert on public.estimate_photo_copies to authenticated;
create policy estimate_photo_read on public.estimate_photo_copies for select to authenticated
using(private.is_business_member(business_id));
create policy estimate_photo_add on public.estimate_photo_copies for insert to authenticated
with check(private.has_business_role(business_id,array['owner','admin','staff'])
and exists(select 1 from public.customers c where c.id=customer_id and c.business_id=estimate_photo_copies.business_id));
-- Read individual images so even a large estimate can load photos lazily.
create function public.read_estimate_photo(p_token text,p_area integer,p_photo integer)
returns text language sql stable security definer set search_path='' as $$
 select p.jpeg from public.estimate_approval_links l
 join public.estimates e on e.id=l.estimate_id and e.business_id=l.business_id and e.deleted_at is null
 join public.smart_estimate_drafts d on d.estimate_id=e.id and d.customer_id=e.customer_id and d.business_id=e.business_id
 join public.estimate_photo_copies p on p.customer_id=e.customer_id and p.business_id=e.business_id
 and p.name=d.snapshot->'areas'->p_area->'photos'->>p_photo
 where p_token ~ '^[0-9a-f]{64}$' and p_area between 0 and 19 and p_photo between 0 and 2
 and l.token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and l.expires_at>now()
$$;
create function public.estimate_photo_index(p_token text) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('area',part.ordinality-1,'name',part.value->>'name',
 'count',jsonb_array_length(part.value->'photos')) order by part.ordinality),'[]'::jsonb)
 from public.estimate_approval_links l
 join public.estimates e on e.id=l.estimate_id and e.business_id=l.business_id and e.deleted_at is null
 join public.smart_estimate_drafts d on d.estimate_id=e.id and d.business_id=e.business_id and d.customer_id=e.customer_id
 cross join lateral jsonb_array_elements(d.snapshot->'areas') with ordinality as part
 where p_token ~ '^[0-9a-f]{64}$' and l.token_hash=encode(extensions.digest(p_token,'sha256'),'hex')
 and l.expires_at>now() and jsonb_array_length(part.value->'photos')>0
$$;
revoke all on function public.read_estimate_photo(text,integer,integer),public.estimate_photo_index(text) from public;
grant execute on function public.read_estimate_photo(text,integer,integer),public.estimate_photo_index(text) to anon,authenticated;
