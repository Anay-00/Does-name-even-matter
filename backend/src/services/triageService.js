const TYPE_PRIORITY = {
  cardiac_arrest: "critical",
  stroke_alert: "critical",
  trauma_injury: "medium",
  respiratory_distress: "medium",
  fever_illness: "low",
  minor_injury: "low"
};

const criticalSymptoms = new Set(["cardiac_arrest", "stroke_alert", "unconsciousness", "severe_bleeding"]);
const moderateSymptoms = new Set(["trauma_injury", "respiratory_distress", "fracture", "breathing_difficulty"]);

export function derivePriority(symptoms = [], emergencyType = "other") {
  if (TYPE_PRIORITY[emergencyType]) {
    return TYPE_PRIORITY[emergencyType];
  }

  const normalized = symptoms.map((symptom) => String(symptom).toLowerCase());
  if (normalized.some((symptom) => criticalSymptoms.has(symptom))) {
    return "critical";
  }
  if (normalized.some((symptom) => moderateSymptoms.has(symptom))) {
    return "medium";
  }
  return "low";
}

export function enforcePriorityFloor(derivedPriority, requestedPriority) {
  const order = ["low", "medium", "high", "critical"];
  const floorIndex = order.indexOf(derivedPriority);
  const requestIndex = order.indexOf(requestedPriority || derivedPriority);
  return order[Math.max(floorIndex, requestIndex)];
}
