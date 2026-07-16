-- Fix: Supabase/PostgREST reserves the `role` JWT claim to choose the Postgres
-- role for each request (it must stay `authenticated`). The earlier hook
-- overwrote `role` with the app role, which broke the scoped data client with
-- 'role "super_admin" does not exist'. Store the app role in a custom
-- `user_role` claim instead, and leave `role` untouched.

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
    -- Staff / admin / trainer
    claims := jsonb_set(claims, '{user_role}', to_jsonb(p_role));
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
      claims := jsonb_set(claims, '{user_role}', to_jsonb('student'::text));
      if s_domain is not null then
        claims := jsonb_set(claims, '{domain_id}', to_jsonb(s_domain));
      end if;
    else
      claims := jsonb_set(claims, '{user_role}', to_jsonb('staff'::text));
    end if;
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Read the app role from the new custom claim (was 'role').
create or replace function public.jwt_role() returns text
language sql stable as $$
  select coalesce(auth.jwt()->>'user_role', '')
$$;
