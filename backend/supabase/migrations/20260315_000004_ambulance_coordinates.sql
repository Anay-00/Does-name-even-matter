-- Add explicit coordinates for ambulances to simplify ETA and map APIs.

alter table if exists public.ambulances
  add column if not exists latitude double precision,
  add column if not exists longitude double precision;

update public.ambulances
set latitude = coalesce(latitude, st_y(current_location::geometry)),
    longitude = coalesce(longitude, st_x(current_location::geometry))
where current_location is not null;

create index if not exists idx_ambulances_lat_lng on public.ambulances(latitude, longitude);
