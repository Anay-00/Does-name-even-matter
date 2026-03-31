-- MediSync initial schema for single-city rollout (Indore) with multi-city-ready model.

create extension if not exists "uuid-ossp";
create extension if not exists postgis;

create type public.user_role as enum (
  'super_admin',
  'admin',
  'hospital_admin_staff',
  'dispatch_operator',
  'doctor',
  'nurse',
  'ambulance_provider_operator',
  'public_requester'
);

create type public.resource_type as enum (
  'icu_bed',
  'normal_bed',
  'ventilator',
  'ambulance',
  'emergency_doctor',
  'laboratory_slot',
  'radiology_slot',
  'ot_slot',
  'pharmacy_counter',
  'blood_unit',
  'insurance_desk',
  'telemedicine_slot'
);

create type public.request_priority as enum ('critical', 'high', 'medium', 'low');

create type public.request_status as enum (
  'created',
  'otp_verified',
  'pending_hospital_response',
  'accepted',
  'rejected_retrying',
  'failed_no_match',
  'cancelled',
  'completed'
);

create type public.ambulance_owner_type as enum ('hospital', 'provider');
create type public.ambulance_trip_status as enum ('idle', 'dispatched', 'arrived_patient', 'to_hospital', 'completed');

create table if not exists public.cities (
  id uuid primary key default uuid_generate_v4(),
  name text not null unique,
  state text,
  country text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.hospitals (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id),
  code text not null unique,
  name text not null,
  address text,
  landmark text,
  location geography(point, 4326),
  is_active boolean not null default true,
  reliability_score numeric(5,2) not null default 50.00,
  current_load numeric(5,2) not null default 0.0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_hospitals_city on public.hospitals(city_id);
create index if not exists idx_hospitals_location on public.hospitals using gist(location);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id),
  city_id uuid references public.cities(id),
  hospital_id uuid references public.hospitals(id),
  role public.user_role not null,
  full_name text not null,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (role, phone)
);

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  name text not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  unique (hospital_id, name)
);

create table if not exists public.resource_inventory (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  department_id uuid references public.departments(id),
  resource_type public.resource_type not null,
  total_count int not null default 0,
  available_count int not null default 0,
  blocked_count int not null default 0,
  in_maintenance_count int not null default 0,
  updated_at timestamptz not null default now(),
  unique (hospital_id, department_id, resource_type)
);

create index if not exists idx_resource_inventory_hospital on public.resource_inventory(hospital_id, resource_type);

create table if not exists public.resource_reservations (
  id uuid primary key default uuid_generate_v4(),
  emergency_request_id uuid,
  hospital_id uuid not null references public.hospitals(id),
  resource_type public.resource_type not null,
  quantity int not null default 1,
  status text not null default 'active',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.ambulance_providers (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ambulances (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id),
  hospital_id uuid references public.hospitals(id),
  provider_id uuid references public.ambulance_providers(id),
  owner_type public.ambulance_owner_type not null,
  vehicle_number text not null unique,
  ambulance_type text not null,
  current_location geography(point, 4326),
  gps_updated_at timestamptz,
  trip_status public.ambulance_trip_status not null default 'idle',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_ambulances_city on public.ambulances(city_id);
create index if not exists idx_ambulances_location on public.ambulances using gist(current_location);

create table if not exists public.doctors (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  full_name text not null,
  specialization text not null,
  qualification text,
  is_emergency_doctor boolean not null default false,
  is_available boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.doctor_shifts (
  id uuid primary key default uuid_generate_v4(),
  doctor_id uuid not null references public.doctors(id),
  shift_start timestamptz not null,
  shift_end timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.emergency_requests (
  id uuid primary key default uuid_generate_v4(),
  city_id uuid not null references public.cities(id),
  requester_profile_id uuid references public.profiles(id),
  caller_name text not null,
  caller_phone text not null,
  patient_name text not null,
  patient_age int,
  patient_gender text,
  emergency_type text not null,
  symptoms text[] not null,
  requested_resources public.resource_type[] not null,
  priority public.request_priority not null,
  status public.request_status not null default 'created',
  location geography(point, 4326) not null,
  address text,
  landmark text,
  assigned_hospital_id uuid references public.hospitals(id),
  assigned_ambulance_id uuid references public.ambulances(id),
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_emergency_city_status on public.emergency_requests(city_id, status, created_at desc);
create index if not exists idx_emergency_location on public.emergency_requests using gist(location);

create table if not exists public.request_attempts (
  id uuid primary key default uuid_generate_v4(),
  emergency_request_id uuid not null references public.emergency_requests(id),
  hospital_id uuid not null references public.hospitals(id),
  radius_km int not null,
  score numeric(8,2) not null,
  distance_km numeric(8,2) not null,
  decision text not null default 'pending',
  decision_at timestamptz,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.allocation_events (
  id uuid primary key default uuid_generate_v4(),
  emergency_request_id uuid not null references public.emergency_requests(id),
  event_type text not null,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  hospital_id uuid references public.hospitals(id),
  title text not null,
  body text not null,
  severity text not null default 'info',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid references auth.users(id),
  actor_role public.user_role,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.emergency_requests enable row level security;
alter table public.resource_inventory enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "hospital scoped emergency read" on public.emergency_requests;
create policy "hospital scoped emergency read"
on public.emergency_requests
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role in ('super_admin', 'admin') or p.hospital_id = emergency_requests.assigned_hospital_id)
  )
);

drop policy if exists "hospital scoped inventory read" on public.resource_inventory;
create policy "hospital scoped inventory read"
on public.resource_inventory
for select
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role in ('super_admin', 'admin') or p.hospital_id = resource_inventory.hospital_id)
  )
);

insert into public.cities(name, state, country)
values ('Indore', 'Madhya Pradesh', 'India')
on conflict (name) do nothing;
