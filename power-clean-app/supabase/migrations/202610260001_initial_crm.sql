-- Power Clean: multi-tenant CRM foundation
create extension if not exists pgcrypto;
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 160),
  created_at timestamptz not null default now()
);
create table public.business_members (
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','staff','viewer')),
  created_at timestamptz not null default now(),
  primary key (business_id,user_id)
);
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  email text check (email is null or char_length(email) <= 200),
  phone text check (phone is null or char_length(phone) <= 40),
  service_address text check (service_address is null or char_length(service_address) <= 240),
  created_at timestamptz not null default now()
);
create index customers_business_created_idx on public.customers(business_id,created_at desc);
create index business_members_user_idx on public.business_members(user_id,business_id);
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.customers enable row level security;
-- SECURITY DEFINER functions avoid recursive member policies; pin search_path.
create function public.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=(select auth.uid()));
$$;
create function public.has_business_role(p_business_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=(select auth.uid()) and m.role=any(p_roles));
$$;
revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.has_business_role(uuid,text[]) from public;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid,text[]) to authenticated;
create policy businesses_select on public.businesses for select to authenticated using (public.is_business_member(id));
create policy members_select on public.business_members for select to authenticated using (public.is_business_member(business_id));
create policy customers_select on public.customers for select to authenticated using (public.is_business_member(business_id));
create policy customers_insert on public.customers for insert to authenticated with check (public.has_business_role(business_id,array['owner','admin','staff']));
create policy customers_update on public.customers for update to authenticated using (public.has_business_role(business_id,array['owner','admin','staff'])) with check (public.has_business_role(business_id,array['owner','admin','staff']));
create policy customers_delete on public.customers for delete to authenticated using (public.has_business_role(business_id,array['owner','admin']));
-- Bootstrap the first business and owner through the Supabase SQL editor, never from client code.
