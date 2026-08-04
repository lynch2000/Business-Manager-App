-- Expenses: receipts/dockets for things already paid for (fuel, parts,
-- hardware store runs), as distinct from `creditors` (unpaid supplier bills).
-- Each expense can have a photo of the receipt attached, stored privately.

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  vendor text not null default '',
  category text not null default 'Other' check (category in (
    'Materials & Parts', 'Fuel & Travel', 'Tools & Equipment',
    'Subcontractors', 'Vehicle', 'Insurance', 'Office & Admin', 'Training', 'Other'
  )),
  amount numeric(12,2) not null default 0,
  vat_amount numeric(12,2),
  expense_date date not null default current_date,
  receipt_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on expenses(user_id);
create index if not exists expenses_expense_date_idx on expenses(expense_date);

drop trigger if exists set_updated_at on expenses;
create trigger set_updated_at before update on expenses for each row execute function set_updated_at();

alter table expenses enable row level security;

create policy "owner full access" on expenses for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Receipt photos are financial documents, so this bucket stays private
-- (unlike the public `logos` bucket) — access is via short-lived signed URLs.
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy "owner manage own receipts"
  on storage.objects for all
  using (bucket_id = 'receipts' and owner = auth.uid())
  with check (bucket_id = 'receipts' and owner = auth.uid());
