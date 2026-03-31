-- HMS extended operations persistence for shifts, lab, OT, pharmacy, and claims.

create table if not exists public.lab_samples (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  sample_code text not null,
  patient_name text not null,
  test_name text not null,
  status text not null default 'in_process',
  created_at timestamptz not null default now()
);

create index if not exists idx_lab_samples_hospital_created on public.lab_samples(hospital_id, created_at desc);

create table if not exists public.ot_schedules (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  ot_room text not null,
  procedure_name text not null,
  surgeon_name text not null,
  scheduled_time text not null,
  status text not null default 'Scheduled',
  created_at timestamptz not null default now()
);

create index if not exists idx_ot_schedules_hospital_created on public.ot_schedules(hospital_id, created_at desc);

create table if not exists public.ot_consumables (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  item_name text not null,
  quantity int not null default 0,
  status text not null default 'Ready',
  updated_at timestamptz not null default now()
);

create index if not exists idx_ot_consumables_hospital_updated on public.ot_consumables(hospital_id, updated_at desc);

create table if not exists public.pharmacy_inventory (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  medicine_name text not null,
  units int not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_pharmacy_inventory_hospital_updated on public.pharmacy_inventory(hospital_id, updated_at desc);

create table if not exists public.pharmacy_issues (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  patient_name text not null,
  medicine_name text not null,
  issued_at timestamptz not null default now()
);

create index if not exists idx_pharmacy_issues_hospital_issued on public.pharmacy_issues(hospital_id, issued_at desc);

create table if not exists public.insurance_claims (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  patient_name text not null,
  provider_name text not null,
  amount numeric(10,2) not null default 0,
  status text not null default 'Submitted',
  created_at timestamptz not null default now()
);

create index if not exists idx_insurance_claims_hospital_created on public.insurance_claims(hospital_id, created_at desc);
