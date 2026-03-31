alter table if exists public.emergency_requests
  add column if not exists assigned_doctor_id uuid references public.doctors(id);

create table if not exists public.emergency_request_media (
  id uuid primary key default uuid_generate_v4(),
  emergency_request_id uuid not null references public.emergency_requests(id) on delete cascade,
  uploaded_by_role text not null,
  uploaded_by_hospital_id uuid references public.hospitals(id),
  media_type text not null check (media_type in ('audio', 'video')),
  mime_type text not null,
  file_path text not null,
  original_file_name text,
  note text,
  ai_guidance text,
  created_at timestamptz not null default now()
);

create index if not exists idx_emergency_request_media_request on public.emergency_request_media(emergency_request_id, created_at desc);
