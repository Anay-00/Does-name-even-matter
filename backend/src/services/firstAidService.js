const SAFE_GUIDANCE_BY_TYPE = {
  cardiac_arrest: [
    "Keep the patient at rest in a half-sitting position and avoid unnecessary movement.",
    "Loosen tight clothing and ensure fresh air around the patient.",
    "If the patient is conscious, monitor breathing and pulse continuously until medical team arrives.",
    "Do not give food or unknown medicines unless advised by a clinician."
  ],
  stroke_alert: [
    "Note the exact time symptoms started and keep the patient still.",
    "Lay the patient on one side if vomiting risk is present.",
    "Do not give food, drinks, or oral medicines.",
    "Observe speech, facial droop, and limb weakness continuously."
  ],
  trauma_injury: [
    "Keep the patient still and avoid moving injured limbs.",
    "Apply gentle pressure on active bleeding using a clean cloth.",
    "If fracture is suspected, immobilize the area in the position found.",
    "Do not attempt to push protruding bones back in place."
  ],
  respiratory_distress: [
    "Help the patient sit upright and keep airway clear.",
    "Encourage slow and steady breathing; avoid crowding around the patient.",
    "Remove smoke, dust, or strong smells from the surroundings.",
    "Do not force water if breathing is labored."
  ],
  fever_illness: [
    "Keep patient hydrated with small, frequent fluids if conscious.",
    "Loosen heavy clothing and keep room ventilated.",
    "Monitor temperature and watch for sudden confusion or drowsiness.",
    "Avoid self-medication if allergy history is unclear."
  ],
  minor_injury: [
    "Clean visible wounds with clean water if available.",
    "Use light pressure to control minor bleeding.",
    "Avoid putting weight on painful joints or muscles.",
    "Monitor for swelling, dizziness, or worsening pain."
  ],
  other: [
    "Keep the patient calm, at rest, and in a safe position.",
    "Observe breathing, consciousness, and any rapid deterioration.",
    "Avoid giving unknown medications before clinical assessment.",
    "Share any known allergies and medical history with the response team."
  ]
};

export function buildSafeImmediateGuidance({ emergencyType, note }) {
  const normalizedType = typeof emergencyType === "string" ? emergencyType.toLowerCase() : "other";
  const base = SAFE_GUIDANCE_BY_TYPE[normalizedType] || SAFE_GUIDANCE_BY_TYPE.other;

  const caution = "These measures are supportive first aid only and not a medical diagnosis.";
  const noteLine = note ? `Reported details considered: ${note.slice(0, 240)}.` : "Reported details considered from uploaded media evidence.";

  return [noteLine, ...base, caution].join(" ");
}
