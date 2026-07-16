-- Payment details for an expense.
--   payment_method : how it was paid (Cash / UPI / Card / Bank Transfer / Cheque…)
--   invoice_no     : supplier invoice or internal reference number

alter table expenses add column if not exists payment_method text;
alter table expenses add column if not exists invoice_no text;
