const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 6500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function createEmergencyRequest(payload) {
  const response = await fetchWithTimeout(`${API_BASE}/emergency/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Unable to send SOS request.");
  }

  return data;
}

export async function getEmergencyStatus(requestId) {
  const response = await fetchWithTimeout(`${API_BASE}/emergency/requests/${requestId}`, {
    method: "GET"
  });

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Unable to fetch live status.");
  }

  return data;
}

export async function uploadEmergencyMedia({ requestId, callerPhone, mediaBlob, frameBlob, note = "" }) {
  const formData = new FormData();
  formData.append("media", mediaBlob, "live-capture.webm");
  if (frameBlob) {
    formData.append("frame", frameBlob, "live-frame.jpg");
  }
  formData.append("callerPhone", callerPhone);
  formData.append("note", note);

  const response = await fetchWithTimeout(`${API_BASE}/emergency/requests/${requestId}/media`, {
    method: "POST",
    body: formData
  }, 15000);

  const data = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || "Unable to upload live media.");
  }

  return data;
}
