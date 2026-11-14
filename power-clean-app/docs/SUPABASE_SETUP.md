# Supabase setup (manual account configuration required)

1. Create a Supabase project in your own account. Store its URL and public anon/publishable key in local `.env.local` and deployment environment settings, never in Git.
2. Run `supabase/migrations/202610260001_initial_crm.sql` in the Supabase SQL editor or via your controlled migration workflow.
3. In Supabase Authentication, disable public signups and create the first owner user using the admin dashboard. Confirm their email before signing in.
4. In the SQL editor, replace the UUID placeholder below with the actual authenticated user's UUID (not their email):
```sql
begin;
insert into public.businesses(name) values ('Power Clean');
-- Replace both UUID and business ID by looking up the new business row.
insert into public.business_members(business_id,user_id,role)
select id, 'REPLACE_WITH_OWNER_AUTH_USER_UUID'::uuid, 'owner'
from public.businesses where name='Power Clean'
order by created_at desc limit 1;
commit;
```
5. Deploy using a private staging environment and configure the same public environment variables there. Supabase auth session cookies require HTTPS in production.
6. Validate RLS with two separate test users and businesses before real customer data. Test that viewer cannot insert, staff cannot delete, and members cannot read another business's customers.

No live Supabase project, authentication account, or deployed environment has been provisioned by these repository files. Do not enter real customer data until configuration, authorization tests, and deployment checks are complete.
