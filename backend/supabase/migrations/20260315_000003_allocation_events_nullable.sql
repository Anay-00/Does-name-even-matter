-- Allow platform-level realtime events that are not tied to a specific emergency request.

alter table if exists public.allocation_events
  alter column emergency_request_id drop not null;

create index if not exists idx_allocation_events_created_at
  on public.allocation_events(created_at desc);

create index if not exists idx_allocation_events_type
  on public.allocation_events(event_type);
