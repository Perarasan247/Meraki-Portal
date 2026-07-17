-- Whether the lead is enquiring about a Training course or an Internship.
-- Existing rows default to 'Internship' (the core offering).

alter table enquiries add column if not exists enquiry_type text not null default 'Internship';
