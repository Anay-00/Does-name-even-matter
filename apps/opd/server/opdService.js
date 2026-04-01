import * as repo from "./opdRepository.js";
import * as notify from "./notificationService.js";

/* ── Symptom → Department mapping ───────────────────────────────── */
const SYMPTOM_MAP = {
  CARD: { code: "CARD", label: "Chest Pain / Heart Issues" },
  ORTH: { code: "ORTH", label: "Bone / Joint / Injury" },
  NEUR: { code: "NEUR", label: "Head / Neurological" },
  PEDI: { code: "PEDI", label: "Child / Infant Care" },
  GENM: { code: "GENM", label: "Other / General" },
};

export function getSymptomOptions() {
  return Object.values(SYMPTOM_MAP);
}

/* ── ETA calculation (rolling avg of last 20 consultations) ─────── */
const DEFAULT_AVG_MINUTES = 10;

async function calculateEta(doctorId, positionInQueue) {
  const recent = await repo.getRecentConsultationDurations(doctorId, 20);
  let avg = DEFAULT_AVG_MINUTES;
  if (recent.length > 0) {
    const totalSec = recent.reduce((s, r) => s + r.consultation_duration_seconds, 0);
    avg = totalSec / recent.length / 60; // convert to minutes
  }
  return Math.round(avg * positionInQueue * 10) / 10; // 1 decimal
}

/** Get a doctor's avg consultation minutes from recent data or stored value */
async function getDoctorAvgMinutes(doctor) {
  const recent = await repo.getRecentConsultationDurations(doctor.id, 20);
  if (recent.length > 0) {
    const totalSec = recent.reduce((s, r) => s + r.consultation_duration_seconds, 0);
    return totalSec / recent.length / 60;
  }
  return doctor.avg_consultation_minutes || DEFAULT_AVG_MINUTES;
}

/**
 * Smart doctor assignment for a department:
 * 1. Find all active doctors in the department
 * 2. For each, check: is there a current consultation? What's the waiting queue size?
 * 3. Pick a free doctor (no current consultation & smallest queue) first
 * 4. If all busy, pick the one with the lowest total ETA (queue × avg time)
 */
async function pickBestDoctor(departmentId) {
  const doctors = await repo.getDoctorsByDepartment(departmentId);
  if (doctors.length === 0) return null;
  if (doctors.length === 1) return doctors[0]; // fast path

  // Gather load info for each doctor in parallel
  const loads = await Promise.all(
    doctors.map(async (doc) => {
      const [current, queue] = await Promise.all([
        repo.getCurrentConsultation(doc.id),
        repo.getWaitingQueue(doc.id),
      ]);
      const avgMin = await getDoctorAvgMinutes(doc);
      const isBusy = !!current;
      const waitingCount = queue.length;
      // ETA for the _next_ patient assigned to this doctor
      const etaForNext = avgMin * (waitingCount + (isBusy ? 1 : 0));
      return { doc, isBusy, waitingCount, avgMin, etaForNext };
    })
  );

  // Sort: prefer free doctors, then by lowest ETA for next patient
  loads.sort((a, b) => {
    // Free doctors first
    if (!a.isBusy && b.isBusy) return -1;
    if (a.isBusy && !b.isBusy) return 1;
    // Among same busy-status, pick lowest ETA
    if (a.etaForNext !== b.etaForNext) return a.etaForNext - b.etaForNext;
    // Tie-break: fewer total waiting
    return a.waitingCount - b.waitingCount;
  });

  return loads[0].doc;
}

/* ── Recalculate & update rolling avg after a consultation ──────── */
async function refreshDoctorAvg(doctorId) {
  const recent = await repo.getRecentConsultationDurations(doctorId, 20);
  if (recent.length === 0) return;
  const totalSec = recent.reduce((s, r) => s + r.consultation_duration_seconds, 0);
  const avgMin = Math.round((totalSec / recent.length / 60) * 100) / 100;
  const doctor = await repo.getDoctorById(doctorId);
  await repo.updateDoctorAvg(doctorId, avgMin, (doctor?.total_consultations || 0) + 1);
}

