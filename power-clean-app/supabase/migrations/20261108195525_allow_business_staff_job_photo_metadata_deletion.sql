create policy job_photos_delete on public.job_photos for delete to authenticated using (private.has_business_role(business_id, array['owner','admin','staff']));
