-- Move authorization helpers out of exposed public schema.
create schema if not exists private;
create function private.is_business_member(p_business_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=(select auth.uid()));
$$;
create function private.has_business_role(p_business_id uuid,p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
 select exists (select 1 from public.business_members m where m.business_id=p_business_id and m.user_id=(select auth.uid()) and m.role=any(p_roles));
$$;
revoke all on schema private from public,anon;
grant usage on schema private to authenticated;
revoke all on function private.is_business_member(uuid) from public,anon;
revoke all on function private.has_business_role(uuid,text[]) from public,anon;
grant execute on function private.is_business_member(uuid) to authenticated;
grant execute on function private.has_business_role(uuid,text[]) to authenticated;
drop policy businesses_select on public.businesses;
create policy businesses_select on public.businesses for select to authenticated using (private.is_business_member(id));
drop policy members_select on public.business_members;
create policy members_select on public.business_members for select to authenticated using (private.is_business_member(business_id));
drop policy customers_select on public.customers;
create policy customers_select on public.customers for select to authenticated using (private.is_business_member(business_id));
drop policy customers_insert on public.customers;
create policy customers_insert on public.customers for insert to authenticated with check (private.has_business_role(business_id,array['owner','admin','staff']));
drop policy customers_update on public.customers;
create policy customers_update on public.customers for update to authenticated using (private.has_business_role(business_id,array['owner','admin','staff'])) with check (private.has_business_role(business_id,array['owner','admin','staff']));
drop policy customers_delete on public.customers;
create policy customers_delete on public.customers for delete to authenticated using (private.has_business_role(business_id,array['owner','admin']));
drop function public.is_business_member(uuid);
drop function public.has_business_role(uuid,text[]);
