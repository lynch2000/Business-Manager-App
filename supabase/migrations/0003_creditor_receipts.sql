-- Lets a scanned docket be saved as a creditor (something you owe) rather
-- than an expense (something already paid), while still keeping the photo.
alter table creditors add column if not exists receipt_path text;
