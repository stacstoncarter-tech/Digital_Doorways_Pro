-- Generated totals are recomputed after BEFORE triggers; their inputs remain protected.
create or replace function private.guard_record_deletion() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by then
  if auth.uid() is null or not private.has_business_role(old.business_id,array['owner','admin']) then
   raise exception 'Only an owner or admin can delete or restore records' using errcode='42501';
  end if;
  if (to_jsonb(new)-array['deleted_at','deleted_by','signing_token_hash','signing_expires_at','total']) is distinct from
     (to_jsonb(old)-array['deleted_at','deleted_by','signing_token_hash','signing_expires_at','total']) then
   raise exception 'Deletion cannot change record contents';
  end if;
 elsif old.deleted_at is not null then
  raise exception 'Restore this record from Trash before changing it' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.guard_record_deletion() from public,anon,authenticated;

