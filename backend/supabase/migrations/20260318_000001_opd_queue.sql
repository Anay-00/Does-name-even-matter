-- ============================================================
-- OPD Queue Management System
-- Tables: opd_counters, opd_tokens
-- Function: next_opd_token_number (atomic counter)
-- Based on GoI National Health Mission OPD statistics
-- ============================================================

-- Daily token counter per hospital-department
create table if not exists public.opd_counters (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  department_id uuid not null references public.departments(id),
  counter_date date not null default current_date,
  last_token_number int not null default 0,
  created_at timestamptz not null default now(),
  unique(hospital_id, department_id, counter_date)
);

-- Individual OPD tokens
create table if not exists public.opd_tokens (
  id uuid primary key default uuid_generate_v4(),
  hospital_id uuid not null references public.hospitals(id),
  department_id uuid not null references public.departments(id),
  doctor_id uuid references public.doctors(id),
  token_number int not null,
  patient_name text not null,
  patient_age int,
  patient_gender text check (patient_gender in ('male', 'female', 'other')),
  patient_phone text,
  priority text not null default 'normal' check (priority in ('normal', 'priority')),
  status text not null default 'waiting' check (status in ('waiting', 'in_consultation', 'completed', 'skipped', 'cancelled')),
  issued_at timestamptz not null default now(),
  called_at timestamptz,
  completed_at timestamptz,
  consultation_duration_seconds int,
  counter_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_opd_tokens_hospital_date
  on public.opd_tokens(hospital_id, counter_date);

create index if not exists idx_opd_tokens_dept_status
  on public.opd_tokens(department_id, status);

create index if not exists idx_opd_tokens_doctor_status
  on public.opd_tokens(doctor_id, status)
  where doctor_id is not null;

create index if not exists idx_opd_tokens_status_date
  on public.opd_tokens(status, counter_date);

-- Atomic token number generator (INSERT ... ON CONFLICT + RETURNING)
create or replace function public.next_opd_token_number(
  p_hospital_id uuid,
  p_department_id uuid,
  p_date date default current_date
) returns int as $$
declare
  v_next int;
begin
  insert into public.opd_counters (hospital_id, department_id, counter_date, last_token_number)
  values (p_hospital_id, p_department_id, p_date, 1)
  on conflict (hospital_id, department_id, counter_date)
  do update set last_token_number = opd_counters.last_token_number + 1
  returning last_token_number into v_next;

  return v_next;
end;
$$ language plpgsql;
