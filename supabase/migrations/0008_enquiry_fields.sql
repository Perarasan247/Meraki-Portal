-- Additional enquiry capture fields.
--   college      : the student's college / institution
--   campaign_id  : which marketing campaign (lead source) the enquiry came from
--                  (null = direct / walk-in). Set null if the campaign is deleted.

alter table enquiries add column if not exists college text;
alter table enquiries add column if not exists campaign_id uuid references campaigns(id) on delete set null;

create index if not exists idx_enquiries_campaign_id on enquiries(campaign_id);
