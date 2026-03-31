-- Add explicit numeric coordinates for safer API-level distance calculations.

alter table if exists public.hospitals
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

alter table if exists public.emergency_requests
  add column if not exists patient_latitude double precision,
  add column if not exists patient_longitude double precision;

update public.hospitals
set latitude = coalesce(latitude, st_y(location::geometry)),
    longitude = coalesce(longitude, st_x(location::geometry))
where location is not null;

update public.emergency_requests
set patient_latitude = coalesce(patient_latitude, st_y(location::geometry)),
    patient_longitude = coalesce(patient_longitude, st_x(location::geometry))
where location is not null;

create index if not exists idx_hospitals_lat_lng on public.hospitals(latitude, longitude);
create index if not exists idx_emergency_patient_lat_lng on public.emergency_requests(patient_latitude, patient_longitude);
