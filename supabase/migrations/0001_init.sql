-- HVAC Business Manager — initial schema
-- Every table is scoped to auth.uid() via row-level security so the same
-- schema safely supports one owner today and more users later.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- business_settings: one row per user holding company + bank details used
-- on quotes/invoices and in "send bank details" emails.
-- ---------------------------------------------------------------------------
create table if not exists business_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade unique,
  business_name text not null default '',
  owner_name text default '',
  address text default '',
  phone text default '',
  email text default '',
  vat_number text default '',
  iban text default '',
  bic text default '',
  bank_name text default '',
  account_name text default '',
  default_vat_rate numeric(5,2) not null default 23,
  quote_prefix text not null default 'Q-',
  invoice_prefix text not null default 'INV-',
  next_quote_number integer not null default 1,
  next_invoice_number integer not null default 1,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- customers
-- ---------------------------------------------------------------------------
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  county text,
  eircode text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_user_id_idx on customers(user_id);

-- ---------------------------------------------------------------------------
-- quotes + quote_items
-- ---------------------------------------------------------------------------
create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  quote_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','accepted','declined','expired')),
  issue_date date not null default current_date,
  valid_until date,
  notes text,
  terms text,
  vat_rate numeric(5,2) not null default 23,
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_user_id_idx on quotes(user_id);
create index if not exists quotes_customer_id_idx on quotes(customer_id);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  description text not null default '',
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0
);

create index if not exists quote_items_quote_id_idx on quote_items(quote_id);

-- ---------------------------------------------------------------------------
-- invoices + invoice_items + payments
-- ---------------------------------------------------------------------------
create table if not exists invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  quote_id uuid references quotes(id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft' check (status in ('draft','sent','paid','partially_paid','overdue','void')),
  issue_date date not null default current_date,
  due_date date,
  notes text,
  terms text,
  vat_rate numeric(5,2) not null default 23,
  subtotal numeric(12,2) not null default 0,
  vat_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists invoices_user_id_idx on invoices(user_id);
create index if not exists invoices_customer_id_idx on invoices(customer_id);

create table if not exists invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  description text not null default '',
  quantity numeric(12,2) not null default 1,
  unit_price numeric(12,2) not null default 0,
  line_total numeric(12,2) not null default 0,
  sort_order integer not null default 0
);

create index if not exists invoice_items_invoice_id_idx on invoice_items(invoice_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  payment_date date not null default current_date,
  method text not null default 'bank_transfer' check (method in ('cash','bank_transfer','card','cheque','other')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_invoice_id_idx on payments(invoice_id);

-- ---------------------------------------------------------------------------
-- creditors: money the business owes to suppliers
-- ---------------------------------------------------------------------------
create table if not exists creditors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_name text not null,
  description text,
  amount numeric(12,2) not null default 0,
  invoice_date date not null default current_date,
  due_date date,
  status text not null default 'unpaid' check (status in ('unpaid','paid')),
  paid_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists creditors_user_id_idx on creditors(user_id);

-- ---------------------------------------------------------------------------
-- service_records: servicing history + next-due reminders
-- ---------------------------------------------------------------------------
create table if not exists service_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete cascade,
  service_type text not null default 'Annual Service',
  equipment text,
  service_date date not null default current_date,
  interval_months integer not null default 12,
  next_due_date date not null,
  notes text,
  reminder_sent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_records_user_id_idx on service_records(user_id);
create index if not exists service_records_customer_id_idx on service_records(customer_id);
create index if not exists service_records_next_due_idx on service_records(next_due_date);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['business_settings','customers','quotes','invoices','creditors','service_records']
  loop
    execute format('drop trigger if exists set_updated_at on %I;', t);
    execute format('create trigger set_updated_at before update on %I for each row execute function set_updated_at();', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- atomic document numbering: call via rpc('next_document_number', {p_doc_type})
-- avoids read-modify-write races when generating quote/invoice numbers.
-- ---------------------------------------------------------------------------
create or replace function next_document_number(p_doc_type text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prefix text;
  v_number integer;
  v_uid uuid := auth.uid();
begin
  if p_doc_type not in ('quote', 'invoice') then
    raise exception 'invalid document type %', p_doc_type;
  end if;

  insert into business_settings (user_id)
  values (v_uid)
  on conflict (user_id) do nothing;

  if p_doc_type = 'quote' then
    update business_settings
      set next_quote_number = next_quote_number + 1
      where user_id = v_uid
      returning next_quote_number - 1, quote_prefix into v_number, v_prefix;
  else
    update business_settings
      set next_invoice_number = next_invoice_number + 1
      where user_id = v_uid
      returning next_invoice_number - 1, invoice_prefix into v_number, v_prefix;
  end if;

  return v_prefix || lpad(v_number::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table business_settings enable row level security;
alter table customers enable row level security;
alter table quotes enable row level security;
alter table quote_items enable row level security;
alter table invoices enable row level security;
alter table invoice_items enable row level security;
alter table payments enable row level security;
alter table creditors enable row level security;
alter table service_records enable row level security;

create policy "owner full access" on business_settings for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner full access" on customers for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner full access" on quotes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner full access via quote" on quote_items for all
  using (exists (select 1 from quotes q where q.id = quote_items.quote_id and q.user_id = auth.uid()))
  with check (exists (select 1 from quotes q where q.id = quote_items.quote_id and q.user_id = auth.uid()));

create policy "owner full access" on invoices for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner full access via invoice" on invoice_items for all
  using (exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid()))
  with check (exists (select 1 from invoices i where i.id = invoice_items.invoice_id and i.user_id = auth.uid()));

create policy "owner full access" on payments for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner full access" on creditors for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "owner full access" on service_records for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- storage bucket for business logo
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create policy "owner manage own logo"
  on storage.objects for all
  using (bucket_id = 'logos' and owner = auth.uid())
  with check (bucket_id = 'logos' and owner = auth.uid());

create policy "public read logos"
  on storage.objects for select
  using (bucket_id = 'logos');
