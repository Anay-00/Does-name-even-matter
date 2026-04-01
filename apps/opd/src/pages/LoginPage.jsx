import React, { useState, useEffect } from "react";
import { api } from "../lib/api";

const HOSPITALS = [
  { code: "IND-AITR-01", name: "AitriCare Hospital", short: "aitri", icon: "🫀", color: "#e8523f" },
  { code: "IND-AURO-02", name: "Aurobindo Hospital", short: "auro", icon: "🧬", color: "#7c3aed" },
  { code: "IND-VIJAY-03", name: "VijayCare Hospital", short: "vijay", icon: "🩻", color: "#1a73e8" },
  { code: "IND-PALASIA-04", name: "PalasiaCare Hospital", short: "palasia", icon: "💊", color: "#0f9d58" },
  { code: "IND-BHAWAR-05", name: "BhawarLife Hospital", short: "bhawar", icon: "🏥", color: "#f4b400" },
];

const DEPT_LABELS = {
  CARD: "Cardiology",
  ORTH: "Orthopedics",
  NEUR: "Neurology",
  PEDI: "Pediatrics",
  GENM: "General Medicine",
};

const DEPT_ICONS = { CARD: "❤️", ORTH: "🦴", NEUR: "🧠", PEDI: "👶", GENM: "🩺" };

const PASSWORD = "OPD@2026";

export default function LoginPage({ onLogin }) {
  const [step, setStep] = useState(1); // 1: hospital, 2: role, 3: dept select, 4: doctor select
  const [hospital, setHospital] = useState(null);
  const [role, setRole] = useState("");
  const [selectedDept, setSelectedDept] = useState(null);
  const [loginOptions, setLoginOptions] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch login options (doctor list) once
  useEffect(() => {
    api.getLoginOptions().then(setLoginOptions).catch(() => {});
  }, []);

  function reset() {
    setStep(1);
    setHospital(null);
    setRole("");
    setSelectedDept(null);
    setError("");
  }

  function selectHospital(h) {
    setHospital(h);
    setError("");
    setStep(2);
  }

  function selectRole(r) {
    setRole(r);
    setError("");
    if (r === "receptionist") {
      doLogin(`rec.${hospital.short}@medisync.com`);
    } else {
      setStep(3);
    }
  }

  function selectDept(deptCode) {
    setSelectedDept(deptCode);
    setError("");
    setStep(4);
  }

  function selectDoctor(email) {
    doLogin(email);
  }

  // Get doctors for current hospital + dept from login options
  function getDoctorsForDept(deptCode) {
    if (!loginOptions || !hospital) return [];
    const hOpts = loginOptions.find((o) => o.code === hospital.code);
    if (!hOpts) return [];
    return hOpts.doctors.filter((d) => d.deptCode === deptCode);
  }

  async function doLogin(email) {
    setLoading(true);
    setError("");
    try {
      const result = await api.login({ email, password: PASSWORD });
      onLogin(result);
    } catch (err) {
      setError(err.message || "Login failed");
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
            {error && <div className="login-error">{error}</div>}

            {/* Step 1: Select Hospital */}
            {step === 1 && (
              <div className="login-step">
                <h3 className="login-step-title">Welcome Back</h3>
                <p className="login-step-subtitle">Select your hospital to get started</p>
                <div className="hospital-grid">
                  {HOSPITALS.map((h) => (
                    <button
                      key={h.code}
                      className="hospital-card"
                      onClick={() => selectHospital(h)}
                    >
                      <span className="hospital-icon-circle" style={{ background: h.color + "18", color: h.color }}>{h.icon}</span>
                      <div className="hospital-text">
                        <span className="hospital-name">{h.name}</span>
                        <span className="hospital-code">{h.code}</span>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="login-quick-links">
                  <a href="/display" className="login-quick-link">
                    <span>📺</span> Patient Display Board
                  </a>
                  <a href="/dashboard" className="login-quick-link">
                    <span>📊</span> Analytics Dashboard
                  </a>
                </div>
              </div>
            )}

            {/* Step 2: Select Role */}
            {step === 2 && (
              <div className="login-step">
                <button className="back-btn" onClick={reset}>← Back</button>
                <h3 className="login-step-title">{hospital.name}</h3>
                <p className="login-step-subtitle">Select your role</p>
                <div className="role-grid">
                  <button
                    className="role-card role-reception"
                    onClick={() => selectRole("receptionist")}
                    disabled={loading}
                  >
                    <span className="role-icon-circle" style={{background: "var(--primary-light)", color: "var(--primary)"}}>📋</span>
                    <span className="role-title">Reception</span>
                    <span className="role-desc">Register patients & issue tokens</span>
                  </button>
                  <button
                    className="role-card role-doctor"
                    onClick={() => selectRole("doctor")}
                    disabled={loading}
                  >
                    <span className="role-icon-circle" style={{background: "var(--success-light)", color: "var(--success)"}}>🩺</span>
                    <span className="role-title">Doctor</span>
                    <span className="role-desc">Manage consultations</span>
                  </button>
                </div>
                {loading && <p className="login-loading">Signing in...</p>}
              </div>
            )}

            {/* Step 3: Select Department */}
            {step === 3 && (
              <div className="login-step">
                <button className="back-btn" onClick={() => setStep(2)}>← Back</button>
                <h3 className="login-step-title">{hospital.name}</h3>
                <p className="login-step-subtitle">Select your department</p>
                <div className="doctor-grid">
                  {Object.entries(DEPT_LABELS).map(([code, label]) => (
                    <button
                      key={code}
                      className={`doctor-card ${selectedDept === code ? "selected" : ""}`}
                      onClick={() => selectDept(code)}
                      disabled={loading}
                    >
                      <span className="doctor-dept-icon">{DEPT_ICONS[code]}</span>
                      <span className="doctor-dept">{label}</span>
                      <span className="doctor-count">{getDoctorsForDept(code).length} doctors</span>
                    </button>
                  ))}
                </div>
                {loading && <p className="login-loading">Signing in...</p>}
              </div>
            )}

            {/* Step 4: Select Doctor within Department */}
            {step === 4 && (
              <div className="login-step">
                <button className="back-btn" onClick={() => { setStep(3); setSelectedDept(null); }}>← Back</button>
                <h3 className="login-step-title">{DEPT_LABELS[selectedDept]}</h3>
                <p className="login-step-subtitle">Select your profile</p>
                <div className="doctor-grid">
                  {getDoctorsForDept(selectedDept).map((doc) => (
                    <button
                      key={doc.email}
                      className="doctor-card"
                      onClick={() => selectDoctor(doc.email)}
                      disabled={loading}
                    >
                      <span className="doctor-dept-icon">{DEPT_ICONS[selectedDept]}</span>
                      <span className="doctor-name-label">{doc.name}</span>
                      <span className="doctor-qual">{doc.qualification}</span>
                      <span className="doctor-room">Room {doc.room}</span>
                    </button>
                  ))}
                </div>
                {loading && <p className="login-loading">Signing in...</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