/* ── Issue a new token ──────────────────────────────────────────── */
export async function issueToken({ hospitalId, patientName, patientMobile, symptomCategory, priorityReason }) {
  if (!patientName || !patientMobile || !symptomCategory)
    throw new Error("patientName, patientMobile, and symptomCategory are required");

  // 1. Resolve department from symptom
  const dept = await repo.getDepartmentByCode(hospitalId, symptomCategory);
  if (!dept) throw new Error(`No department found for symptom code: ${symptomCategory}`);

  // 2. Smart-pick the best available doctor
  const doctor = await pickBestDoctor(dept.id);
  if (!doctor) throw new Error(`No doctor available for department: ${dept.name}`);

  // 3. Determine priority
  let priority = "normal";
  if (priorityReason) priority = "priority"; // elderly, pregnant, critical
  if (symptomCategory === "CARD") { priority = "priority"; } // auto-flag cardiac

  // 4. Get atomic token number (CARD-001)
  const tokenNumber = await repo.getNextTokenNumber(hospitalId, dept.code);

  // 5. Calculate queue position & ETA for this specific doctor
  const waitingQueue = await repo.getWaitingQueue(doctor.id);
  const currentConsultation = await repo.getCurrentConsultation(doctor.id);
  const positionInQueue = waitingQueue.length + 1 + (currentConsultation ? 1 : 0);
  const eta = await calculateEta(doctor.id, positionInQueue - (currentConsultation ? 0 : 1));

  // 6. Insert token
  const token = await repo.insertToken({
    hospital_id: hospitalId,
    department_id: dept.id,
    doctor_id: doctor.id,
    token_number: tokenNumber,
    token_date: new Date().toISOString().slice(0, 10),
    patient_name: patientName,
    patient_mobile: patientMobile,
    symptom_category: symptomCategory,
    priority,
    priority_reason: priorityReason || (symptomCategory === "CARD" ? "critical" : null),
    status: "waiting",
    room_number: doctor.room_number,
    estimated_wait_minutes: eta,
  });

  // 7. Queue notification (SMS/WhatsApp scaffold)
  const hospital = await repo.getHospitalById(hospitalId);
  const notifPayload = notify.buildTokenIssuedPayload(token, doctor, dept, hospital, eta, positionInQueue);
  await notify.queueNotification(hospitalId, token.id, patientMobile, "token_issued", notifPayload);

  return {
    token,
    doctor: { id: doctor.id, name: doctor.name, room_number: doctor.room_number, qualification: doctor.qualification },
    department: { id: dept.id, code: dept.code, name: dept.name },
    eta,
    positionInQueue,
    notificationPayload: notifPayload,
  };
}

/* ── Doctor: mark patient has entered (start consultation) ──────── */
export async function startConsultation(tokenId, doctorId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (token.status !== "waiting") throw new Error(`Cannot start consultation for token with status: ${token.status}`);
  if (token.doctor_id !== doctorId) throw new Error("Token is not assigned to this doctor");

  // Ensure no other consultation is in progress for this doctor
  const current = await repo.getCurrentConsultation(doctorId);
  if (current) throw new Error(`Another consultation is already in progress (${current.token_number})`);

  const now = new Date().toISOString();
  const updated = await repo.updateToken(tokenId, {
    status: "in_consultation",
    called_at: now,
    consultation_started_at: now,
  });

  return updated;
}

/* ── Doctor: mark consultation done ─────────────────────────────── */
export async function completeConsultation(tokenId, doctorId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (token.status !== "in_consultation") throw new Error(`Cannot complete token with status: ${token.status}`);
  if (token.doctor_id !== doctorId) throw new Error("Token is not assigned to this doctor");

  const startedAt = token.consultation_started_at ? new Date(token.consultation_started_at) : new Date(token.called_at);
  const durationSec = Math.round((Date.now() - startedAt.getTime()) / 1000);
  const now = new Date().toISOString();

  const updated = await repo.updateToken(tokenId, {
    status: "completed",
    consultation_ended_at: now,
    consultation_duration_seconds: durationSec,
  });

  // Update doctor's rolling average
  await refreshDoctorAvg(doctorId);

  // Queue "consultation complete" notification
  const doctor = await repo.getDoctorById(doctorId);
  const completePayload = notify.buildConsultationCompletePayload(updated, doctor, durationSec);
  await notify.queueNotification(token.hospital_id, token.id, token.patient_mobile, "consultation_complete", completePayload);

  // Check if there's a next patient and queue "your turn" notification
  const nextQueue = await repo.getWaitingQueue(doctorId);
  let nextPatient = null;
  if (nextQueue.length > 0) {
    nextPatient = nextQueue[0];
    const turnPayload = notify.buildYourTurnPayload(nextPatient, doctor);
    await notify.queueNotification(token.hospital_id, nextPatient.id, nextPatient.patient_mobile, "your_turn", turnPayload);
  }

  return { completed: updated, nextPatient };
}

