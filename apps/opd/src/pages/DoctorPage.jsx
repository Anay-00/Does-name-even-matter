import React, { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const SYMPTOM_ICONS = { CARD: "❤️", ORTH: "🦴", NEUR: "🧠", PEDI: "👶", GENM: "🩺" };

export default function DoctorPage({ auth, onLogout }) {
  const [panel, setPanel] = useState(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const timerRef = useRef(null);

  const { doctorName, departmentName, departmentCode, roomNumber, hospitalName, doctorId } = auth.user;

  /* ── Fetch panel state ────────────────────────────────────────── */
  const fetchPanel = useCallback(async () => {
    try {
      const data = await api.getDoctorPanel();
      setPanel(data);
    } catch {
      // silent retry
    }
  }, []);

  useEffect(() => {
    fetchPanel();
  }, [fetchPanel]);

  /* ── Socket.IO real-time listener ─────────────────────────────── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handler = () => fetchPanel();
    socket.on("queue:update", handler);
    return () => socket.off("queue:update", handler);
  }, [fetchPanel]);

  /* ── Consultation timer ───────────────────────────────────────── */
  const currentPatient = panel?.currentPatient;
  useEffect(() => {
    clearInterval(timerRef.current);
    const startField = currentPatient?.consultation_started_at || currentPatient?.called_at;
    if (startField) {
      const start = new Date(startField).getTime();
      timerRef.current = setInterval(() => {
        setTimerSeconds(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      setTimerSeconds(Math.floor((Date.now() - start) / 1000));
    } else {
      setTimerSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [currentPatient?.id, currentPatient?.consultation_started_at, currentPatient?.called_at]);

  /* ── Patient Entered (start consultation on first waiting) ────── */
  async function handlePatientEntered() {
    const next = panel?.waitingQueue?.[0];
    if (!next) return;
    setLoading("enter");
    setError("");
    try {
      await api.startConsultation(next.id);
      await fetchPanel();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  /* ── Consultation Complete ────────────────────────────────────── */
  async function handleComplete() {
    if (!currentPatient) return;
    setLoading("complete");
    setError("");
    try {
      await api.completeConsultation(currentPatient.id);
      await fetchPanel();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading("");
    }
  }

  const waitingQueue = panel?.waitingQueue || [];
  const completedCount = panel?.completedCount || 0;
  const totalToday = panel?.totalToday || 0;
  const avgMin = panel?.avgConsultationMinutes || 10;

  return (
    <>
      {/* ── Navbar ──────────────────────────────────────────────── */}
      <nav className="navbar">
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          MediSync OPD
        </div>
        <div className="navbar-info">
          <span className="navbar-hospital">{hospitalName}</span>
          <span>{doctorName}</span>
          <button className="btn btn-outline btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="page-container">
        {/* ── Doctor identity card ─────────────────────────────── */}
        <div className="doctor-identity">
          <div className="doctor-identity-left">
            <div className="doctor-identity-icon">{SYMPTOM_ICONS[departmentCode] || "🩺"}</div>
            <div>
              <div className="doctor-identity-name">{doctorName}</div>
              <div className="doctor-identity-dept">{departmentName} &middot; Room {roomNumber}</div>
            </div>
          </div>
          <div className="doctor-identity-stats">
            <div className="doctor-stat">
              <span className="doctor-stat-value" style={{ color: "var(--warning)" }}>{waitingQueue.length}</span>
              <span className="doctor-stat-label">Waiting</span>
            </div>
            <div className="doctor-stat">
              <span className="doctor-stat-value" style={{ color: "var(--success)" }}>{currentPatient ? 1 : 0}</span>
              <span className="doctor-stat-label">Current</span>
            </div>
            <div className="doctor-stat">
              <span className="doctor-stat-value" style={{ color: "#666" }}>{completedCount}</span>
              <span className="doctor-stat-label">Done</span>
            </div>
            <div className="doctor-stat">
              <span className="doctor-stat-value" style={{ color: "var(--purple, #7c3aed)" }}>{avgMin}<small> min</small></span>
              <span className="doctor-stat-label">Avg</span>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="page-grid">
          {/* ── Left: Current Patient ──────────────────────────── */}
          <div>
            {currentPatient ? (
              <div className="current-patient">
                <div className="current-patient-label">Now Serving</div>
                <div className="token-big">{currentPatient.token_number}</div>
                <div className="patient-big">{currentPatient.patient_name}</div>
                <div className="patient-meta">
                  {currentPatient.patient_mobile}
                  {currentPatient.symptom_category ? ` · ${SYMPTOM_ICONS[currentPatient.symptom_category] || ""} ${currentPatient.symptom_category}` : ""}
                  {currentPatient.priority === "priority" && (
                    <span className="badge badge-priority" style={{ marginLeft: 8 }}>PRIORITY</span>
                  )}
                </div>
                <div className="timer">{formatTimer(timerSeconds)}</div>
                <button
                  className="btn btn-success btn-lg mt-4"
                  onClick={handleComplete}
                  disabled={loading === "complete"}
                  style={{ fontSize: 18, padding: "14px 40px" }}
                >
                  {loading === "complete" ? "Completing..." : "✓ Consultation Complete"}
                </button>
              </div>
            ) : (
              <div className="current-patient current-patient-empty">
                <div style={{ fontSize: 48, opacity: 0.3 }}>🩺</div>
                <div style={{ fontSize: 16, fontWeight: 600, marginTop: 8 }}>No patient in consultation</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
                  {waitingQueue.length > 0
                    ? "Click \"Patient Entered\" when the next patient enters your room"
                    : "No patients waiting — you're all caught up!"}
                </div>
              </div>
            )}

            {/* Patient Entered button */}
            <button
              className="btn btn-primary btn-lg w-full mt-4"
              onClick={handlePatientEntered}
              disabled={loading === "enter" || waitingQueue.length === 0 || !!currentPatient}
              style={{ fontSize: 18, padding: "16px 28px" }}
            >
              {loading === "enter"
                ? "Starting..."
                : waitingQueue.length > 0 && !currentPatient
                  ? `🚶 Patient Entered — ${waitingQueue[0].token_number} (${waitingQueue[0].patient_name})`
                  : `🚶 Patient Entered${waitingQueue.length > 0 ? ` (${waitingQueue.length} waiting)` : ""}`}
            </button>

            {/* Completed today count */}
            {completedCount > 0 && (
              <div className="completed-today-card mt-4">
                <div className="completed-today-header">
                  <span>Completed Today</span>
                  <span className="badge badge-completed">{completedCount}</span>
                </div>
                <div className="completed-today-subtext">
                  {totalToday} total &middot; {avgMin} min avg consultation
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Waiting Queue ───────────────────────────── */}
          <div className="card">
            <div className="card-header">
              Waiting Queue
              <span className="badge badge-waiting">{waitingQueue.length}</span>
            </div>
            <div className="card-body">
              {waitingQueue.length === 0 ? (
                <div className="empty-state">No patients waiting. Great job!</div>
              ) : (
                <div className="queue-scroll">
                  <table className="queue-table">
                    <thead>
                      <tr>
                        <th>Pos</th>
                        <th>Token</th>
                        <th>Patient</th>
                        <th>Symptom</th>
                        <th>ETA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {waitingQueue.map((t) => (
                        <tr key={t.id} className={t.priority === "priority" ? "row-priority" : ""}>
                          <td className="cell-secondary">{t.position}</td>
                          <td>
                            <span className="token-number">{t.token_number}</span>
                            {t.priority === "priority" && <span className="badge badge-priority ml-1">P</span>}
                          </td>
                          <td>
                            <div className="cell-primary">{t.patient_name}</div>
                            <div className="cell-secondary">{t.patient_mobile}</div>
                          </td>
                          <td className="cell-secondary">{SYMPTOM_ICONS[t.symptom_category] || ""} {t.symptom_category}</td>
                          <td style={{ fontWeight: 700, color: "var(--warning)" }}>~{Math.round(t.live_eta_minutes)} min</td>
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
