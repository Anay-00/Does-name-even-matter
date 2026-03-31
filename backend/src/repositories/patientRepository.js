import crypto from "crypto";

const patients = new Map();
const requests = new Map();
const notifications = new Map();

function nowIso() {
  return new Date().toISOString();
}

function sanitizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function pushNotification(patientId, title, message, severity = "info") {
  const list = notifications.get(patientId) || [];
  list.unshift({
    id: `notif_${crypto.randomUUID()}`,
    title,
    message,
    severity,
    createdAt: nowIso(),
    read: false
  });
  notifications.set(patientId, list.slice(0, 50));
}

export function createPatientAuth({ fullName, phoneNumber, email, password }) {
  const normalizedPhone = sanitizePhone(phoneNumber);
  const normalizedEmail = String(email || "").trim().toLowerCase();

  for (const patient of patients.values()) {
    if (patient.phoneNumber === normalizedPhone) {
      return { ok: false, reason: "PHONE_EXISTS" };
    }
    if (normalizedEmail && patient.email && patient.email === normalizedEmail) {
      return { ok: false, reason: "EMAIL_EXISTS" };
    }
  }

  const id = `pt_${crypto.randomUUID()}`;
  const createdAt = nowIso();
  const patient = {
    id,
    role: "patient",
    fullName,
    phoneNumber: normalizedPhone,
    email: normalizedEmail || null,
    password,
    createdAt,
    updatedAt: createdAt,
    profile: {
      fullName,
      phoneNumber: normalizedPhone,
      email: normalizedEmail || null,
      dateOfBirth: null,
      gender: null,
      bloodGroup: null,
      emergencyContact: normalizedPhone,
      address: null,
      city: null,
      state: null,
      medicalConditions: null,
      allergies: null
    }
  };

  patients.set(id, patient);
  pushNotification(id, "Welcome to MediSync", "Your patient account is ready.", "info");
  return { ok: true, patient };
}

export function findPatientByCredential(identifier) {
  const normalized = String(identifier || "").trim().toLowerCase();
  const phoneCandidate = sanitizePhone(identifier);
  for (const patient of patients.values()) {
    if (patient.email && patient.email === normalized) {
      return patient;
    }
    if (phoneCandidate && patient.phoneNumber === phoneCandidate) {
      return patient;
    }
  }
  return null;
}

export function getPatientById(patientId) {
  return patients.get(patientId) || null;
}

export function updatePatientProfile(patientId, updates) {
  const patient = patients.get(patientId);
  if (!patient) {
    return null;
  }
  patient.profile = {
    ...patient.profile,
    ...updates,
    phoneNumber: patient.phoneNumber,
    email: patient.email,
    fullName: updates.fullName || patient.profile.fullName
  };
  patient.fullName = patient.profile.fullName;
  patient.updatedAt = nowIso();
  patients.set(patientId, patient);
  return patient.profile;
}

export function createPatientRequest(patientId, payload) {
  const id = `REQ-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const createdAt = nowIso();
  const item = {
    id,
    patientId,
    resourceType: payload.resourceType,
    patientCondition: payload.patientCondition,
    priorityLevel: payload.priorityLevel,
    location: payload.location,
    additionalNotes: payload.additionalNotes || "",
    status: "pending",
    assignedHospitalName: null,
    hospitalLocation: null,
    ambulanceEtaMinutes: null,
    ambulanceLocation: null,
    createdAt,
    updatedAt: createdAt,
    timeline: [
      { status: "pending", at: createdAt, note: "Request submitted" }
    ]
  };

  requests.set(id, item);
  pushNotification(patientId, "Request Created", `Your request ${id} is now pending allocation.`, "info");
  return item;
}

export function updateRequestStatus(requestId, patch) {
  const item = requests.get(requestId);
  if (!item) {
    return null;
  }
  const updatedAt = nowIso();
  const nextStatus = patch.status || item.status;
  const updated = {
    ...item,
    ...patch,
    status: nextStatus,
    updatedAt,
    timeline: [
      ...item.timeline,
      { status: nextStatus, at: updatedAt, note: patch.note || "Status updated" }
    ]
  };
  requests.set(requestId, updated);
  return updated;
}

export function listActiveRequestsByPatient(patientId) {
  return Array.from(requests.values())
    .filter((item) => item.patientId === patientId && !["completed", "cancelled"].includes(item.status))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function listRequestHistoryByPatient(patientId) {
  return Array.from(requests.values())
    .filter((item) => item.patientId === patientId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function listNotificationsByPatient(patientId) {
  return notifications.get(patientId) || [];
}

export function createSeedPatient() {
  const existing = findPatientByCredential("patient@medisync.com");
  if (existing) {
    return existing;
  }

  const result = createPatientAuth({
    fullName: "Demo Patient",
    phoneNumber: "9876543210",
    email: "patient@medisync.com",
    password: "Patient@123"
  });
  return result.patient;
}

export function addPatientNotification(patientId, title, message, severity = "info") {
  pushNotification(patientId, title, message, severity);
}