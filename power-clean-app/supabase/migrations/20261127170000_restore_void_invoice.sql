alter table public.invoices
  add column if not exists status_before_void text
  check (status_before_void in ('draft', 'sent', 'partially_paid', 'paid'));

create or replace function public.change_invoice_void_status(p_invoice_id uuid, p_restore boolean)
returns text
language plpgsql
set search_path = ''
as $function$
declare
  inv public.invoices%rowtype;
  paid numeric;
  next_status text;
begin
  select * into inv from public.invoices where id = p_invoice_id and deleted_at is null for update;
  if not found or not private.has_business_role(inv.business_id, array['owner','admin','staff']) then
    raise exception 'Invoice not found or access denied';
  end if;

  if p_restore then
    if inv.status <> 'void' then raise exception 'Invoice is not void'; end if;
    if inv.status_before_void is null then
      raise exception 'Previous status unavailable for this invoice';
    end if;
    select coalesce(sum(amount), 0) into paid from public.invoice_payments where invoice_id = inv.id;
    next_status := case
      when paid >= inv.total and paid > 0 then 'paid'
      when paid > 0 then 'partially_paid'
      else inv.status_before_void
    end;
    update public.invoices set status = next_status, status_before_void = null, updated_at = now()
      where id = inv.id;
  else
    if inv.status not in ('draft','sent') then raise exception 'Invoice cannot be voided'; end if;
    next_status := 'void';
    update public.invoices set status = 'void', status_before_void = inv.status, updated_at = now()
      where id = inv.id;
  end if;

  insert into public.customer_activity
    (business_id, customer_id, created_by, activity_type, summary)
  values
    (inv.business_id, inv.customer_id, auth.uid(), 'other',
      'Invoice ' || inv.invoice_number || case when p_restore then
        ' restored to ' || replace(next_status, '_', ' ') || '.'
      else ' voided from ' || replace(inv.status, '_', ' ') || '.' end);
  return next_status;
end;
$function$;

revoke all on function public.change_invoice_void_status(uuid, boolean) from public, anon;
grant execute on function public.change_invoice_void_status(uuid, boolean) to authenticated;
