create or replace function public.generate_customer_code()
returns text
language plpgsql
as $$
declare
  candidate text := '';
  i int;
begin
  loop
    candidate := '';
    for i in 1..14 loop
      candidate := candidate || trunc(random() * 10)::int::text;
    end loop;
    exit when to_regclass('public.customers') is null
      or not exists (
        select 1 from public.customers where customer_code = candidate
      );
  end loop;
  return candidate;
end;
$$;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  price numeric(12,2) not null default 0,
  image_path text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  customer_code text not null unique default public.generate_customer_code(),
  name text,
  full_name text,
  phone text,
  mobile text,
  city text,
  address text,
  location_pin text not null default '',
  id_document_path text,
  payment_method text not null default 'bank',
  archived_at timestamptz,
  created_by text not null default 'admin',
  status text default 'active',
  created_at timestamptz not null default now()
);

do $$
declare
  col_type text;
begin
  if to_regclass('public.customers') is null then
    raise exception 'public.customers was not created';
  end if;

  select data_type into col_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'customers'
    and column_name = 'customer_code';

  if col_type is null then
    alter table public.customers add column customer_code text;
    update public.customers
    set customer_code = public.generate_customer_code()
    where customer_code is null or btrim(customer_code) = '';
    alter table public.customers alter column customer_code set not null;
    create unique index if not exists customers_customer_code_key
      on public.customers (customer_code);
  elsif col_type not in ('text', 'character varying') then
    alter table public.customers
      alter column customer_code type text using customer_code::text;
  end if;

  alter table public.customers
    alter column customer_code set default public.generate_customer_code();
end $$;

alter table public.customers add column if not exists location_pin text not null default '';
alter table public.customers add column if not exists id_document_path text;
alter table public.customers add column if not exists payment_method text not null default 'bank';
alter table public.customers add column if not exists archived_at timestamptz;
alter table public.customers add column if not exists created_by text not null default 'admin';

alter table public.products add column if not exists name text;
alter table public.products add column if not exists description text not null default '';
alter table public.products add column if not exists price numeric(12,2) not null default 0;
alter table public.products add column if not exists image_path text;
alter table public.products add column if not exists is_active boolean not null default true;
alter table public.products add column if not exists created_at timestamptz not null default now();

create table if not exists public.instalment_contracts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null default '',
  total_amount numeric(12,2) not null default 0,
  down_payment numeric(12,2) not null default 0,
  remaining_amount numeric(12,2) not null default 0,
  duration_months int not null default 12,
  monthly_amount numeric(12,2) not null default 0,
  start_date date not null default current_date,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

alter table public.instalment_contracts add column if not exists remaining_amount numeric(12,2) not null default 0;

