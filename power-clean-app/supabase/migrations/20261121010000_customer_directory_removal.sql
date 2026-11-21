-- Directory removal preserves signed documents, payments and storage ownership.
create table private.removed_customers (
  customer_id uuid primary key references public.customers(id) on delete cascade,
  removed_by uuid not null,
  removed_at timestamptz not null default now()
);
revoke all on private.removed_customers from public, anon, authenticated;
create function private.customer_is_active(p_customer uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select not exists(select 1 from private.removed_customers where customer_id=p_customer)
$$;
revoke all on function private.customer_is_active(uuid) from public;
grant execute on function private.customer_is_active(uuid) to authenticated;
create view public.active_customers with (security_invoker=true) as
select * from public.customers where private.customer_is_active(id);
revoke all on public.active_customers from public,anon,authenticated;
grant select on public.active_customers to authenticated;

create function public.remove_customer_from_directory(p_customer uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.customers c where c.id=p_customer
    and private.has_business_role(c.business_id,array['owner','admin'])) then
    raise exception 'Customer unavailable or permission denied';
  end if;
  insert into private.removed_customers(customer_id,removed_by)
  values(p_customer,auth.uid()) on conflict do nothing;
end;
$$;
revoke all on function public.remove_customer_from_directory(uuid) from public;
grant execute on function public.remove_customer_from_directory(uuid) to authenticated;