/* ── Cancel a token ─────────────────────────────────────────────── */
export async function cancelToken(tokenId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (["completed", "cancelled"].includes(token.status))
    throw new Error(`Cannot cancel token with status: ${token.status}`);

  const updated = await repo.updateToken(tokenId, {
    status: "cancelled",
    cancelled_at: new Date().toISOString(),
  });
  return updated;
}

/* ── Get doctor's full panel state ──────────────────────────────── */
export async function getDoctorPanelState(doctorId) {
  const [current, queue, allToday] = await Promise.all([
    repo.getCurrentConsultation(doctorId),
    repo.getWaitingQueue(doctorId),
    repo.getDoctorTokensToday(doctorId),
  ]);

  const completed = allToday.filter((t) => t.status === "completed");
  const cancelled = allToday.filter((t) => t.status === "cancelled");

  // Calculate live ETAs for waiting patients
  const doctor = await repo.getDoctorById(doctorId);
  const avgMin = doctor?.avg_consultation_minutes || DEFAULT_AVG_MINUTES;
  const queueWithEta = queue.map((t, i) => ({
    ...t,
    live_eta_minutes: Math.round(avgMin * (i + 1 + (current ? 1 : 0)) * 10) / 10,
    position: i + 1,
  }));

  return {
    currentPatient: current,
    waitingQueue: queueWithEta,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    totalToday: allToday.length,
    avgConsultationMinutes: avgMin,
  };
}

/* ── Get reception panel state ──────────────────────────────────── */
export async function getReceptionState(hospitalId) {
  const [depts, doctors, tokens, summary] = await Promise.all([
    repo.getDepartmentsByHospital(hospitalId),
    repo.getDoctorsByHospital(hospitalId),
    repo.getHospitalTokensToday(hospitalId),
    repo.getDailySummary(hospitalId),
  ]);

  const waiting = tokens.filter((t) => t.status === "waiting").length;
  const inConsultation = tokens.filter((t) => t.status === "in_consultation").length;
  const completed = tokens.filter((t) => t.status === "completed").length;
  const cancelled = tokens.filter((t) => t.status === "cancelled").length;

  return {
    departments: depts,
    doctors,
    tokens,
    stats: { total: tokens.length, waiting, inConsultation, completed, cancelled },
  };
}

/* ── Patient portal: live token status + queue position ─────────── */
export async function getPatientTokenStatus(tokenId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");

  const doctor = await repo.getDoctorById(token.doctor_id);

  let positionInQueue = null;
  let eta = null;

  if (token.status === "waiting") {
    const [waitingQueue, current] = await Promise.all([
      repo.getWaitingQueue(token.doctor_id),
      repo.getCurrentConsultation(token.doctor_id),
    ]);
    const idx = waitingQueue.findIndex((t) => t.id === tokenId);
    if (idx !== -1) {
      positionInQueue = idx + 1;
      const peopleAhead = idx + (current ? 1 : 0);
      eta = await calculateEta(token.doctor_id, peopleAhead);
    }
  }

  return {
    token: {
      id: token.id,
      token_number: token.token_number,
      status: token.status,
      patient_name: token.patient_name,
      symptom_category: token.symptom_category,
      estimated_wait_minutes: token.estimated_wait_minutes,
      created_at: token.created_at,
    },
    doctor: doctor
      ? { name: doctor.name, room_number: doctor.room_number, qualification: doctor.qualification }
      : null,
    positionInQueue,
    eta,
  };
}

/* ── Get display board state ────────────────────────────────────── */
export async function getDisplayState(hospitalId) {
  const [tokens, depts, doctors] = await Promise.all([
    repo.getHospitalTokensToday(hospitalId),
    repo.getDepartmentsByHospital(hospitalId),
    repo.getDoctorsByHospital(hospitalId),
  ]);

  const deptMap = Object.fromEntries(depts.map((d) => [d.id, d]));
  const docMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

  const enriched = tokens.map((t) => ({
    ...t,
    department_name: deptMap[t.department_id]?.name,
    department_code: deptMap[t.department_id]?.code,
    doctor_name: docMap[t.doctor_id]?.name,
    doctor_room: docMap[t.doctor_id]?.room_number,
    doctor_avg_minutes: docMap[t.doctor_id]?.avg_consultation_minutes,
  }));

  const active = enriched.filter((t) => ["waiting", "in_consultation"].includes(t.status));
  const nowServing = enriched.filter((t) => t.status === "in_consultation");

  return {
    departments: depts,
    doctors,
    active,
    nowServing,
    totalToday: tokens.length,
    completedToday: tokens.filter((t) => t.status === "completed").length,
  };
}
