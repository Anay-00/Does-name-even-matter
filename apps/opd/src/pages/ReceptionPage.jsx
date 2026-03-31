import React, { useState, useEffect, useCallback } from "react";
import { api } from "../lib/api";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const POLL_INTERVAL = 4000;
const PIE_COLORS = ["#1a73e8", "#0f9d58", "#f4b400", "#db4437", "#7c3aed", "#ec4899", "#06b6d4", "#84cc16"];

export default function ReceptionPage({ auth, onLogout }) {
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [stats, setStats] = useState(null);

  // Form state
  const [deptId, setDeptId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [priority, setPriority] = useState("normal");
  const [issuing, setIssuing] = useState(false);
  const [lastIssued, setLastIssued] = useState(null);

  // Filter state
  const [filterDept, setFilterDept] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [tkns, st] = await Promise.all([api.getTokens(), api.getStats()]);
      setTokens(tkns);
      setStats(st);
    } catch {
      // silently retry
    }
  }, []);

  useEffect(() => {
    api.getDepartments().then(setDepartments).catch(() => {});
    fetchData();
    const timer = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, [fetchData]);

  // Load doctors when department changes
  useEffect(() => {
    if (!deptId) { setDoctors([]); return; }
    const dept = departments.find((d) => d.id === deptId);
    if (dept) {
      api.getDoctors(dept.name).then(setDoctors).catch(() => setDoctors([]));
    }
  }, [deptId, departments]);

  async function handleIssue(e) {
    e.preventDefault();
    setIssuing(true);
    try {
      const token = await api.issueToken({
        departmentId: deptId,
        doctorId: doctorId || undefined,
        patientName,
        patientAge: patientAge ? parseInt(patientAge) : undefined,
        patientGender: patientGender || undefined,
        patientPhone: patientPhone || undefined,
        priority,
      });
      setLastIssued(token);
      setPatientName("");
      setPatientAge("");
      setPatientGender("");
      setPatientPhone("");
      setPriority("normal");
      setDoctorId("");
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setIssuing(false);
    }
  }

  async function handleCancel(id) {
    try {
      await api.cancelToken(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSkip(id) {
    try {
      await api.skipToken(id);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  }

  // Filtered tokens
  const filteredTokens = tokens.filter((t) => {
    if (filterDept && t.department_id !== filterDept) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    return true;
  });

  // Stats charts data
  const hourlyData = stats?.hourlyArrivals
    ? stats.hourlyArrivals.map((count, hour) => ({ hour: `${hour}:00`, count })).filter((d) => d.count > 0)
    : [];

  const deptDistData = stats?.deptCounts
    ? Object.entries(stats.deptCounts).map(([deptId, count]) => {
        const dept = departments.find((d) => d.id === deptId);
        return { name: dept?.name || "Unknown", value: count };
      })
    : [];

  return (
    <>
      <nav className="navbar">
        <div className="navbar-brand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          MediSync OPD
        </div>
        <div className="navbar-info">
          <span className="navbar-hospital">{auth.user.hospitalName}</span>
          <span>Reception Desk</span>
          <button className="btn btn-outline btn-sm" onClick={onLogout}>Logout</button>
        </div>
      </nav>

      <div className="page-container">
        {/* Stats cards */}
        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value" style={{ color: "var(--primary)" }}>{stats.total}</div>
              <div className="stat-label">Total Tokens</div>
            </div>
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
              <div className="stat-value" style={{ color: "var(--purple)" }}>{Math.round(stats.avgConsultationSeconds / 60)}<span style={{ fontSize: 14, fontWeight: 500 }}> min</span></div>
              <div className="stat-label">Avg Consultation</div>
            </div>
          </div>
        )}

        <div className="page-grid">
          {/* ── Left: Issue Token Form ──────────────────────────── */}
          <div>
            <div className="card">
              <div className="card-header">
                Issue New Token
                {lastIssued && (
                  <span className="badge badge-waiting">Last: #{String(lastIssued.token_number).padStart(3, "0")}</span>
                )}
              </div>
              <div className="card-body">
                <form onSubmit={handleIssue}>
                  <div className="form-group">
                    <label className="form-label">Department *</label>
                    <select className="form-select" value={deptId} onChange={(e) => setDeptId(e.target.value)} required>
                      <option value="">Select department</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Doctor (optional)</label>
                    <select className="form-select" value={doctorId} onChange={(e) => setDoctorId(e.target.value)}>
                      <option value="">Auto-assign</option>
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>{d.full_name} — {d.specialization}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Patient Name *</label>
                    <input className="form-input" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="Full name" required />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Age</label>
                      <input className="form-input" type="number" min="0" max="150" value={patientAge} onChange={(e) => setPatientAge(e.target.value)} placeholder="Age" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Gender</label>
                      <select className="form-select" value={patientGender} onChange={(e) => setPatientGender(e.target.value)}>
                        <option value="">Select</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Phone</label>
                    <input className="form-input" type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="Mobile number" />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Priority</label>
                    <select className="form-select" value={priority} onChange={(e) => setPriority(e.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="priority">Priority (Senior / Disabled)</option>
                    </select>
                  </div>

                  <button className="btn btn-primary btn-lg w-full" type="submit" disabled={issuing || !deptId || !patientName.trim()}>
                    {issuing ? "Issuing..." : "Issue Token"}
                  </button>
                </form>
              </div>
            </div>

            {/* Last issued confirmation */}
            {lastIssued && (
              <div className="card mt-4" style={{ borderColor: "var(--success)", borderWidth: 2 }}>
                <div className="card-body text-center">
                  <div style={{ fontSize: 12, fontWeight: 700, color: "var(--success)", textTransform: "uppercase", letterSpacing: 1 }}>Token Issued Successfully</div>
                  <div style={{ fontSize: 56, fontWeight: 900, color: "var(--primary)", lineHeight: 1, margin: "8px 0" }}>
                    #{String(lastIssued.token_number).padStart(3, "0")}
                  </div>
                  <div style={{ fontWeight: 600 }}>{lastIssued.patient_name}</div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>{lastIssued.departments?.name}</div>
                </div>
              </div>
            )}
          </div>

          {/* ── Right: Queue + Charts ──────────────────────────── */}
          <div>
            {/* Filters */}
            <div className="card mb-4">
              <div className="card-header">Today's Queue</div>
              <div className="card-body">
                <div className="flex gap-2 mb-4 flex-wrap">
                  <select className="form-select" style={{ width: "auto", minWidth: 180 }} value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
                    <option value="">All Departments</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select className="form-select" style={{ width: "auto", minWidth: 160 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="waiting">Waiting</option>
                    <option value="in_consultation">In Consultation</option>
                    <option value="completed">Completed</option>
                    <option value="skipped">Skipped</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  <span style={{ fontSize: 13, color: "var(--text-secondary)", alignSelf: "center" }}>
                    {filteredTokens.length} token{filteredTokens.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {filteredTokens.length === 0 ? (
                  <div className="empty-state">No tokens yet. Issue a token from the left panel.</div>
                ) : (
                  <div style={{ maxHeight: 400, overflowY: "auto" }}>
                    <table className="queue-table">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Patient</th>
                          <th>Department</th>
                          <th>Status</th>
                          <th>Issued</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTokens.map((t) => (
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
                            <td><span className={`badge badge-${t.status}`}>{t.status.replace("_", " ")}</span></td>
                            <td style={{ fontSize: 13, color: "var(--text-secondary)" }}>{new Date(t.issued_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</td>
                            <td>
                              {t.status === "waiting" && (
                                <div className="flex gap-2">
                                  <button className="btn btn-outline btn-sm" onClick={() => handleSkip(t.id)}>Skip</button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(t.id)}>Cancel</button>
                                </div>
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

            {/* Charts */}
            {stats && stats.total > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div className="card">
                  <div className="card-header">Hourly Arrivals</div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={hourlyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="hour" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip />
                        <Bar dataKey="count" fill="#1a73e8" radius={[4, 4, 0, 0]} name="Patients" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="card">
                  <div className="card-header">Department Distribution</div>
                  <div className="card-body">
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={deptDistData} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} fontSize={11}>
                          {deptDistData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
