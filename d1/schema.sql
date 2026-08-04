-- HVAC Business Manager — D1 (SQLite) schema.
--
-- Unlike the earlier Supabase/Postgres version, there is no database-level
-- row-level security here: D1 has no equivalent of Postgres RLS, so every
-- table is scoped by user_id in application code (functions/_lib/tables.ts)
-- rather than by database policy. IDs are app-generated UUIDs (text) since
-- SQLite has no native uuid type/generator.

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  created_at text not null
);

create table if not exists business_settings (
  id text primary key,
  user_id text not null unique references users(id) on delete cascade,
  business_name text not null default '',
  owner_name text,
  address text,
  phone text,
  email text,
  vat_number text,
  iban text,
  bic text,
  bank_name text,
  account_name text,
  default_vat_rate real not null default 23,
  quote_prefix text not null default 'Q-',
  invoice_prefix text not null default 'INV-',
  next_quote_number integer not null default 1,
  next_invoice_number integer not null default 1,
  logo_url text,
  created_at text not null,
  updated_at text not null
);

create table if not exists customers (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  county text,
  eircode text,
  notes text,
  created_at text not null,
  updated_at text not null
);
create index if not exists customers_user_id_idx on customers(user_id);

create table if not exists quotes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  customer_id text not null references customers(id),
  quote_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  issue_date text not null,
  valid_until text,
  notes text,
  terms text,
  vat_rate real not null default 23,
  subtotal real not null default 0,
  vat_amount real not null default 0,
  total real not null default 0,
  created_at text not null,
  updated_at text not null
);
create index if not exists quotes_user_id_idx on quotes(user_id);
create index if not exists quotes_customer_id_idx on quotes(customer_id);

create table if not exists quote_items (
  id text primary key,
  quote_id text not null references quotes(id) on delete cascade,
  description text not null default '',
  quantity real not null default 1,
  unit_price real not null default 0,
  line_total real not null default 0,
  sort_order integer not null default 0
);
create index if not exists quote_items_quote_id_idx on quote_items(quote_id);

create table if not exists invoices (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  customer_id text not null references customers(id),
  quote_id text references quotes(id),
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','partially_paid','overdue','void')),
  issue_date text not null,
  due_date text,
  notes text,
  terms text,
  vat_rate real not null default 23,
  subtotal real not null default 0,
  vat_amount real not null default 0,
  total real not null default 0,
  amount_paid real not null default 0,
  created_at text not null,
  updated_at text not null
);
create index if not exists invoices_user_id_idx on invoices(user_id);
create index if not exists invoices_customer_id_idx on invoices(customer_id);

create table if not exists invoice_items (
  id text primary key,
  invoice_id text not null references invoices(id) on delete cascade,
  description text not null default '',
  quantity real not null default 1,
  unit_price real not null default 0,
  line_total real not null default 0,
  sort_order integer not null default 0
);
create index if not exists invoice_items_invoice_id_idx on invoice_items(invoice_id);

create table if not exists payments (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  invoice_id text not null references invoices(id) on delete cascade,
  amount real not null,
  payment_date text not null,
  method text not null default 'bank_transfer' check (method in ('cash','bank_transfer','card','cheque','other')),
  notes text,
  created_at text not null
);
create index if not exists payments_invoice_id_idx on payments(invoice_id);

create table if not exists creditors (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  supplier_name text not null,
  description text,
  amount real not null default 0,
  invoice_date text not null,
  due_date text,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  paid_date text,
  notes text,
  receipt_path text,
  created_at text not null,
  updated_at text not null
);
create index if not exists creditors_user_id_idx on creditors(user_id);

create table if not exists expenses (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  vendor text not null default '',
  category text not null default 'Other' check (category in (
    'Materials & Parts', 'Fuel & Travel', 'Tools & Equipment',
    'Subcontractors', 'Vehicle', 'Insurance', 'Office & Admin', 'Training', 'Other'
  )),
  amount real not null default 0,
  vat_amount real,
  expense_date text not null,
  receipt_path text,
  notes text,
  created_at text not null,
  updated_at text not null
);
create index if not exists expenses_user_id_idx on expenses(user_id);
create index if not exists expenses_expense_date_idx on expenses(expense_date);

create table if not exists service_records (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  customer_id text not null references customers(id) on delete cascade,
  service_type text not null default 'Annual Service',
  equipment text,
  service_date text not null,
  interval_months integer not null default 12,
  next_due_date text not null,
  notes text,
  reminder_sent integer not null default 0,
  created_at text not null,
  updated_at text not null
);
create index if not exists service_records_user_id_idx on service_records(user_id);
create index if not exists service_records_customer_id_idx on service_records(customer_id);
create index if not exists service_records_next_due_idx on service_records(next_due_date);
