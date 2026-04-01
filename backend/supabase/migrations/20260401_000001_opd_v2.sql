-- ============================================================
-- OPD Queue Management System v2 — Full Rebuild
-- Drops old OPD tables, creates self-contained OPD schema
-- Tables: opd_departments, opd_doctors, opd_counters, opd_tokens, opd_notifications
-- Function: next_opd_token_number (returns DEPT-NNN format)
-- ============================================================

-- ── Drop old OPD objects ────────────────────────────────────────
DROP TABLE IF EXISTS public.opd_tokens CASCADE;
DROP TABLE IF EXISTS public.opd_counters CASCADE;
DROP FUNCTION IF EXISTS public.next_opd_token_number CASCADE;

-- ── OPD Departments (per hospital, 5 specialties each) ──────────
CREATE TABLE IF NOT EXISTS public.opd_departments (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id  uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  code         text NOT NULL,            -- CARD, ORTH, NEUR, PEDI, GENM
  name         text NOT NULL,            -- Cardiology, Orthopedics, etc.
  symptom_label       text NOT NULL,     -- what patient sees at reception
  symptom_description text,              -- longer description
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, code)
);

-- ── OPD Doctors (1 per department per hospital) ─────────────────
CREATE TABLE IF NOT EXISTS public.opd_doctors (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id     uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id   uuid NOT NULL REFERENCES public.opd_departments(id) ON DELETE CASCADE,
  name            text NOT NULL,
  qualification   text,
  room_number     text NOT NULL,
  avg_consultation_minutes numeric(5,2) NOT NULL DEFAULT 10.00,
  total_consultations      integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id)                  -- exactly 1 doctor per dept
);

CREATE INDEX IF NOT EXISTS idx_opd_doctors_hospital
  ON public.opd_doctors(hospital_id);

-- ── OPD Counters (daily token number per hospital + dept code) ──
CREATE TABLE IF NOT EXISTS public.opd_counters (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id     uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_code text NOT NULL,
  counter_date    date NOT NULL DEFAULT CURRENT_DATE,
  last_number     integer NOT NULL DEFAULT 0,
  UNIQUE(hospital_id, department_code, counter_date)
);

-- ── OPD Tokens ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.opd_tokens (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id     uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  department_id   uuid NOT NULL REFERENCES public.opd_departments(id),
  doctor_id       uuid NOT NULL REFERENCES public.opd_doctors(id),

  -- Token identity
  token_number    text NOT NULL,          -- CARD-001
  token_date      date NOT NULL DEFAULT CURRENT_DATE,

  -- Patient info
  patient_name    text NOT NULL,
  patient_mobile  text NOT NULL,
  symptom_category text NOT NULL,         -- the code: CARD, ORTH, NEUR, PEDI, GENM

  -- Priority
  priority        text NOT NULL DEFAULT 'normal'
                    CHECK (priority IN ('normal', 'priority')),
  priority_reason text,                   -- elderly, pregnant, critical

  -- Status
  status          text NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting', 'in_consultation', 'completed', 'cancelled')),

  -- Room
  room_number     text NOT NULL,

  -- ETA snapshot at issue time
  estimated_wait_minutes numeric(5,1),

  -- Timestamps
  created_at              timestamptz NOT NULL DEFAULT now(),
  called_at               timestamptz,        -- when "your turn" was triggered
  consultation_started_at timestamptz,        -- doctor clicked "Patient Entered"
  consultation_ended_at   timestamptz,        -- doctor clicked "Done"
  consultation_duration_seconds integer,
  cancelled_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_opd_tokens_hospital_date
  ON public.opd_tokens(hospital_id, token_date);

CREATE INDEX IF NOT EXISTS idx_opd_tokens_doctor_status
  ON public.opd_tokens(doctor_id, status)
  WHERE status IN ('waiting', 'in_consultation');

CREATE INDEX IF NOT EXISTS idx_opd_tokens_dept_status
  ON public.opd_tokens(department_id, status, token_date);

CREATE INDEX IF NOT EXISTS idx_opd_tokens_priority_created
  ON public.opd_tokens(doctor_id, priority DESC, created_at ASC)
  WHERE status = 'waiting';

-- ── Notification Queue (scaffold for SMS/WhatsApp) ──────────────
CREATE TABLE IF NOT EXISTS public.opd_notifications (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  hospital_id     uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  token_id        uuid REFERENCES public.opd_tokens(id) ON DELETE SET NULL,
  recipient_mobile text NOT NULL,
  notification_type text NOT NULL,        -- token_issued, your_turn, consultation_complete
  payload         jsonb NOT NULL,         -- full details: token, doctor, room, ETA, message
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'sent', 'failed')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_opd_notifications_status
  ON public.opd_notifications(status)
  WHERE status = 'pending';

-- ── Atomic token number generator (returns DEPT-NNN) ────────────
CREATE OR REPLACE FUNCTION public.next_opd_token_number(
  p_hospital_id uuid,
  p_dept_code   text
) RETURNS text AS $$
DECLARE
  v_num integer;
BEGIN
  INSERT INTO public.opd_counters (hospital_id, department_code, counter_date, last_number)
  VALUES (p_hospital_id, p_dept_code, CURRENT_DATE, 1)
  ON CONFLICT (hospital_id, department_code, counter_date)
  DO UPDATE SET last_number = opd_counters.last_number + 1
  RETURNING last_number INTO v_num;

  RETURN p_dept_code || '-' || lpad(v_num::text, 3, '0');
END;
$$ LANGUAGE plpgsql;
