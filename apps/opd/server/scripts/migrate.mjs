import "dotenv/config";
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Parse individual SQL statements from migration file
const sqlFile = readFileSync(new URL("../../../../backend/supabase/migrations/20260318_000001_opd_queue.sql", import.meta.url), "utf8");

// Split by semicolons at end of statements (but not inside function bodies)
// Simpler approach: execute key DDL parts individually

const statements = [
  // 1. Counter table
  `create table if not exists public.opd_counters (
    id uuid primary key default uuid_generate_v4(),
    hospital_id uuid not null references public.hospitals(id),
    department_id uuid not null references public.departments(id),
    counter_date date not null default current_date,
    last_token_number int not null default 0,
    created_at timestamptz not null default now(),
    unique(hospital_id, department_id, counter_date)
  )`,
  // 2. Tokens table
  `create table if not exists public.opd_tokens (
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
  )`,
  // 3. Indexes
  `create index if not exists idx_opd_tokens_hospital_date on public.opd_tokens(hospital_id, counter_date)`,
  `create index if not exists idx_opd_tokens_dept_status on public.opd_tokens(department_id, status)`,
  `create index if not exists idx_opd_tokens_status_date on public.opd_tokens(status, counter_date)`,
  // 4. Atomic counter function
  `create or replace function public.next_opd_token_number(
    p_hospital_id uuid,
    p_department_id uuid,
    p_date date default current_date
  ) returns int as $BODY$
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
  $BODY$ language plpgsql`,
  // 5. Disable RLS for OPD tables (using service_role key)
  `alter table public.opd_counters enable row level security`,
  `alter table public.opd_tokens enable row level security`,
  `create policy "service_role_opd_counters" on public.opd_counters for all using (true) with check (true)`,
  `create policy "service_role_opd_tokens" on public.opd_tokens for all using (true) with check (true)`,
];

console.log("Applying OPD migration...");

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i].trim();
  const label = stmt.slice(0, 60).replace(/\n/g, " ");
  try {
    const { error } = await sb.rpc("exec_sql", { sql_query: stmt });
    if (error) {
      // exec_sql might not exist; try the schema API
      throw error;
    }
    console.log(`  [${i + 1}/${statements.length}] OK: ${label}...`);
  } catch {
    console.log(`  [${i + 1}/${statements.length}] SKIP (run manually): ${label}...`);
  }
}

// Verify tables exist
const { data, error } = await sb.from("opd_tokens").select("id").limit(1);
if (error) {
  console.log("\n⚠ Tables not created yet. Please run the migration SQL manually:");
  console.log("  File: backend/supabase/migrations/20260318_000001_opd_queue.sql");
  console.log("  Paste into: Supabase Dashboard → SQL Editor");
} else {
  console.log("\n✅ Migration verified — opd_tokens table exists");
}
