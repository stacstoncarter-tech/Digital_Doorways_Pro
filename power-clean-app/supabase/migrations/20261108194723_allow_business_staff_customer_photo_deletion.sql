create policy power_clean_photos_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'power-clean-customer-photos'
  and exists (
    select 1
    from public.business_members m
    join public.customers c on c.business_id = m.business_id
    where m.user_id = (select auth.uid())
      and m.role in ('owner','admin','staff')
      and m.business_id::text = split_part(storage.objects.name, '/', 1)
      and c.id::text = split_part(storage.objects.name, '/', 2)
  )
);
