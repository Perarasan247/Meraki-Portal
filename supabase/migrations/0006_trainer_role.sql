-- Add the 'trainer' role: branch-scoped staff with limited module access.
-- (Enforced at the app layer via each user's `modules` list; branch scoping is
-- handled by the existing branch RLS policies + the branch_id JWT claim.)
alter type user_role add value if not exists 'trainer';
