import { supabase } from "./config.js";

const today = () => new Date().toISOString().slice(0, 10);

/* ── Lookup ─────────────────────────────────────────────────────── */

export async function getHospitals() {
  const { data, error } = await supabase
    .from("hospitals")
    .select("id, name, code, address")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function getDepartments(hospitalId) {
  const { data, error } = await supabase
    .from("departments")
    .select("id, name, status")
    .eq("hospital_id", hospitalId)
    .eq("status", "active")
    .order("name");
  if (error) throw error;
  return data || [];
}

export async function getDoctors(hospitalId, departmentName) {
  let query = supabase
    .from("doctors")
    .select("id, full_name, specialization, department, is_available")
    .eq("hospital_id", hospitalId)
    .eq("is_active", true);
  if (departmentName) query = query.eq("department", departmentName);
  const { data, error } = await query.order("full_name");
  if (error) throw error;
  return data || [];
}

/* ── Token counter ──────────────────────────────────────────────── */

export async function getNextTokenNumber(hospitalId, departmentId) {
  const { data, error } = await supabase.rpc("next_opd_token_number", {
    p_hospital_id: hospitalId,
    p_department_id: departmentId,
    p_date: today(),
  });
  if (error) throw error;
  return data;
}

/* ── Token CRUD ─────────────────────────────────────────────────── */

const TOKEN_SELECT = "*, departments:department_id(name), doctors:doctor_id(full_name, specialization)";

export async function createToken(token) {
  const { data, error } = await supabase.from("opd_tokens").insert(token).select(TOKEN_SELECT).single();
  if (error) throw error;
  return data;
}

export async function getTokenById(tokenId) {
  const { data, error } = await supabase.from("opd_tokens").select(TOKEN_SELECT).eq("id", tokenId).single();
  if (error) throw error;
  return data;
}

export async function updateToken(tokenId, updates) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", tokenId)
    .select(TOKEN_SELECT)
    .single();
  if (error) throw error;
  return data;
}

export async function getTokensByHospital(hospitalId, filters = {}) {
  let query = supabase
    .from("opd_tokens")
    .select(TOKEN_SELECT)
    .eq("hospital_id", hospitalId)
    .eq("counter_date", filters.date || today());

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.departmentId) query = query.eq("department_id", filters.departmentId);
  if (filters.doctorId) query = query.eq("doctor_id", filters.doctorId);

  const { data, error } = await query.order("token_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

/* ── Display (public — no auth) ─────────────────────────────────── */

export async function getDisplayData(hospitalId) {
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("id, token_number, patient_name, status, priority, department_id, doctor_id, issued_at, called_at, departments:department_id(name), doctors:doctor_id(full_name)")
    .eq("hospital_id", hospitalId)
    .eq("counter_date", today())
    .in("status", ["waiting", "in_consultation"])
    .order("token_number", { ascending: true });
  if (error) throw error;
  return data || [];
}

/* ── Stats ──────────────────────────────────────────────────────── */

export async function getQueueStats(hospitalId, date) {
  const d = date || today();
  const { data, error } = await supabase
    .from("opd_tokens")
    .select("status, consultation_duration_seconds, department_id, issued_at")
    .eq("hospital_id", hospitalId)
    .eq("counter_date", d);
  if (error) throw error;

  const tokens = data || [];
  const total = tokens.length;
  const waiting = tokens.filter((t) => t.status === "waiting").length;
  const inConsultation = tokens.filter((t) => t.status === "in_consultation").length;
  const completed = tokens.filter((t) => t.status === "completed").length;
  const skipped = tokens.filter((t) => t.status === "skipped").length;
  const cancelled = tokens.filter((t) => t.status === "cancelled").length;

  const durations = tokens.filter((t) => t.consultation_duration_seconds > 0).map((t) => t.consultation_duration_seconds);
  const avgConsultationSeconds = durations.length > 0
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : 300;

  // Hourly arrivals (for chart)
  const hourlyArrivals = Array(24).fill(0);
  for (const t of tokens) {
    const h = new Date(t.issued_at).getHours();
    hourlyArrivals[h]++;
  }

  // Department distribution
  const deptCounts = {};
  for (const t of tokens) {
    deptCounts[t.department_id] = (deptCounts[t.department_id] || 0) + 1;
  }

  return { total, waiting, inConsultation, completed, skipped, cancelled, avgConsultationSeconds, hourlyArrivals, deptCounts };
}
