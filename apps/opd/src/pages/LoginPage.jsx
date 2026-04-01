import React, { useState } from "react";
import { api } from "../lib/api";

const HOSPITAL_LABELS = {
  "IND-AITR-01":    "AitriCare Hospital",
  "IND-AURO-02":    "Aurobindo Hospital",
  "IND-VIJAY-03":   "VijayCare Hospital",
  "IND-PALASIA-04": "PalasiaCare Hospital",
  "IND-BHAWAR-05":  "BhawarLife Hospital",
};

export default function LoginPage({ onLogin }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showHints, setShowHints] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await api.login({ email: email.trim().toLowerCase(), password });
      onLogin(result);
    } catch (err) {
      setError(err.message || "Invalid credentials. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left branding panel */}
      <div className="login-brand-panel">
        <div className="login-brand-content">
          <div className="login-brand-logo">
            <span className="login-brand-icon">🏥</span>
          </div>
          <h1 className="login-brand-title"><span>MediSync</span><span>OPD</span></h1>
          <p className="login-brand-subtitle">Queue & Wait-Time Management System</p>
          <div className="login-brand-features">
            <div className="login-feature"><span>⚡</span> Real-time Queue Tracking</div>
            <div className="login-feature"><span>📊</span> Analytics Dashboard</div>
            <div className="login-feature"><span>📱</span> SMS/WhatsApp Notifications</div>
            <div className="login-feature"><span>🩺</span> Doctor Panel Integration</div>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="login-form-panel">
        <div className="login-card">
          <div className="login-body">
            <h3 className="login-step-title">Welcome Back</h3>
            <p className="login-step-subtitle">Sign in to your account to continue</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit} autoComplete="on">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@medisync.com"
                  autoComplete="username"
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ marginTop: 16 }}>
                <label className="form-label">Password</label>
                <input
                  className="form-input"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                className="btn btn-primary btn-lg w-full"
                type="submit"
                disabled={loading}
                style={{ marginTop: 24 }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* Credential hints (collapsible) */}
            <div className="login-hints">
              <button
                className="login-hints-toggle"
                type="button"
                onClick={() => setShowHints((v) => !v)}
              >
                {showHints ? "▲" : "▼"} Staff credential reference
              </button>
              {showHints && (
                <div className="login-hints-body">
                  <p className="login-hints-note">Password for all accounts: <code>OPD@2026</code></p>
                  <table className="login-hints-table">
                    <thead>
                      <tr><th>Hospital</th><th>Role</th><th>Email format</th></tr>
                    </thead>
                    <tbody>
                      {[
                        ["Aurobindo",  "Reception", "rec.auro@medisync.com"],
                        ["Aurobindo",  "Doctor (Cardiology #1)", "dr.card.auro@medisync.com"],
                        ["Aurobindo",  "Doctor (Cardiology #2)", "dr.card2.auro@medisync.com"],
                        ["AitriCare",  "Reception", "rec.aitri@medisync.com"],
                        ["VijayCare",  "Reception", "rec.vijay@medisync.com"],
                        ["PalasiaCare","Reception", "rec.palasia@medisync.com"],
                        ["BhawarLife", "Reception", "rec.bhawar@medisync.com"],
                      ].map(([hosp, role, email]) => (
                        <tr key={email}>
                          <td>{hosp}</td>
                          <td>{role}</td>
                          <td>
                            <button
                              type="button"
                              className="login-hints-fill"
                              onClick={() => { setEmail(email); setPassword("OPD@2026"); }}
                            >
                              {email}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="login-hints-note" style={{marginTop:8}}>
                    Doctor email pattern: <code>dr.&#123;deptcode&#125;&#123;N&#125;.&#123;hospital&#125;@medisync.com</code><br/>
                    Dept codes: card, orth, neur, pedi, genm &nbsp;|&nbsp; N = 2 or 3 for 2nd/3rd doctor
                  </p>
                </div>
              )}
            </div>

            <div className="login-quick-links">
              <a href="/display" className="login-quick-link">
                <span>📺</span> Display Board
              </a>
              <a href="/dashboard" className="login-quick-link">
                <span>📊</span> Analytics
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

