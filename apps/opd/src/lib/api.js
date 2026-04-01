const BASE = "/api";

/* ── In-memory token cache (avoids localStorage race on first login) ── */
let _token = null;

function getToken() {
  if (_token) return _token;
  try {
    const auth = localStorage.getItem("opd_auth");
    const parsed = auth ? JSON.parse(auth) : null;
    _token = parsed?.token || null;
    return _token;
  } catch {
    return null;
  }
}

export function setToken(token) { _token = token; }
export function clearToken() { _token = null; }

export function getStoredAuth() {
  try {
    const auth = localStorage.getItem("opd_auth");
    return auth ? JSON.parse(auth) : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  /* Auto-logout on 401 for authenticated requests (skip auth endpoints) */
  if (res.status === 401 && token && !path.startsWith("/auth/")) {
    _token = null;
    localStorage.removeItem("opd_auth");
    window.location.href = "/";
    throw new Error("Session expired — please login again");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  getLoginOptions: () => request("/auth/options"),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  // Lookup
  getHospitals: () => request("/hospitals"),
  getSymptoms: () => request("/symptoms"),
  getDepartments: () => request("/departments"),
  getDoctors: () => request("/doctors"),

  // Reception
  getReceptionPanel: () => request("/reception/panel"),
  issueToken: (data) => request("/tokens", { method: "POST", body: JSON.stringify(data) }),
  cancelToken: (id) => request(`/tokens/${id}/cancel`, { method: "PATCH" }),

  // Doctor
  getDoctorPanel: () => request("/doctor/panel"),
  startConsultation: (id) => request(`/tokens/${id}/start`, { method: "PATCH" }),
  completeConsultation: (id) => request(`/tokens/${id}/complete`, { method: "PATCH" }),

  // Public display
  getDisplayData: (hospitalId) => request(`/display/${hospitalId}`),
};