create table if not exists public.instalments (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.instalment_contracts(id) on delete cascade,
  month_number int not null,
  amount numeric(12,2) not null default 0,
  due_date date,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.bank_accounts (
  id uuid primary key default gen_random_uuid(),
  bank_name text not null,
  account_name text not null,
  iban text not null,
  instructions text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_bank_assignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  bank_account_id uuid not null references public.bank_accounts(id),
  is_active boolean not null default true
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete cascade,
  contract_id uuid references public.instalment_contracts(id) on delete cascade,
  instalment_id uuid references public.instalments(id) on delete set null,
  bank_account_id uuid references public.bank_accounts(id),
  amount numeric(12,2) not null default 0,
  payment_method text not null default 'bank',
  receipt_path text,
  cardholder_name text,
  status text not null default 'pending',
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payments add column if not exists cardholder_name text;
alter table public.payments add column if not exists contract_id uuid;
alter table public.payments add column if not exists instalment_id uuid;
alter table public.payments add column if not exists payment_method text default 'bank';
alter table public.payments add column if not exists bank_account_id uuid;
alter table public.payments add column if not exists customer_code text;
alter table public.payments add column if not exists kind text;
alter table public.payments add column if not exists method text;

alter table public.bank_accounts add column if not exists bank_name text;
alter table public.bank_accounts add column if not exists account_name text;
alter table public.bank_accounts add column if not exists iban text;
alter table public.bank_accounts add column if not exists instructions text not null default '';
alter table public.bank_accounts add column if not exists is_active boolean not null default true;
alter table public.bank_accounts add column if not exists created_at timestamptz not null default now();
alter table public.bank_accounts add column if not exists qr_path text;

alter table public.instalment_contracts add column if not exists customer_id uuid;
alter table public.instalment_contracts add column if not exists product_id uuid;
alter table public.instalment_contracts add column if not exists product_name text not null default '';
alter table public.instalment_contracts add column if not exists total_amount numeric(12,2) not null default 0;
alter table public.instalment_contracts add column if not exists down_payment numeric(12,2) not null default 0;
alter table public.instalment_contracts add column if not exists duration_months int not null default 12;
alter table public.instalment_contracts add column if not exists monthly_amount numeric(12,2) not null default 0;
alter table public.instalment_contracts add column if not exists start_date date not null default current_date;
alter table public.instalment_contracts add column if not exists status text not null default 'active';
alter table public.instalment_contracts add column if not exists created_at timestamptz not null default now();

alter table public.instalments add column if not exists contract_id uuid;
alter table public.instalments add column if not exists month_number int;
alter table public.instalments add column if not exists amount numeric(12,2) not null default 0;
alter table public.instalments add column if not exists due_date date;
alter table public.instalments add column if not exists status text not null default 'pending';
alter table public.instalments add column if not exists paid_at timestamptz;
alter table public.instalments add column if not exists created_at timestamptz not null default now();
alter table public.instalments add column if not exists enabled boolean not null default false;
alter table public.instalments add column if not exists enabled_at timestamptz;

alter table public.customer_bank_assignments add column if not exists is_active boolean not null default true;

create table if not exists public.customer_products (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  contract_id uuid references public.instalment_contracts(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  price numeric(12,2) not null default 0
);

create table if not exists public.supervisors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  username text not null unique,
  created_at timestamptz not null default now()
);

alter table public.customers add column if not exists name text;
alter table public.customers add column if not exists full_name text;
alter table public.customers add column if not exists phone text;
alter table public.customers add column if not exists mobile text;
alter table public.customers add column if not exists city text;
alter table public.customers add column if not exists address text;
alter table public.customers add column if not exists status text default 'active';
alter table public.customer_products add column if not exists contract_id uuid;
alter table public.customer_products add column if not exists product_name text;
alter table public.customer_products add column if not exists price numeric(12,2) not null default 0;
alter table public.supervisors add column if not exists email text not null default '';
alter table public.supervisors add column if not exists created_at timestamptz not null default now();

update public.customers
set
  full_name = coalesce(full_name, name),
  name = coalesce(name, full_name),
  mobile = coalesce(mobile, phone),
  phone = coalesce(phone, mobile),
  city = coalesce(city, location_pin),
  address = coalesce(address, location_pin),
  status = coalesce(status, 'active');

create unique index if not exists payments_one_pending_instalment
on public.payments (instalment_id)
where status = 'pending' and instalment_id is not null;

create or replace function public.create_customer_plan(payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  new_customer uuid;
  new_code text;
  new_contract uuid;
  total_price numeric(12,2);
  deposit numeric(12,2);
  remaining numeric(12,2);
  monthly numeric(12,2);
  last_month numeric(12,2);
  months int;
  product_count int;
  matched_count int;
  method text;
  bank_id uuid;
  first_product uuid;
  product_label text;
  start_on date := current_date;
  month_no int;
begin
  months := (payload->>'duration_months')::int;
  if months not in (3, 6, 12, 18, 24) then
    raise exception 'Select an instalment plan of 3, 6, 12, 18, or 24 months';
  end if;

  method := lower(btrim(coalesce(payload->>'payment_method', '')));
  if method !~ 'bank' and method !~ 'card' then
    raise exception 'Select a payment method';
  end if;

  if coalesce(btrim(payload->>'name'), '') = '' or coalesce(btrim(payload->>'phone'), '') = '' then
    raise exception 'Enter the customer name and mobile number';
  end if;

  if coalesce(btrim(payload->>'location_pin'), '') = '' then
    raise exception 'Enter the location PIN';
  end if;

  if payload->>'bank_account_id' is null or btrim(payload->>'bank_account_id') = '' then
    raise exception 'Select a bank account';
  end if;

  bank_id := (payload->>'bank_account_id')::uuid;
  if not exists (select 1 from public.bank_accounts where id = bank_id and is_active) then
    raise exception 'Selected bank account is not available';
  end if;

  select count(*) into product_count
  from jsonb_array_elements(coalesce(payload->'products', '[]'::jsonb));
  if product_count < 1 then
    raise exception 'Select at least one product';
  end if;

  select count(*), coalesce(sum(p.price), 0)
  into matched_count, total_price
  from jsonb_array_elements(payload->'products') elem
  join public.products p on p.id = (elem->>'id')::uuid and p.is_active = true;

  if matched_count <> product_count then
    raise exception 'One or more selected products are not available';
  end if;

  deposit := round(coalesce((payload->>'down_payment')::numeric, 0), 2);
  if deposit < 0 or deposit > total_price then
    raise exception 'Down payment must be between 0 and the total price';
  end if;

  remaining := round(total_price - deposit, 2);
  monthly := round(remaining / months, 2);
  last_month := round(remaining - (monthly * (months - 1)), 2);

  select p.id
  into first_product
  from jsonb_array_elements(payload->'products') elem
  join public.products p on p.id = (elem->>'id')::uuid
  limit 1;

  select string_agg(p.name, ', ' order by p.name)
  into product_label
  from jsonb_array_elements(payload->'products') elem
  join public.products p on p.id = (elem->>'id')::uuid;

  insert into public.customers (
    name,
    full_name,
    phone,
    mobile,
    city,
    address,
    location_pin,
    id_document_path,
    payment_method,
    status,
    created_by
  ) values (
    btrim(payload->>'name'),
    btrim(payload->>'name'),
    btrim(payload->>'phone'),
    btrim(payload->>'phone'),
    left(btrim(payload->>'location_pin'), 120),
    btrim(payload->>'location_pin'),
    btrim(payload->>'location_pin'),
    nullif(btrim(coalesce(payload->>'id_document_path', '')), ''),
    method,
    'active',
    case when payload->>'created_by' = 'supervisor' then 'supervisor' else 'admin' end
  )
  returning id, customer_code into new_customer, new_code;

  insert into public.instalment_contracts (
    customer_id,
    product_id,
    product_name,
    total_amount,
    down_payment,
    remaining_amount,
    duration_months,
    monthly_amount,
    start_date,
    status
  ) values (
    new_customer,
    first_product,
    product_label,
    total_price,
    deposit,
    remaining,
    months,
    monthly,
    start_on,
    'active'
  )
  returning id into new_contract;

  insert into public.customer_products (customer_id, contract_id, product_id, product_name, price)
  select new_customer, new_contract, p.id, p.name, p.price
  from jsonb_array_elements(payload->'products') elem
  join public.products p on p.id = (elem->>'id')::uuid;

  insert into public.customer_bank_assignments (customer_id, bank_account_id, is_active)
  values (new_customer, bank_id, true);

  if deposit > 0 then
    insert into public.instalments (contract_id, month_number, amount, due_date, status)
    values (new_contract, 0, deposit, start_on, 'pending');
  end if;

  for month_no in 1..months loop
    insert into public.instalments (contract_id, month_number, amount, due_date, status)
    values (
      new_contract,
      month_no,
      case when month_no = months then last_month else monthly end,
      (start_on + make_interval(months => month_no))::date,
      'pending'
    );
  end loop;

  return jsonb_build_object(
    'id', new_customer,
    'customer_code', new_code,
    'name', btrim(payload->>'name'),
    'phone', btrim(payload->>'phone'),
    'total_price', total_price,
    'down_payment', deposit,
    'remaining_amount', remaining,
    'monthly_amount', monthly,
    'duration_months', months
  );
end;
$$;

create or replace function public.review_payment(p_id uuid, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pay public.payments%rowtype;
begin
  if p_status not in ('approved', 'rejected') then
    raise exception 'Invalid payment status';
  end if;

  select * into pay from public.payments where id = p_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;
  if pay.status <> 'pending' then
    raise exception 'This payment was already reviewed';
  end if;

  update public.payments
  set status = p_status,
      reviewed_at = now()
  where id = p_id;

  if p_status = 'approved' and pay.instalment_id is not null then
    update public.instalments
    set status = 'paid',
        paid_at = now()
    where id = pay.instalment_id;
  end if;
end;
$$;

create or replace function public.set_customer_archived(p_id uuid, p_archived boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.customers
  set archived_at = case when p_archived then now() else null end,
      status = case when p_archived then 'archived' else 'active' end
  where id = p_id;

  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

alter table public.products enable row level security;
alter table public.bank_accounts enable row level security;
alter table public.customers enable row level security;
alter table public.customer_products enable row level security;
alter table public.customer_bank_assignments enable row level security;
alter table public.instalment_contracts enable row level security;
alter table public.instalments enable row level security;
alter table public.payments enable row level security;
alter table public.supervisors enable row level security;

drop policy if exists noon_products_select on public.products;
drop policy if exists noon_products_insert on public.products;
drop policy if exists noon_products_update on public.products;
create policy noon_products_select on public.products for select to anon, authenticated using (true);
create policy noon_products_insert on public.products for insert to anon, authenticated with check (true);
create policy noon_products_update on public.products for update to anon, authenticated using (true) with check (true);

drop policy if exists noon_banks_select on public.bank_accounts;
drop policy if exists noon_banks_insert on public.bank_accounts;
drop policy if exists noon_banks_update on public.bank_accounts;
create policy noon_banks_select on public.bank_accounts for select to anon, authenticated using (true);
create policy noon_banks_insert on public.bank_accounts for insert to anon, authenticated with check (true);
create policy noon_banks_update on public.bank_accounts for update to anon, authenticated using (true) with check (true);

drop policy if exists noon_customers_select on public.customers;
create policy noon_customers_select on public.customers for select to anon, authenticated using (true);

drop policy if exists noon_contracts_select on public.instalment_contracts;
create policy noon_contracts_select on public.instalment_contracts for select to anon, authenticated using (true);

drop policy if exists noon_instalments_select on public.instalments;
create policy noon_instalments_select on public.instalments for select to anon, authenticated using (true);

drop policy if exists noon_assignments_select on public.customer_bank_assignments;
create policy noon_assignments_select on public.customer_bank_assignments for select to anon, authenticated using (true);

drop policy if exists noon_customer_products_select on public.customer_products;
create policy noon_customer_products_select on public.customer_products for select to anon, authenticated using (true);

drop policy if exists noon_payments_select on public.payments;
drop policy if exists noon_payments_insert on public.payments;
create policy noon_payments_select on public.payments for select to anon, authenticated using (true);
create policy noon_payments_insert on public.payments for insert to anon, authenticated with check (status = 'pending');

drop policy if exists noon_supervisors_select on public.supervisors;
drop policy if exists noon_supervisors_insert on public.supervisors;
drop policy if exists noon_supervisors_delete on public.supervisors;
create policy noon_supervisors_select on public.supervisors for select to anon, authenticated using (true);
create policy noon_supervisors_insert on public.supervisors for insert to anon, authenticated with check (true);
create policy noon_supervisors_delete on public.supervisors for delete to anon, authenticated using (true);

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.products to anon, authenticated;
grant select, insert, update on public.bank_accounts to anon, authenticated;
grant select on public.customers to anon, authenticated;
grant select on public.instalment_contracts to anon, authenticated;
grant select on public.instalments to anon, authenticated;
grant select on public.customer_bank_assignments to anon, authenticated;
grant select on public.customer_products to anon, authenticated;
grant select, insert on public.payments to anon, authenticated;
grant select, insert, delete on public.supervisors to anon, authenticated;
do $$
begin
  if to_regclass('public.payments') is not null
    and not exists (
      select 1 from pg_constraint where conname = 'payments_instalment_id_fkey'
    ) then
    alter table public.payments
      add constraint payments_instalment_id_fkey
      foreign key (instalment_id) references public.instalments(id) on delete set null;
  end if;
exception
  when duplicate_object then
    null;
end $$;

notify pgrst, 'reload schema';

grant execute on function public.generate_customer_code() to anon, authenticated;
grant execute on function public.create_customer_plan(jsonb) to anon, authenticated;
grant execute on function public.review_payment(uuid, text) to anon, authenticated;
grant execute on function public.set_customer_archived(uuid, boolean) to anon, authenticated;

insert into storage.buckets (id, name, public)
values
  ('product-images', 'product-images', true),
  ('customer-documents', 'customer-documents', false),
  ('payment-receipts', 'payment-receipts', false)
on conflict (id) do nothing;

drop policy if exists noon_product_images_read on storage.objects;
drop policy if exists noon_product_images_insert on storage.objects;
drop policy if exists noon_customer_documents_read on storage.objects;
drop policy if exists noon_customer_documents_insert on storage.objects;
drop policy if exists noon_receipts_read on storage.objects;
drop policy if exists noon_receipts_insert on storage.objects;

create policy noon_product_images_read on storage.objects
for select to public
using (bucket_id = 'product-images');

create policy noon_product_images_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'product-images');

create policy noon_customer_documents_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'customer-documents');

create policy noon_customer_documents_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'customer-documents');

create policy noon_receipts_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'payment-receipts');

create policy noon_receipts_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'payment-receipts');

