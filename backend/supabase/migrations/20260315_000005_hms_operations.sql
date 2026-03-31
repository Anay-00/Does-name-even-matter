-- HMS operations persistence for doctors, room allotments, and billing.

alter table if exists public.doctors
  add column if not exists first_name text,
  add column if not exists middle_name text,
  add column if not exists last_name text,
  add column if not exists gender text,
  add column if not exists date_of_birth date,
  add column if not exists blood_group text,
  add column if not exists email text,
  add column if not exists mobile text,
  add column if not exists alternate_contact text,
  add column if not exists address text,
  add column if not exists department text,
  add column if not exists is_active boolean not null default true;

create index if not exists idx_doctors_hospital_department on public.doctors(hospital_id, department);
create unique index if not exists idx_doctors_hospital_email_unique on public.doctors(hospital_id, email) where email is not null;

create table if not exists public.room_allotments (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  patient_name text not null,
  patient_id text not null,
  age int,
  gender text,
  mobile text,
  emergency_contact text,
  medical_history text,
  allergies text,
  room_number text not null,
  status text not null default 'admitted',
  allotted_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_room_allotments_hospital on public.room_allotments(hospital_id, allotted_at desc);

create table if not exists public.billing_services (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  service_name text not null,
  amount numeric(10,2) not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_billing_services_hospital on public.billing_services(hospital_id, created_at desc);

create table if not exists public.billing_tax_settings (
  hospital_id uuid primary key references public.hospitals(id),
  tax_percentage numeric(5,2) not null default 5.00,
  updated_at timestamptz not null default now()
);

insert into public.billing_services (hospital_id, service_name, amount)
select h.id, v.service_name, v.amount
from public.hospitals h
cross join (
  values
    ('Consultation Fee', 50.00),
    ('Lab Test', 75.00),
    ('X-Ray', 100.00)
) as v(service_name, amount)
where not exists (
  select 1 from public.billing_services s where s.hospital_id = h.id
);

insert into public.billing_tax_settings (hospital_id, tax_percentage)
select h.id, 5.00
from public.hospitals h
where not exists (
  select 1 from public.billing_tax_settings t where t.hospital_id = h.id
);
