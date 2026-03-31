import { apiRequest } from "./apiClient";

const TOKEN_KEY = "medisync_access_token";
const USER_KEY = "medisync_user";

export async function loginWithPassword({ email, password, role }) {
  const payload = await apiRequest("/auth/login", {
    method: "POST",
    body: { email, password, role }
  });
  saveSession(payload.accessToken, payload.user);
  return payload;
}

export async function registerPatient({ fullName, phoneNumber, email, password, confirmPassword }) {
  const payload = await apiRequest("/auth/register", {
    method: "POST",
    body: { fullName, phoneNumber, email, password, confirmPassword }
  });
  saveSession(payload.accessToken, payload.user);
  return payload;
}

export function saveSession(accessToken, user) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getSessionUser() {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