do $$
declare
  product_id uuid;
  customer_id uuid;
  contract_id uuid;
begin
  if exists (select 1 from public.customers where customer_code = 'NOON123') then
    return;
  end if;

  insert into public.products (name, description, price, is_active)
  values ('Samsung Galaxy Smartphone', '__seller_type_noon__', 1800, true)
  returning id into product_id;

  insert into public.customers (
    customer_code,
    name,
    full_name,
    phone,
    mobile,
    city,
    address,
    location_pin,
    payment_method,
    status,
    created_by,
    created_at
  ) values (
    'NOON123',
    'Ahmed Example',
    'Ahmed Example',
    '+966 5X XXX XXXX',
    '+966 5X XXX XXXX',
    'Riyadh, Saudi Arabia',
    'Riyadh, Saudi Arabia',
    'Riyadh, Saudi Arabia',
    'bank',
    'active',
    'admin',
    '2026-10-22T12:00:00Z'
  )
  returning id into customer_id;

  insert into public.instalment_contracts (
    customer_id,
    product_id,
    product_name,
    total_amount,
    down_payment,
    remaining_amount,
    duration_months,
    monthly_amount,
    start_date,
    status,
    created_at
  ) values (
    customer_id,
    product_id,
    'Samsung Galaxy Smartphone',
    1800,
    360,
    1440,
    6,
    240,
    '2026-10-22',
    'active',
    '2026-10-22T12:00:00Z'
  )
  returning id into contract_id;

  insert into public.customer_products (customer_id, contract_id, product_id, product_name, price)
  values (customer_id, contract_id, product_id, 'Samsung Galaxy Smartphone', 1800);

  insert into public.instalments (contract_id, month_number, amount, due_date, status, paid_at)
  values
    (contract_id, 0, 360, '2026-10-22', 'paid', '2026-10-22T12:00:00Z'),
    (contract_id, 1, 240, '2026-11-22', 'paid', '2026-11-22T12:00:00Z'),
    (contract_id, 2, 240, '2026-12-22', 'paid', '2026-12-22T12:00:00Z'),
    (contract_id, 3, 240, '2027-01-22', 'pending', null),
    (contract_id, 4, 240, '2027-02-22', 'pending', null),
    (contract_id, 5, 240, '2027-03-22', 'pending', null),
    (contract_id, 6, 240, '2027-04-22', 'pending', null);
