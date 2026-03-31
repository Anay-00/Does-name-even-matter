import * as repo from "./opdRepository.js";
import { emitOpdEvent } from "./eventBus.js";

/* ── Issue a new token ──────────────────────────────────────────── */
export async function issueToken({ hospitalId, departmentId, doctorId, patientName, patientAge, patientGender, patientPhone, priority }) {
  if (!departmentId || !patientName) throw new Error("departmentId and patientName are required");

  const tokenNumber = await repo.getNextTokenNumber(hospitalId, departmentId);

  const token = await repo.createToken({
    hospital_id: hospitalId,
    department_id: departmentId,
    doctor_id: doctorId || null,
    token_number: tokenNumber,
    patient_name: patientName,
    patient_age: patientAge || null,
    patient_gender: patientGender || null,
    patient_phone: patientPhone || null,
    priority: priority || "normal",
    status: "waiting",
    counter_date: new Date().toISOString().slice(0, 10),
  });

  emitOpdEvent(hospitalId, { type: "token_issued", token });
  return token;
}

/* ── Call a specific token ──────────────────────────────────────── */
export async function callToken(tokenId, doctorId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (token.status !== "waiting") throw new Error(`Cannot call token with status: ${token.status}`);

  const updated = await repo.updateToken(tokenId, {
    status: "in_consultation",
    doctor_id: doctorId || token.doctor_id,
    called_at: new Date().toISOString(),
  });

  emitOpdEvent(token.hospital_id, { type: "token_called", token: updated });
  return updated;
}

/* ── Call next waiting token in department ───────────────────────── */
export async function callNextToken(hospitalId, departmentId, doctorId) {
  const tokens = await repo.getTokensByHospital(hospitalId, { status: "waiting", departmentId });

  // Priority tokens first, then by token_number
  const sorted = tokens.sort((a, b) => {
    if (a.priority === "priority" && b.priority !== "priority") return -1;
    if (b.priority === "priority" && a.priority !== "priority") return 1;
    return a.token_number - b.token_number;
  });

  const next = sorted[0];
  if (!next) return null;

  return callToken(next.id, doctorId);
}

/* ── Complete consultation ──────────────────────────────────────── */
export async function completeToken(tokenId, notes) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (token.status !== "in_consultation") throw new Error(`Cannot complete token with status: ${token.status}`);

  const calledAt = token.called_at ? new Date(token.called_at) : new Date();
  const duration = Math.round((Date.now() - calledAt.getTime()) / 1000);

  const updated = await repo.updateToken(tokenId, {
    status: "completed",
    completed_at: new Date().toISOString(),
    consultation_duration_seconds: duration,
    ...(notes ? { notes } : {}),
  });

  emitOpdEvent(token.hospital_id, { type: "token_completed", token: updated });
  return updated;
}

/* ── Skip ───────────────────────────────────────────────────────── */
export async function skipToken(tokenId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (!["waiting", "in_consultation"].includes(token.status)) {
    throw new Error(`Cannot skip token with status: ${token.status}`);
  }

  const updated = await repo.updateToken(tokenId, { status: "skipped" });
  emitOpdEvent(token.hospital_id, { type: "token_skipped", token: updated });
  return updated;
}

/* ── Cancel ─────────────────────────────────────────────────────── */
export async function cancelToken(tokenId) {
  const token = await repo.getTokenById(tokenId);
  if (!token) throw new Error("Token not found");
  if (["completed", "cancelled"].includes(token.status)) {
    throw new Error(`Cannot cancel token with status: ${token.status}`);
  }

  const updated = await repo.updateToken(tokenId, { status: "cancelled" });
  emitOpdEvent(token.hospital_id, { type: "token_cancelled", token: updated });
  return updated;
}
