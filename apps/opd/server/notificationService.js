import { supabase } from "./config.js";

/**
 * Notification Service — scaffold for SMS / WhatsApp integration.
 * Inserts into opd_notifications queue table. A future worker
 * (Twilio / WhatsApp Business API) will consume pending entries.
 */

export async function queueNotification(hospitalId, tokenId, mobile, type, payload) {
  const { error } = await supabase.from("opd_notifications").insert({
    hospital_id: hospitalId,
    token_id: tokenId,
    recipient_mobile: mobile,
    notification_type: type,
    payload,
    status: "pending",
  });
  if (error) console.error("[Notification] queue error:", error.message);
  else console.log(`[Notification] queued ${type} → ${mobile}`);
}

export function buildTokenIssuedPayload(token, doctor, department, hospital, eta, position) {
  return {
    token_number: token.token_number,
    patient_name: token.patient_name,
    doctor_name: doctor.name,
    department: department.name,
    room_number: doctor.room_number,
    hospital_name: hospital.name,
    estimated_wait_minutes: eta,
    position_in_queue: position,
    message: `Your OPD token ${token.token_number} has been issued at ${hospital.name}. Doctor: ${doctor.name}, Room: ${doctor.room_number}. Estimated wait: ~${Math.round(eta)} min. Queue position: #${position}.`,
  };
}

export function buildYourTurnPayload(token, doctor) {
  return {
    token_number: token.token_number,
    patient_name: token.patient_name,
    doctor_name: doctor.name,
    room_number: doctor.room_number,
    message: `Your turn! Please proceed to Room ${doctor.room_number} for consultation with ${doctor.name}. Token: ${token.token_number}.`,
  };
}

export function buildConsultationCompletePayload(token, doctor, durationSec) {
  return {
    token_number: token.token_number,
    patient_name: token.patient_name,
    doctor_name: doctor.name,
    duration_minutes: Math.round(durationSec / 60),
    message: `Consultation complete. Token ${token.token_number} with ${doctor.name}. Duration: ${Math.round(durationSec / 60)} min. Thank you for visiting.`,
  };
}
