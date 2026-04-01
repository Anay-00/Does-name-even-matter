import { supabase } from "./config.js";

const today = () => new Date().toISOString().slice(0, 10);

/* ── Departments ────────────────────────────────────────────────── */

export async function getDepartmentsByHospital(hospitalId) {
  const { data, error } = await supabase
    .from("opd_departments")
    .select("id, code, name, symptom_label, symptom_description, is_active")
    .eq("hospital_id", hospitalId)
    .eq("is_active", true)
    .order("code");
  if (error) throw error;
  return data || [];
}

export async function getDepartmentByCode(hospitalId, code) {
  const { data, error } = await supabase
    .from("opd_departments")
    .select("id, code, name, symptom_label, symptom_description")
    .eq("hospital_id", hospitalId)
    .eq("code", code)
    .single();
  if (error) throw error;
  return data;
}

/* ── Doctors ────────────────────────────────────────────────────── */

export async function getDoctorsByHospital(hospitalId) {
  const { data, error } = await supabase
    .from("opd_doctors")
    .select("id, hospital_id, department_id, name, qualification, room_number, avg_consultation_minutes, total_consultations, is_active")
    .eq("hospital_id", hospitalId)
    .eq("is_active", true)
    .order("room_number");
  if (error) throw error;
  return data || [];
}

export async function getDoctorsByDepartment(departmentId) {
  const { data, error } = await supabase
    .from("opd_doctors")
    .select("id, hospital_id, department_id, name, qualification, room_number, avg_consultation_minutes, total_consultations")
    .eq("department_id", departmentId)
    .eq("is_active", true)
    .order("room_number");
  if (error) throw error;
  return data || [];
}

export async function getDoctorById(doctorId) {
  const { data, error } = await supabase
    .from("opd_doctors")
    .select("id, hospital_id, department_id, name, qualification, room_number, avg_consultation_minutes, total_consultations")
    .eq("id", doctorId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDoctorAvg(doctorId, avgMinutes, totalConsultations) {
  const { error } = await supabase
    .from("opd_doctors")
    .update({ avg_consultation_minutes: avgMinutes, total_consultations: totalConsultations })
    .eq("id", doctorId);
  if (error) throw error;
}

/* ── Token Number (atomic via PL/pgSQL) ─────────────────────────── */

export async function getNextTokenNumber(hospitalId, deptCode) {
  const { data, error } = await supabase.rpc("next_opd_token_number", {
    p_hospital_id: hospitalId,
    p_dept_code: deptCode,
  });
  if (error) throw error;
  return data; // e.g. "CARD-001"
}

/* ── Token CRUD ─────────────────────────────────────────────────── */

export async function insertToken(token) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .insert(token)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getTokenById(tokenId) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("*")
    .eq("id", tokenId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateToken(tokenId, fields) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .update(fields)
    .eq("id", tokenId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Ordered waiting queue for a doctor. Priority first, then FIFO.
 */
export async function getWaitingQueue(doctorId, date) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("token_date", date || today())
    .eq("status", "waiting")
    .order("priority", { ascending: false }) // 'priority' sorts after 'normal'
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getCurrentConsultation(doctorId, date) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("token_date", date || today())
    .eq("status", "in_consultation")
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getDoctorTokensToday(doctorId, date) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("*")
    .eq("doctor_id", doctorId)
    .eq("token_date", date || today())
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getHospitalTokensToday(hospitalId, date) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("*")
    .eq("hospital_id", hospitalId)
    .eq("token_date", date || today())
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getRecentConsultationDurations(doctorId, limit = 20) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("consultation_duration_seconds")
    .eq("doctor_id", doctorId)
    .eq("status", "completed")
    .not("consultation_duration_seconds", "is", null)
    .order("consultation_ended_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getDailySummary(hospitalId, date) {
  const d = date || today();
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("status, doctor_id, department_id, consultation_duration_seconds, symptom_category, priority")
    .eq("hospital_id", hospitalId)
    .eq("token_date", d);
  if (error) throw error;
  return data || [];
}

export async function cancelPendingTokens(hospitalId, date) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("hospital_id", hospitalId)
    .eq("token_date", date)
    .eq("status", "waiting")
    .select();
  if (error) throw error;
  return data || [];
}

/* ── Hospitals ──────────────────────────────────────────────────── */

export async function getHospitalById(hospitalId) {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, code, name")
    .eq("id", hospitalId)
    .single();
  if (error) throw error;
  return data;
}

export async function getActiveHospitals() {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, code, name")
    .eq("is_active", true)
    .order("code");
  if (error) throw error;
  return data || [];
}
