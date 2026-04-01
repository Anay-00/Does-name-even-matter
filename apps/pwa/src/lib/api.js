const API_BASE = `${import.meta.env.VITE_API_URL || ""}/api`;

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const getHospitals = () => request("/hospitals");
export const getSymptoms = () => request("/symptoms");
export const issuePatientToken = (body) =>
  request("/patient/tokens", { method: "POST", body: JSON.stringify(body) });
export const getTokenStatus = (id) => request(`/patient/tokens/${id}`);
