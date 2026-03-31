import { apiRequest } from "./apiClient";

export async function createEmergencyRequest(body) {
  return apiRequest("/emergency/requests", {
    method: "POST",
    body
  });
}

export async function getEmergencyRequestById(requestId) {
  return apiRequest(`/emergency/requests/${requestId}`);
}

export async function listHospitalRequests(token, { status, limit = 25 } = {}) {
  const params = new URLSearchParams();
  if (status) {
    params.set("status", status);
  }
  if (limit) {
    params.set("limit", String(limit));
  }
  const query = params.toString();
  return apiRequest(`/hospital/requests${query ? `?${query}` : ""}`, {
    token
  });
}

export async function respondToRequest(token, requestId, body) {
  return apiRequest(`/hospital/requests/${requestId}/respond`, {
    method: "POST",
    token,
    body
  });
}

export async function retryRequestAllocation(token, requestId, reason = "manual_retry") {
  return apiRequest(`/hospital/requests/${requestId}/retry`, {
    method: "POST",
    token,
    body: { reason }
  });
}

export async function createManualHospitalRequest(token, body) {
  return apiRequest("/hospital/requests/manual", {
    method: "POST",
    token,
    body
  });
}

export async function getCommandCenterSnapshot(token) {
  return apiRequest("/hospital/command-center", {
    token
  });
}

export async function listEmergencyMedia(token, requestId) {
  return apiRequest(`/emergency/requests/${requestId}/media`, {
    token
  });
}
