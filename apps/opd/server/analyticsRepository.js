import { supabase } from "./config.js";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Fetch all OPD tokens for a given date.
 * If hospitalId is provided, filter by hospital; otherwise return all.
 */
export async function getTokensForDate(date, hospitalId) {
  const d = date || today();
  let query = supabase
    .from("opd_tokens")
    .select("*")
    .eq("token_date", d)
    .order("created_at", { ascending: true });

  if (hospitalId) {
    query = query.eq("hospital_id", hospitalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch all active doctors, optionally filtered by hospital.
 */
export async function getDoctors(hospitalId) {
  let query = supabase
    .from("opd_doctors")
    .select("id, hospital_id, department_id, name, qualification, room_number, avg_consultation_minutes, total_consultations")
    .eq("is_active", true)
    .order("name");

  if (hospitalId) {
    query = query.eq("hospital_id", hospitalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch all active departments, optionally filtered by hospital.
 */
export async function getDepartments(hospitalId) {
  let query = supabase
    .from("opd_departments")
    .select("id, code, name, symptom_label")
    .eq("is_active", true)
    .order("code");

  if (hospitalId) {
    query = query.eq("hospital_id", hospitalId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
