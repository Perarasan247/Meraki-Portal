-- Meraki Portal — RLS policies + JWT custom claims
-- Strategy: role + branch_id are stamped onto the JWT via a custom access
-- token hook (Supabase Auth Hook), read from profiles at token-mint time.
-- Postgres policies below trust auth.jwt() -> 'role' / 'branch_id'.

-- ---------------------------------------------------------------------------
-- Custom access token hook: injects role + branch_id claims
-- Wire this up in Supabase Dashboard > Auth > Hooks (Custom Access Token)
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role text;
  user_branch_id text;
begin
  select role::text, branch_id::text
    into user_role, user_branch_id
    from public.profiles
    where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(user_role, 'staff')));
  if user_branch_id is not null then
    claims := jsonb_set(claims, '{branch_id}', to_jsonb(user_branch_id));
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- ---------------------------------------------------------------------------
-- Helper functions for policies
-- ---------------------------------------------------------------------------
create or replace function public.jwt_role() returns text
language sql stable as $$
  select coalesce(auth.jwt()->>'role', '')
$$;

create or replace function public.jwt_branch_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt()->>'branch_id', '')::uuid
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable as $$
  select public.jwt_role() = 'super_admin'
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS everywhere
-- ---------------------------------------------------------------------------
alter table branches enable row level security;
alter table profiles enable row level security;
alter table enquiries enable row level security;
alter table enrollments enable row level security;
alter table batches enable row level security;
alter table curricula enable row level security;
alter table batch_execution enable row level security;
alter table expenses enable row level security;
alter table campaigns enable row level security;
alter table email_campaigns enable row level security;
alter table whatsapp_blasts enable row level security;
alter table lead_sources enable row level security;
alter table audit_log enable row level security;

-- ---------------------------------------------------------------------------
-- branches: super_admin full access; branch users can read only their own row
-- ---------------------------------------------------------------------------
create policy branches_super_admin_all on branches
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy branches_self_read on branches
  for select using (id = public.jwt_branch_id());

-- ---------------------------------------------------------------------------
-- profiles: super_admin sees/manages all; users can read/update their own row;
-- branch_admin can read profiles within their branch
-- ---------------------------------------------------------------------------
create policy profiles_super_admin_all on profiles
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy profiles_self_read on profiles
  for select using (id = auth.uid());

create policy profiles_self_update on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_branch_admin_read on profiles
  for select using (
    public.jwt_role() = 'branch_admin' and branch_id = public.jwt_branch_id()
  );

-- The custom access token hook runs as supabase_auth_admin and reads profiles
-- when minting each JWT. Without this grant + policy, RLS blocks it and the
-- role / branch_id claims come back empty (everyone looks like plain staff).
grant select on table public.profiles to supabase_auth_admin;
create policy profiles_auth_admin_read on profiles
  for select to supabase_auth_admin using (true);

-- ---------------------------------------------------------------------------
-- Generic branch-scoped policy template, applied per table.
-- Pattern: super_admin bypasses; everyone else restricted to own branch_id.
-- ---------------------------------------------------------------------------

-- enquiries
create policy enquiries_super_admin_all on enquiries
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy enquiries_branch_all on enquiries
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- enrollments
create policy enrollments_super_admin_all on enrollments
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy enrollments_branch_all on enrollments
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- batches
create policy batches_super_admin_all on batches
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy batches_branch_all on batches
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- curricula
create policy curricula_super_admin_all on curricula
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy curricula_branch_all on curricula
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- batch_execution
create policy batch_execution_super_admin_all on batch_execution
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy batch_execution_branch_all on batch_execution
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- expenses
create policy expenses_super_admin_all on expenses
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy expenses_branch_all on expenses
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- campaigns
create policy campaigns_super_admin_all on campaigns
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy campaigns_branch_all on campaigns
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- email_campaigns
create policy email_campaigns_super_admin_all on email_campaigns
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy email_campaigns_branch_all on email_campaigns
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- whatsapp_blasts
create policy whatsapp_blasts_super_admin_all on whatsapp_blasts
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy whatsapp_blasts_branch_all on whatsapp_blasts
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- lead_sources
create policy lead_sources_super_admin_all on lead_sources
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy lead_sources_branch_all on lead_sources
  for all using (branch_id = public.jwt_branch_id())
  with check (branch_id = public.jwt_branch_id());

-- audit_log: append-only from app; read scoped by branch, super_admin sees all
create policy audit_log_super_admin_all on audit_log
  for all using (public.is_super_admin()) with check (public.is_super_admin());
create policy audit_log_branch_read on audit_log
  for select using (branch_id = public.jwt_branch_id());
create policy audit_log_branch_insert on audit_log
  for insert with check (branch_id = public.jwt_branch_id());

-- ---------------------------------------------------------------------------
-- keep profiles.updated last_login in sync on login (called from FastAPI
-- after successful auth, using service role — not via RLS-limited client)
-- ---------------------------------------------------------------------------
