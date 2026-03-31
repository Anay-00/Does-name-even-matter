const BASE = "/api";

function getToken() {
  try {
    const auth = localStorage.getItem("opd_auth");
    return auth ? JSON.parse(auth).token : null;
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  // Lookup
  getHospitals: () => request("/hospitals"),
  getDepartments: () => request("/departments"),
  getDoctors: (department) => request(`/doctors${department ? `?department=${encodeURIComponent(department)}` : ""}`),

  // Tokens
  issueToken: (data) => request("/tokens", { method: "POST", body: JSON.stringify(data) }),
  getTokens: (params = {}) => {
    const qs = Object.entries(params).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return request(`/tokens${qs ? `?${qs}` : ""}`);
  },
  callNext: (data) => request("/tokens/call-next", { method: "POST", body: JSON.stringify(data) }),
  callToken: (id, data) => request(`/tokens/${id}/call`, { method: "PATCH", body: JSON.stringify(data || {}) }),
  completeToken: (id, notes) => request(`/tokens/${id}/complete`, { method: "PATCH", body: JSON.stringify({ notes }) }),
  skipToken: (id) => request(`/tokens/${id}/skip`, { method: "PATCH" }),
  cancelToken: (id) => request(`/tokens/${id}/cancel`, { method: "PATCH" }),

  // Stats
  getStats: (date) => request(`/stats${date ? `?date=${date}` : ""}`),

  // Public display
  getDisplayData: (hospitalId) => request(`/display/${hospitalId}`),
};