end;
$$;

alter table public.instalments add column if not exists enabled boolean not null default false;
alter table public.instalments add column if not exists enabled_at timestamptz;
alter table public.bank_accounts add column if not exists qr_path text;

insert into storage.buckets (id, name, public)
values ('bank-qr', 'bank-qr', true)
on conflict (id) do nothing;

drop policy if exists noon_bank_qr_read on storage.objects;
create policy noon_bank_qr_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'bank-qr');

drop policy if exists noon_bank_qr_insert on storage.objects;
create policy noon_bank_qr_insert on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'bank-qr');

create or replace function public.enable_next_instalment(p_customer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  next_id uuid;
begin
  select i.id into next_id
  from public.instalments i
  join public.instalment_contracts c on c.id = i.contract_id
  where c.customer_id = p_customer_id
    and i.paid_at is null
    and coalesce(i.enabled, false) = false
    and not exists (
      select 1
      from public.instalments earlier
      where earlier.contract_id = i.contract_id
        and earlier.month_number < i.month_number
        and earlier.paid_at is null
    )
  order by i.month_number
  limit 1;

  if next_id is null then
    raise exception 'There is no instalment left to enable';
  end if;

  update public.instalments
  set enabled = true, enabled_at = now()
  where id = next_id;
end;
$$;

create or replace function public.delete_customer(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.payments where customer_id = p_id;
  delete from public.customer_products where customer_id = p_id;
  delete from public.customer_bank_assignments where customer_id = p_id;
  delete from public.instalments
  where contract_id in (
    select id from public.instalment_contracts where customer_id = p_id
  );
  delete from public.instalment_contracts where customer_id = p_id;
  delete from public.customers where id = p_id;
  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

create or replace function public.update_customer_details(p_id uuid, payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  method text;
begin
  method := lower(btrim(coalesce(payload->>'payment_method', '')));
  if method <> '' and method !~ 'bank' and method !~ 'card' then
    raise exception 'Select a payment method';
  end if;

  update public.customers
  set
    name = coalesce(nullif(btrim(payload->>'name'), ''), name),
    full_name = coalesce(nullif(btrim(payload->>'name'), ''), full_name),
    phone = coalesce(nullif(btrim(payload->>'phone'), ''), phone),
    mobile = coalesce(nullif(btrim(payload->>'phone'), ''), mobile),
    location_pin = coalesce(nullif(btrim(payload->>'location_pin'), ''), location_pin),
    city = coalesce(nullif(btrim(payload->>'location_pin'), ''), city),
    address = coalesce(nullif(btrim(payload->>'location_pin'), ''), address),
    payment_method = case when method = '' then payment_method else method end
  where id = p_id;

  if not found then
    raise exception 'Customer not found';
  end if;
end;
$$;

grant execute on function public.enable_next_instalment(uuid) to anon, authenticated;
grant execute on function public.delete_customer(uuid) to anon, authenticated;
grant execute on function public.update_customer_details(uuid, jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
