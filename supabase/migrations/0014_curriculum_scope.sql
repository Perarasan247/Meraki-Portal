-- Curriculum scope: Training / Internship / Project.
-- Mirrors batches.scope (0013) so a batch and the curriculum it runs speak the
-- same vocabulary. Defaults to 'Internship' — every curriculum that existed
-- before this column was an internship.
alter table curricula add column if not exists scope text not null default 'Internship';
