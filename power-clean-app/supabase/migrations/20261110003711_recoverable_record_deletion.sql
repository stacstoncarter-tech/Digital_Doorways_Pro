-- Recoverable record deletion. Signed content, payments and storage objects are never removed.
alter table public.sales_leads add column deleted_at timestamptz, add column deleted_by uuid;
alter table public.jobs add column deleted_at timestamptz, add column deleted_by uuid;
alter table public.invoices add column deleted_at timestamptz, add column deleted_by uuid;
alter table public.estimates add column deleted_at timestamptz, add column deleted_by uuid;
alter table public.customer_agreements add column deleted_at timestamptz, add column deleted_by uuid;

create table public.record_deletion_events (
 id uuid primary key default gen_random_uuid(), business_id uuid not null references public.businesses(id),
 record_kind text not null, record_id uuid not null, actor_id uuid not null, action text not null check(action in ('deleted','restored')),
 created_at timestamptz not null default now()
);
alter table public.record_deletion_events enable row level security;
revoke all on public.record_deletion_events from anon, authenticated;
grant select on public.record_deletion_events to authenticated;
create policy deletion_history_owner_admin on public.record_deletion_events for select to authenticated
 using (private.has_business_role(business_id,array['owner','admin']));

create or replace function private.guard_record_deletion() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.deleted_at is distinct from old.deleted_at or new.deleted_by is distinct from old.deleted_by then
  if auth.uid() is null or not private.has_business_role(old.business_id,array['owner','admin']) then
   raise exception 'Only an owner or admin can delete or restore records' using errcode='42501';
  end if;
  if (to_jsonb(new)-array['deleted_at','deleted_by','signing_token_hash','signing_expires_at']) is distinct from
     (to_jsonb(old)-array['deleted_at','deleted_by','signing_token_hash','signing_expires_at']) then
   raise exception 'Deletion cannot change record contents';
  end if;
 elsif old.deleted_at is not null then
  raise exception 'Restore this record from Trash before changing it' using errcode='42501';
 end if;
 return new;
end $$;
revoke all on function private.guard_record_deletion() from public,anon,authenticated;

-- Existing draft protection still prevents edits beyond title/wording, except deletion metadata.
create or replace function private.guard_agreement_draft_edit() returns trigger
language plpgsql set search_path='' as $$
begin
 if old.status='draft' and new.status='draft' then
  if new.deleted_at is distinct from old.deleted_at and private.has_business_role(old.business_id,array['owner','admin']) then
   if (to_jsonb(new)-array['deleted_at','deleted_by','signing_token_hash','signing_expires_at']) is distinct from (to_jsonb(old)-array['deleted_at','deleted_by','signing_token_hash','signing_expires_at']) then raise exception 'Deletion cannot change draft contents'; end if;
  elsif (to_jsonb(new)-array['title','body']) is distinct from (to_jsonb(old)-array['title','body']) then
   raise exception 'Only draft title and wording may be edited' using errcode='42501';
  end if;
 end if;
 return new;
end $$;

do $$ declare t text; begin
 foreach t in array array['sales_leads','jobs','invoices','estimates','customer_agreements'] loop
  execute format('create trigger protect_deleted_record before update on public.%I for each row execute function private.guard_record_deletion()',t);
  execute format('create index %I on public.%I (business_id,deleted_at)',t||'_deleted_records_idx',t);
 end loop;
end $$;

-- This deliberately narrow privileged operation changes deletion metadata only, including on
-- immutable signed records. It never grants callers general UPDATE access to signed content.
create function private.set_records_deleted(p_kind text,p_ids uuid[],p_deleted boolean) returns integer
language plpgsql security definer set search_path='' as $$
declare t text; r record; affected integer:=0; expected integer;
begin
 if auth.uid() is null then raise exception 'Sign in again' using errcode='42501'; end if;
 t:=case p_kind when 'lead' then 'sales_leads' when 'job' then 'jobs' when 'invoice' then 'invoices' when 'estimate' then 'estimates' when 'agreement' then 'customer_agreements' end;
 if t is null or p_deleted is null or p_ids is null or cardinality(p_ids)<1 or cardinality(p_ids)>100 or array_position(p_ids,null) is not null then raise exception 'Invalid records'; end if;
 select count(distinct x) into expected from unnest(p_ids) x;
 for r in execute format('select id,business_id,deleted_at from public.%I where id=any($1) order by id for update',t) using p_ids loop
  if not private.has_business_role(r.business_id,array['owner','admin']) then raise exception 'Record not found or access denied' using errcode='42501'; end if;
  if (p_deleted and r.deleted_at is not null) or (not p_deleted and r.deleted_at is null) then raise exception 'The record changed. Refresh and try again'; end if;
  execute format('update public.%I set deleted_at=$1,deleted_by=$2%s where id=$3',t,case when p_deleted and p_kind='agreement' then ',signing_token_hash=null,signing_expires_at=null' else '' end)
   using case when p_deleted then now() else null end,case when p_deleted then auth.uid() else null end,r.id;
  if p_deleted and p_kind='estimate' then
   update public.estimate_approval_links set expires_at=least(expires_at,now()) where estimate_id=r.id;
  end if;
  insert into public.record_deletion_events(business_id,record_kind,record_id,actor_id,action)
   values(r.business_id,p_kind,r.id,auth.uid(),case when p_deleted then 'deleted' else 'restored' end);
  affected:=affected+1;
 end loop;
 if affected<>expected then raise exception 'One or more records were not found' using errcode='42501'; end if;
 return affected;
end $$;
revoke all on function private.set_records_deleted(text,uuid[],boolean) from public,anon;
grant execute on function private.set_records_deleted(text,uuid[],boolean) to authenticated;
create function public.set_records_deleted(p_kind text,p_ids uuid[],p_deleted boolean) returns integer
language sql security invoker set search_path='' as $$ select private.set_records_deleted(p_kind,p_ids,p_deleted) $$;
revoke all on function public.set_records_deleted(text,uuid[],boolean) from public,anon;
grant execute on function public.set_records_deleted(text,uuid[],boolean) to authenticated;
create function public.set_record_deleted(p_kind text,p_id uuid,p_deleted boolean) returns integer
language sql security invoker set search_path='' as $$ select private.set_records_deleted(p_kind,array[p_id],p_deleted) $$;
revoke all on function public.set_record_deleted(text,uuid,boolean) from public,anon;
grant execute on function public.set_record_deleted(text,uuid,boolean) to authenticated;
