import { HttpError } from "../utils/httpError.js";
import {
  addPatientNotification,
  createPatientAuth,
  createPatientRequest,
  createSeedPatient,
  findPatientByCredential,
  getPatientById,
  listActiveRequestsByPatient,
  listNotificationsByPatient,
  listRequestHistoryByPatient,
  updatePatientProfile,
  updateRequestStatus
} from "../repositories/patientRepository.js";

createSeedPatient();

export function registerPatient(payload) {
  const result = createPatientAuth(payload);
  if (!result.ok) {
    if (result.reason === "PHONE_EXISTS") {
      throw new HttpError(409, "Phone number already registered", "PHONE_EXISTS");
    }
    throw new HttpError(409, "Email already registered", "EMAIL_EXISTS");
  }
  return result.patient;
}

export function loginPatient({ identifier, password }) {
  const patient = findPatientByCredential(identifier);
  if (!patient || patient.password !== password) {
    throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  return {
    id: patient.id,
    role: "patient",
    email: patient.email,
    phoneNumber: patient.phoneNumber,
    fullName: patient.fullName
  };
}

export function getPatientProfile(patientId) {
  const patient = getPatientById(patientId);
  if (!patient) {
    throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
  }
  return patient.profile;
}

export function updatePatientProfileDetails(patientId, updates) {
  const profile = updatePatientProfile(patientId, updates);
  if (!profile) {
    throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
  }
  return profile;
}

export function submitPatientRequest(patientId, payload) {
  const patient = getPatientById(patientId);
  if (!patient) {
    throw new HttpError(404, "Patient not found", "PATIENT_NOT_FOUND");
  }

  const item = createPatientRequest(patientId, payload);

  // Simulate allocation engine updates for demo mode.
  setTimeout(() => {
    const allocated = updateRequestStatus(item.id, {
      status: "allocated",
      assignedHospitalName: "Aitri Hospital, Indore",
      hospitalLocation: { latitude: 22.7322, longitude: 75.8648 },
      ambulanceEtaMinutes: 14,
      note: "Hospital assigned"
    });
    if (allocated) {
      addPatientNotification(patientId, "Hospital Assigned", `${allocated.assignedHospitalName} accepted request ${allocated.id}.`, "success");
    }
  }, 8000);

  setTimeout(() => {
    const inProgress = updateRequestStatus(item.id, {
      status: "in_progress",
      ambulanceLocation: { latitude: 22.745, longitude: 75.872 },
      ambulanceEtaMinutes: 7,
      note: "Ambulance en route"
    });
    if (inProgress) {
      addPatientNotification(patientId, "Ambulance En Route", `Ambulance for ${inProgress.id} is on the way.`, "info");
    }
  }, 17000);

  return item;
}

export function getActivePatientRequests(patientId) {
  return listActiveRequestsByPatient(patientId);
}

export function getPatientRequestHistory(patientId) {
  return listRequestHistoryByPatient(patientId);
}

export function getPatientNotifications(patientId) {
  return listNotificationsByPatient(patientId);
}