-- Add optional email to enquiries so leads can be captured with an email id.
alter table enquiries add column if not exists email text;
