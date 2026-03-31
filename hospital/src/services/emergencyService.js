import { API_BASE_URL, apiRequest } from "./apiClient";

/**
 * Create an emergency request
 * @param {Object} payload - Emergency request payload
 * @returns {Promise<Object>} Created emergency request with ID and status
 */
export const createEmergencyRequest = async (payload) => {
  const maxAttempts = 2;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5500);

    try {
      const response = await fetch(`${API_BASE_URL}/emergency/requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error?.message || data?.message || "Unable to create emergency request");
      }
      clearTimeout(timeoutId);
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      if (attempt < maxAttempts) {
        // Short retry backoff for transient network/server blips.
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }
  }

  if (String(lastError?.name || "") === "AbortError") {
    throw new Error("SOS request timed out. Please check your network and try again.");
  }

  throw new Error(lastError?.message || "Unable to create emergency request.");
};

/**
 * Get emergency request status
 * @param {string} requestId - Emergency request ID
 * @returns {Promise<Object>} Emergency request details with current status
 */
export const getEmergencyStatus = async (requestId) => {
  return apiRequest(`/emergency/requests/${requestId}`);
};

/**
 * Cancel an emergency request
 * @param {string} requestId - Emergency request ID
 * @returns {Promise<Object>} Cancellation confirmation
 */
export const cancelEmergencyRequest = async (requestId, reason = "cancelled_by_user") => {
  return apiRequest(`/emergency/requests/${requestId}/cancel`, {
    method: "POST",
    body: { reason }
  });
};

export const uploadEmergencyMedia = async ({ requestId, callerPhone, mediaFile, note = "" }) => {
  const formData = new FormData();
  formData.append("media", mediaFile);
  formData.append("callerPhone", callerPhone);
  formData.append("note", note);

  const response = await fetch(`${API_BASE_URL}/emergency/requests/${requestId}/media`, {
    method: "POST",
    body: formData
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || payload?.message || "Media upload failed");
  }

  return payload;
};

export const listEmergencyMedia = async (requestId, accessToken) => {
  return apiRequest(`/emergency/requests/${requestId}/media`, {
    token: accessToken
  });
};
