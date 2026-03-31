import React, { useState } from "react";
import { api } from "../lib/api";

const CREDENTIALS = {
  opd_receptionist: [
    { label: "AitriCare Reception", email: "aitri.opd@medisync.com", password: "OPD@123" },
    { label: "PalasiaCare Reception", email: "palasia.opd@medisync.com", password: "OPD@234" },
    { label: "AcroLife Reception", email: "acro.opd@medisync.com", password: "OPD@345" },
  ],
  doctor: [
    { label: "AitriCare Doctor", email: "dr.aitri.opd@medisync.com", password: "Doctor@123" },
    { label: "PalasiaCare Doctor", email: "dr.palasia.opd@medisync.com", password: "Doctor@456" },
    { label: "AcroLife Doctor", email: "dr.acro.opd@medisync.com", password: "Doctor@234" },
  ],
};

export default function LoginPage({ onLogin }) {
  const [role, setRole] = useState("opd_receptionist");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api.login({ email, password, role });
      onLogin(result);
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(cred) {
    setEmail(cred.email);
    setPassword(cred.password);
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>MediSync OPD</h1>
          <p>Queue & Wait-Time Management System</p>
        </div>
        <div className="login-body">
          <div className="login-tabs">
            <button className={`login-tab ${role === "opd_receptionist" ? "active" : ""}`} onClick={() => setRole("opd_receptionist")}>Reception</button>
            <button className={`login-tab ${role === "doctor" ? "active" : ""}`} onClick={() => setRole("doctor")}>Doctor</button>
          </div>

          {error && <div className="login-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input className="form-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
            </div>
            <button className="btn btn-primary btn-lg w-full" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="login-help">
            <strong>Quick Login:</strong>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {CREDENTIALS[role].map((c, i) => (
                <button key={i} className="btn btn-outline btn-sm" type="button" onClick={() => quickLogin(c)}>
                  {c.label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "#9ca3af" }}>
              Or visit <a href="/display" style={{ color: "#1a73e8" }}>/display</a> for the public Patient Display Board
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
