import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { getSocket } from "../lib/socket";

const SYMPTOM_OPTIONS = [
  { code: "CARD", label: "Chest Pain / Heart Issues", icon: "❤️", desc: "Chest pain, palpitations, shortness of breath", critical: true },
  { code: "ORTH", label: "Bone / Joint / Injury", icon: "🦴", desc: "Bone pain, fractures, sprains, joint issues, back pain" },
  { code: "NEUR", label: "Head / Neurological", icon: "🧠", desc: "Headache, dizziness, seizures, numbness, memory issues" },
  { code: "PEDI", label: "Child / Infant Care", icon: "👶", desc: "Child illness, vaccination, growth concerns (0-16 yrs)" },
  { code: "GENM", label: "Other / General", icon: "🩺", desc: "Fever, cold, cough, infections, general checkup" },
];

const PRIORITY_REASONS = [
  { value: "", label: "Normal" },
  { value: "elderly", label: "Elderly (65+)" },
  { value: "pregnant", label: "Pregnant" },
];

export default function ReceptionPage({ auth, onLogout }) {
  const [panelData, setPanelData] = useState(null);

  // Form
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [symptom, setSymptom] = useState("");
  const [priorityReason, setPriorityReason] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [lastIssued, setLastIssued] = useState(null);

  // Filter
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchPanel = useCallback(async () => {
    try {
      const data = await api.getReceptionPanel();
      setPanelData(data);
    } catch (err) {
      console.error("Failed to load panel:", err);
    }
  }, []);

  useEffect(() => {
    fetchPanel();

    // Listen for Socket.IO queue updates
    const socket = getSocket();
    if (socket) {
      const handler = () => fetchPanel();
      socket.on("queue:update", handler);
      return () => socket.off("queue:update", handler);
    }
  }, [fetchPanel]);

  async function handleIssue(e) {
    e.preventDefault();
    if (!patientName.trim() || !patientMobile.trim() || !symptom) return;
    setIssuing(true);
    try {
      const result = await api.issueToken({
        patientName: patientName.trim(),
        patientMobile: patientMobile.trim(),
        symptomCategory: symptom,
        priorityReason: priorityReason || undefined,
      });
      setLastIssued(result);
      setPatientName("");
      setPatientMobile("");
      setSymptom("");
      setPriorityReason("");
      fetchPanel();
    } catch (err) {
      alert(err.message);
    } finally {
      setIssuing(false);
    }
  }

  async function handleCancel(id) {
    if (!confirm("Cancel this token?")) return;
    try {
      await api.cancelToken(id);
      fetchPanel();
    } catch (err) {
      alert(err.message);
    }
  }

  const stats = panelData?.stats || {};
  const tokens = panelData?.tokens || [];
  const departments = panelData?.departments || [];
  const doctors = panelData?.doctors || [];

  // Build lookup maps
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));
  const docMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

  // Filter tokens
  const filteredTokens = tokens.filter((t) => {
    if (filterDept && t.department_id !== filterDept) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  const initials = (auth.user.hospitalName || "MH").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="app-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1><span>MediSync</span><span>OPD</span></h1>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{auth.user.hospitalName || "Hospital"}</div>
            <div className="sidebar-user-role">Reception Desk</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-section">
            <div className="sidebar-section-title">Queue Management</div>
            <button className="sidebar-link active">
              <span className="link-icon">📋</span> Register Patient
            </button>
            <a className="sidebar-link" href="/dashboard">
              <span className="link-icon">📊</span> Analytics Dashboard
            </a>
            <a className="sidebar-link" href="/display">
              <span className="link-icon">📺</span> Display Board
            </a>
          </div>
          <div className="sidebar-section">
            <div className="sidebar-section-title">Information</div>
            <button className="sidebar-link" onClick={fetchPanel}>
              <span className="link-icon">🔄</span> Refresh Data
            </button>
          </div>
        </nav>
        <div className="sidebar-footer">
          <button className="btn btn-outline w-full" onClick={onLogout}>Logout</button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="main-content">
        <div className="topbar">
          <div className="topbar-left">
            <div className="topbar-title">Reception Panel</div>
            <div className="topbar-breadcrumb">Queue Management / Register & Monitor</div>
          </div>
          <div className="topbar-right">
            <div className="topbar-status">
              <span className="pulse-dot"></span>
              Live Queue
            </div>
            <div className="topbar-badge">{stats.waiting || 0}</div>
            <div className="topbar-hospital-tag">{auth.user.hospitalName}</div>
          </div>
        </div>

        <div className="page-container">
          {/* Stats bar */}
          <div className="stats-grid">
            <div className="stat-card purple">
              <div className="stat-card-label">Total Cases</div>
              <div className="stat-value">{stats.total || 0}</div>
              <div className="stat-sublabel">Today's patients</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-card-label">Waiting</div>
              <div className="stat-value">{stats.waiting || 0}</div>
              <div className="stat-sublabel">In queue</div>
            </div>
            <div className="stat-card green">
              <div className="stat-card-label">Completed</div>
              <div className="stat-value">{stats.completed || 0}</div>
              <div className="stat-sublabel">Consultations done</div>
            </div>
            <div className="stat-card orange">
              <div className="stat-card-label">Cancelled</div>
              <div className="stat-value">{stats.cancelled || 0}</div>
              <div className="stat-sublabel">Dropped tokens</div>
            </div>
          </div>

          <div className="page-grid">
          {/* ── Left: Issue Token ─────────────────────────────── */}
          <div>
            <div className="card">
              <div className="card-header">Register Patient</div>
              <div className="card-body">
                <form onSubmit={handleIssue}>
                  <div className="form-group">
                    <label className="form-label">Patient Name *</label>
                    <input className="form-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" required />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Mobile Number *</label>
                    <input className="form-input" type="tel" value={patientMobile} onChange={(e) => setPatientMobile(e.target.value)} placeholder="10-digit mobile" required pattern="[0-9]{10}" maxLength={10} />
                  </div>

                  <div className="form-group">
                    <label className="form-label">What's the issue? *</label>
                    <div className="symptom-grid">
                      {SYMPTOM_OPTIONS.map((s) => (
                        <button
                          key={s.code}
                          type="button"
                          className={`symptom-card ${symptom === s.code ? "selected" : ""} ${s.critical ? "critical" : ""}`}
                          onClick={() => setSymptom(s.code)}
                        >
                          <span className="symptom-icon">{s.icon}</span>
                          <span className="symptom-label">{s.label}</span>
                        </button>
                      ))}
                    </div>
                    {symptom && (
                      <p className="symptom-desc">{SYMPTOM_OPTIONS.find((s) => s.code === symptom)?.desc}</p>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <div className="priority-row">
                      {PRIORITY_REASONS.map((p) => (
                        <button
                          key={p.value}
                          type="button"
                          className={`priority-btn ${priorityReason === p.value ? "selected" : ""}`}
                          onClick={() => setPriorityReason(p.value)}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                    {symptom === "CARD" && (
                      <p className="priority-auto-note">Cardiac cases are automatically marked as priority.</p>
                    )}
                  </div>

                  <button className="btn btn-primary btn-lg w-full" type="submit" disabled={issuing || !symptom || !patientName.trim() || !patientMobile.trim()}>
                    {issuing ? "Issuing..." : "Issue Token"}
                  </button>
                </form>
              </div>
            </div>

            {/* Token issued confirmation */}
            {lastIssued && (
              <div className="card mt-4 token-confirmation">
                <div className="card-body text-center">
                  <div className="confirmation-badge">Token Issued</div>
                  <div className="confirmation-token">{lastIssued.token.token_number}</div>
                  <div className="confirmation-patient">{lastIssued.token.patient_name}</div>
                  <div className="confirmation-details">
                    <div><strong>Doctor:</strong> {lastIssued.doctor.name}</div>
                    <div><strong>Room:</strong> {lastIssued.doctor.room_number}</div>
                    <div><strong>Dept:</strong> {lastIssued.department.name}</div>
                    <div><strong>Est. Wait:</strong> ~{Math.round(lastIssued.eta)} min</div>
                    <div><strong>Position:</strong> #{lastIssued.positionInQueue}</div>
                  </div>
                  <div className="confirmation-sms">
                    SMS/WhatsApp notification queued for {lastIssued.token.patient_mobile}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Queue ──────────────────────────────────── */}
          <div>
            <div className="card">
              <div className="card-header">
                Today's Queue
                <span className="badge badge-waiting">{filteredTokens.length} tokens</span>
              </div>
              <div className="card-body">
                <div className="filter-row">
                  <select className="form-select form-select-sm" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select className="form-select form-select-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="waiting">Waiting</option>
                    <option value="in_consultation">In Consultation</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                {filteredTokens.length === 0 ? (
                  <div className="empty-state">No tokens yet</div>
                ) : (
                  <div className="queue-scroll">
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>Token</th>
                          <th>Patient</th>
                          <th>Doctor / Room</th>
                          <th>Status</th>
                          <th>Time</th>
                          <th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTokens.map((t) => (
                          <tr key={t.id} className={t.priority === "priority" ? "row-priority" : ""}>
                            <td>
                              <span className="token-number">{t.token_number}</span>
                              {t.priority === "priority" && <span className="badge badge-priority">P</span>}
                            </td>
                            <td>
                              <div className="cell-primary">{t.patient_name}</div>
                              <div className="cell-secondary">{t.patient_mobile}</div>
                            </td>
                            <td>
                              <div className="cell-primary">{docMap[t.doctor_id]?.name || "—"}</div>
                              <div className="cell-secondary">Room {t.room_number} · {deptMap[t.department_id]?.name}</div>
                            </td>
                            <td><span className={`badge badge-${t.status}`}>{t.status.replace("_", " ")}</span></td>
                            <td className="cell-secondary">{new Date(t.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>
                              {t.status === "waiting" && (
                                <button className="btn btn-danger btn-sm" onClick={() => handleCancel(t.id)}>Cancel</button>
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
      </div>
    </div>
    </div>
  );
}
