-- Meraki Portal — Student accounts + internship domains + student portal support
--
-- Adds:
--   * domains            — per-branch internship tracks (AI, ML, Frontend, ...)
--   * curricula.domain_id — tags course content with a domain so students only
--                           ever see content for THEIR domain
--   * students.*         — real email + username login, domain, account expiry,
--                           is_active. Students are created directly by the
--                           super admin (no self-signup).
--
-- Security model (important):
--   The custom access token hook stamps role='student' + domain_id onto a
--   student's JWT but DELIBERATELY does NOT stamp branch_id. The existing
--   `*_branch_all` RLS policies are `for all using (branch_id = jwt_branch_id())`,
--   so if a student carried a branch_id claim they could write enquiries,
--   expenses, curricula, etc. Withholding the branch claim means a student's
--   token matches no business-table policy. All student reads/writes go through
--   the FastAPI student portal (service client), which is the enforcement
--   boundary: it scopes to the student's own branch+domain and strips quiz
--   answer keys before returning questions.

-- ---------------------------------------------------------------------------
-- domains — internship tracks, scoped per branch
-- ---------------------------------------------------------------------------
create table domains (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references branches(id) on delete cascade,
  key text not null,              -- machine key, e.g. 'ai'
  label text not null,            -- display label, e.g. 'AI Internship'
  created_at timestamptz not null default now(),
  unique (branch_id, key)
);
create index on domains (branch_id);

-- Tag course content with a domain (nullable: legacy curricula stay ungated
-- and simply won't appear in any student's domain view until assigned).
alter table curricula add column domain_id uuid references domains(id);
create index on curricula (domain_id);

-- ---------------------------------------------------------------------------
-- students — extend the (previously deferred) table into a real login
-- ---------------------------------------------------------------------------
alter table students
  add column username text,
  add column domain_id uuid references domains(id),
  add column account_expiry timestamptz,          -- null = never expires
  add column is_active boolean not null default true;

-- Students provide a real email at creation; email + username both usable as
-- login identifiers, so both must be unique.
update students set email = coalesce(email, id::text || '@placeholder.local')
  where email is null;
alter table students alter column email set not null;
alter table students add constraint students_email_unique unique (email);
alter table students add constraint students_username_unique unique (username);

-- ---------------------------------------------------------------------------
-- Custom access token hook — now resolves BOTH staff (profiles) and students.
-- Students get role='student' + domain_id, but intentionally no branch_id.
-- ---------------------------------------------------------------------------
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  uid uuid := (event->>'user_id')::uuid;
  p_role text;
  p_branch text;
  s_branch text;
  s_domain text;
begin
  claims := coalesce(event->'claims', '{}'::jsonb);

  select role::text, branch_id::text
    into p_role, p_branch
    from public.profiles
    where id = uid;

  if p_role is not null then
    -- Staff / admin member
    claims := jsonb_set(claims, '{role}', to_jsonb(p_role));
    if p_branch is not null then
      claims := jsonb_set(claims, '{branch_id}', to_jsonb(p_branch));
    end if;
  else
    -- Maybe a student
    select branch_id::text, domain_id::text
      into s_branch, s_domain
      from public.students
      where id = uid;

    if s_branch is not null then
      claims := jsonb_set(claims, '{role}', to_jsonb('student'::text));
      -- NOTE: no branch_id claim for students (see security model above)
      if s_domain is not null then
        claims := jsonb_set(claims, '{domain_id}', to_jsonb(s_domain));
      end if;
    else
      claims := jsonb_set(claims, '{role}', to_jsonb('staff'::text));
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

grant execute on function public.custom_access_token_hook to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook from authenticated, anon, public;

-- The hook now also reads students at token-mint time (runs as
-- supabase_auth_admin), so grant it read access — otherwise student logins get
-- role='staff' and land in the wrong portal.
grant select on table public.students to supabase_auth_admin;
create policy students_auth_admin_read on public.students
  for select to supabase_auth_admin using (true);

-- Helper (used only where domain-level RLS is desired; the portal API is the
-- primary boundary).
create or replace function public.jwt_domain_id() returns uuid
language sql stable as $$
  select nullif(auth.jwt()->>'domain_id', '')::uuid
$$;

-- ---------------------------------------------------------------------------
-- RLS for domains
-- ---------------------------------------------------------------------------
alter table domains enable row level security;

create policy domains_super_admin_all on domains
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy domains_branch_read on domains
  for select using (branch_id = public.jwt_branch_id());

-- ---------------------------------------------------------------------------
-- Seed default domains for any existing branches (idempotent)
-- ---------------------------------------------------------------------------
insert into domains (branch_id, key, label)
select b.id, d.key, d.label
from branches b
cross join (values
  ('ai', 'AI Internship'),
  ('ml', 'ML Internship'),
  ('frontend', 'Frontend Internship'),
  ('backend', 'Backend Internship')
) as d(key, label)
on conflict (branch_id, key) do nothing;
