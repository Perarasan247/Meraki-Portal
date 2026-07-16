-- Where the batch runs: a physical location for Offline/Hybrid batches, or a
-- meeting link (Zoom/Meet/Teams) for Online ones.
alter table batches add column if not exists venue text;
