-- Add missing due_date column for invoices + backfill
alter table public.invoices
add column if not exists due_date timestamptz;

update public.invoices
set due_date = coalesce(due_date, created_at + interval '30 days')
where due_date is null;
