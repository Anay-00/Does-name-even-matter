import { apiRequest } from "./apiClient";

export async function getPatientProfile(token) {
  return apiRequest("/patient/profile", { token });
}

export async function updatePatientProfile(token, body) {
  return apiRequest("/patient/profile", {
    method: "PUT",
    token,
    body
  });
}

export async function createPatientRequest(token, body) {
  return apiRequest("/requests", {
    method: "POST",
    token,
    body
  });
}

export async function listActivePatientRequests(token) {
  return apiRequest("/requests/active", { token });
}

export async function listPatientRequestHistory(token) {
  return apiRequest("/requests/history", { token });
}

export async function listPatientNotifications(token) {
  return apiRequest("/patient/notifications", { token });
}
