import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";

const POLL_INTERVAL = 3000;

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DoctorPage({ auth, onLogout }) {
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState(null);
  const [currentToken, setCurrentToken] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState("");
  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const params = {};
      if (selectedDept) params.departmentId = selectedDept;
      const [tkns, st] = await Promise.all([api.getTokens(params), api.getStats()]);
      setTokens(tkns);
      setStats(st);

      // Detect current in_consultation token
      const inConsult = tkns.find((t) => t.status === "in_consultation");
      if (inConsult) {
        setCurrentToken(inConsult);
      } else {
        setCurrentToken(null);
      }
    } catch {
      // retry silently
    }
  }, [selectedDept]);

  useEffect(() => {
    api.getDepartments().then((depts) => {
      setDepartments(depts);
      if (depts.length > 0) setSelectedDept(depts[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Consultation timer
  useEffect(() => {
    clearInterval(timerRef.current);
    if (currentToken?.called_at) {
      const start = new Date(currentToken.called_at).getTime();
      timerRef.current = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      setTimerSeconds(Math.floor((Date.now() - start) / 1000));
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [currentToken?.id, currentToken?.called_at]);

  async function handleCallNext() {
    if (!selectedDept) return;
    setLoading("call");
    try {
      await api.callNext({ departmentId: selectedDept });
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading("");
    }
  }

  async function handleComplete() {
    if (!currentToken) return;
    setLoading("complete");
    try {
      await api.completeToken(currentToken.id);
      setCurrentToken(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading("");
    }
  }

  async function handleSkip() {
    if (!currentToken) return;
    setLoading("skip");
    try {
      await api.skipToken(currentToken.id);
      setCurrentToken(null);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading("");
    }
  }

  async function handleCallSpecific(id) {
    setLoading("call");
    try {
      await api.callToken(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading("");
    }
  }

  const waitingTokens = tokens.filter((t) => t.status === "waiting");
  const completedTokens = tokens.filter((t) => t.status === "completed");
  const avgConsult = stats ? Math.round(stats.avgConsultationSeconds / 60) : 5;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          MediSync OPD
        </div>
        <div className="navbar-info">
          <span className="navbar-hospital">{auth.user.hospitalName}</span>
          <span>Doctor Panel</span>
          <button className="btn btn-outline btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="page-container">
        {/* Stats */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: "var(--warning)" }}>{stats.waiting}</div>
              <div className="stat-label">Waiting</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: "var(--success)" }}>{stats.inConsultation}</div>
              <div className="stat-label">In Consultation</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: "#666" }}>{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: "var(--purple)" }}>{avgConsult}<span style={{ fontSize: 14, fontWeight: 500 }}> min</span></div>
              <div className="stat-label">Avg Consult</div>
            </div>
          </div>
        )}

        {/* Department tabs */}
        <div className="dept-tabs mb-4">
          {departments.map((d) => (
            <button key={d.id} className={`dept-tab ${selectedDept === d.id ? "active" : ""}`} onClick={() => setSelectedDept(d.id)}>
              {d.name}
            </button>
          ))}
        </div>

        <div className="page-grid">
          {/* ── Left: Current Patient ──────────────────────────── */}
          <div>
            {currentToken ? (
              <div className="current-patient">
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success-dark)", textTransform: "uppercase", letterSpacing: 2 }}>Now Serving</div>
                <div className="token-big">#{String(currentToken.token_number).padStart(3, "0")}</div>
                <div className="patient-big">{currentToken.patient_name}</div>
                <div className="patient-meta">
                  {currentToken.patient_age ? `${currentToken.patient_age}y` : ""}
                  {currentToken.patient_gender ? ` / ${currentToken.patient_gender}` : ""}
                  {currentToken.departments?.name ? ` · ${currentToken.departments.name}` : ""}
                </div>
                <div className="timer">{formatTimer(timerSeconds)}</div>
                <div className="flex gap-2 mt-4" style={{ justifyContent: "center" }}>
                  <button className="btn btn-success btn-lg" onClick={handleComplete} disabled={loading === "complete"}>
                    {loading === "complete" ? "Completing..." : "✓ Complete"}
                  </button>
                  <button className="btn btn-outline btn-lg" onClick={handleSkip} disabled={loading === "skip"}>
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="current-patient" style={{ background: "var(--surface-alt)", border: "2px dashed var(--border)" }}>
                <div className="no-patient">
                  <div style={{ fontSize: 48, opacity: 0.3 }}>🩺</div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>No patient in consultation</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Click "Call Next" to begin</div>
                </div>
              </div>
            )}

            <button
              className="btn btn-primary btn-lg w-full mt-4"
              onClick={handleCallNext}
              disabled={loading === "call" || waitingTokens.length === 0 || !!currentToken}
              style={{ fontSize: 18, padding: "16px 28px" }}
            >
              {loading === "call" ? "Calling..." : `📢 Call Next Patient${waitingTokens.length > 0 ? ` (${waitingTokens.length} waiting)` : ""}`}
            </button>

            {/* Completed list */}
            {completedTokens.length > 0 && (
              <div className="card mt-4">
                <div className="card-header">
                  Completed Today
                  <span className="badge badge-completed">{completedTokens.length}</span>
                </div>
                <div className="card-body" style={{ maxHeight: 200, overflowY: "auto" }}>
                  {completedTokens.map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border-light)", fontSize: 13 }}>
                      <span><span className="token-number" style={{ fontSize: 13 }}>#{String(t.token_number).padStart(3, "0")}</span> {t.patient_name}</span>
                      <span style={{ color: "var(--text-muted)" }}>{t.consultation_duration_seconds ? formatTimer(t.consultation_duration_seconds) : "—"}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Waiting Queue ───────────────────────────── */}
          <div className="card">
            <div className="card-header">
              Waiting Queue
              <span className="badge badge-waiting">{waitingTokens.length} waiting</span>
            </div>
            <div className="card-body">
              {waitingTokens.length === 0 ? (
                <div className="empty-state">No patients waiting in this department.</div>
              ) : (
                <div style={{ maxHeight: 500, overflowY: "auto" }}>
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Patient</th>
                        <th>Department</th>
                        <th>Est. Wait</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingTokens.map((t, idx) => (
                        <tr key={t.id}>
                          <td>
                            <span className="token-number">#{String(t.token_number).padStart(3, "0")}</span>
                            {t.priority === "priority" && <span className="badge badge-priority" style={{ marginLeft: 6 }}>P</span>}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600 }}>{t.patient_name}</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                              {t.patient_age ? `${t.patient_age}y` : ""}{t.patient_gender ? ` / ${t.patient_gender}` : ""}
                            </div>
                          </td>
                          <td style={{ fontSize: 13 }}>{t.departments?.name || "—"}</td>
                          <td style={{ fontWeight: 700, color: "var(--warning)" }}>~{(idx + 1) * avgConsult} min</td>
                          <td>
                            {!currentToken && idx === 0 && (
                              <button className="btn btn-primary btn-sm" onClick={() => handleCallSpecific(t.id)} disabled={!!loading}>Call</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
