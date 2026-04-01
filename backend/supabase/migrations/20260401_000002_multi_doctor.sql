-- ============================================================
-- OPD v2.1 — Multi-Doctor Support
-- Removes the 1-doctor-per-department constraint
-- Adds index for efficient doctor lookups by department
-- ============================================================

-- Drop the UNIQUE constraint on department_id (allows multiple doctors per dept)
ALTER TABLE public.opd_doctors DROP CONSTRAINT IF EXISTS opd_doctors_department_id_key;

-- Add index for looking up doctors by department efficiently
CREATE INDEX IF NOT EXISTS idx_opd_doctors_department
  ON public.opd_doctors(department_id, is_active);
