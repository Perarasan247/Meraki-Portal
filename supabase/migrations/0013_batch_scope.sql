-- Batch scope: what the batch is actually run as.
-- Defaults to 'Internship' so existing rows stay valid (matches enquiries.enquiry_type).
alter table batches add column if not exists scope text not null default 'Internship';
