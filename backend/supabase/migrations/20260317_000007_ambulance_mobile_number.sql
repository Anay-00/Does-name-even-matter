alter table if exists public.ambulances
  add column if not exists mobile_number text;

create index if not exists idx_ambulances_mobile_number on public.ambulances(mobile_number);
