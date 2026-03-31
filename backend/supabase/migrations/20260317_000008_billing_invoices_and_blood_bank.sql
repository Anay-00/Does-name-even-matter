create table if not exists public.billing_invoices (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  room_allotment_id uuid,
  invoice_number text not null,
  patient_name text not null,
  room_number text,
  subtotal numeric(10,2) not null default 0,
  tax_percentage numeric(5,2) not null default 0,
  tax_amount numeric(10,2) not null default 0,
  total_amount numeric(10,2) not null default 0,
  notes text,
  status text not null default 'generated',
  billed_at timestamptz not null default now()
);

do $$
begin
  if exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'room_allotments'
  ) and not exists (
    select 1
    from pg_constraint
    where conname = 'billing_invoices_room_allotment_id_fkey'
  ) then
    alter table public.billing_invoices
      add constraint billing_invoices_room_allotment_id_fkey
      foreign key (room_allotment_id)
      references public.room_allotments(id);
  end if;
end
$$;

create unique index if not exists idx_billing_invoices_invoice_number on public.billing_invoices(invoice_number);
create index if not exists idx_billing_invoices_hospital_billed on public.billing_invoices(hospital_id, billed_at desc);

create table if not exists public.blood_bank_units (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  blood_group text not null,
  component text not null,
  units_available int not null default 0,
  reorder_level int not null default 5,
  updated_at timestamptz not null default now()
);

create index if not exists idx_blood_bank_units_hospital_updated on public.blood_bank_units(hospital_id, updated_at desc);

create table if not exists public.blood_bank_issues (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  patient_name text not null,
  blood_group text not null,
  component text not null,
  units_issued int not null default 1,
  status text not null default 'Issued',
  issued_at timestamptz not null default now()
);

create index if not exists idx_blood_bank_issues_hospital_issued on public.blood_bank_issues(hospital_id, issued_at desc);
