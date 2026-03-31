import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { createOpdStream } from "../lib/sse";

const FALLBACK_POLL_MS = 8000;

function formatTime(date) {
  return new Date(date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DisplayPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

  // If no hospitalId, show selector
  if (!hospitalId) return <HospitalSelector onSelect={(id) => navigate(`/display/${id}`)} />;
  return <DisplayBoard hospitalId={hospitalId} />;
}

/* ── Hospital Selector ──────────────────────────────────────────── */

function HospitalSelector({ onSelect }) {
  const [hospitals, setHospitals] = useState([]);

  useEffect(() => {
    api.getHospitals().then(setHospitals).catch(() => {});
  }, []);

  return (
    <div className="display-selector">
      <div className="selector-card">
        <h1>OPD Queue Display</h1>
        <p>Select a hospital to view the live patient queue board</p>
        {hospitals.length === 0 ? (
          <div className="text-center" style={{ color: "rgba(255,255,255,0.4)" }}>Loading hospitals...</div>
        ) : (
          hospitals.map((h) => (
            <button key={h.id} className="hospital-option" onClick={() => onSelect(h.id)}>
              {h.name}
              <small>{h.address || h.code}</small>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/* ── Display Board (the showstopper) ────────────────────────────── */

function DisplayBoard({ hospitalId }) {
  const [queueData, setQueueData] = useState({ tokens: [], stats: { total: 0, waiting: 0, inConsultation: 0, completed: 0, avgConsultationSeconds: 300 } });
  const [sseConnected, setSseConnected] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState("all");
  const [nowServingTimer, setNowServingTimer] = useState(0);
  const timerRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.getDisplayData(hospitalId);
      setQueueData(data);
    } catch {
      // retry silently
    }
  }, [hospitalId]);

  // Initial fetch + poll fallback
  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, FALLBACK_POLL_MS);
    return () => clearInterval(timer);
  }, [fetchData]);

  // SSE stream
  useEffect(() => {
    const close = createOpdStream(`/api/display/${hospitalId}/stream`, {
      onEvent: () => fetchData(),
      onOpen: () => setSseConnected(true),
      onError: () => setSseConnected(false),
    });
    return close;
  }, [hospitalId, fetchData]);

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Build department list from tokens
  const departments = [];
  const deptMap = {};
  for (const t of queueData.tokens) {
    const deptId = t.department_id;
    const deptName = t.departments?.name || "Unknown";
    if (!deptMap[deptId]) {
      deptMap[deptId] = deptName;
      departments.push({ id: deptId, name: deptName });
    }
  }

  // Filter tokens by department
  const filteredTokens = selectedDept === "all"
    ? queueData.tokens
    : queueData.tokens.filter((t) => t.department_id === selectedDept);

  const nowServing = filteredTokens.filter((t) => t.status === "in_consultation");
  const upcoming = filteredTokens.filter((t) => t.status === "waiting");
  const currentPatient = nowServing[0] || null;
  const avgMin = Math.round((queueData.stats?.avgConsultationSeconds || 300) / 60);

  // Timer for now-serving patient
  useEffect(() => {
    clearInterval(timerRef.current);
    if (currentPatient?.called_at) {
      const start = new Date(currentPatient.called_at).getTime();
      timerRef.current = setInterval(() => {
        setNowServingTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      setNowServingTimer(Math.floor((Date.now() - start) / 1000));
    } else {
      setNowServingTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [currentPatient?.id, currentPatient?.called_at]);

  const { stats } = queueData;

  return (
    <div className="display-page">
      {/* Header */}
      <div className="display-header">
        <div>
          <div className="display-hospital">🏥 OPD Queue Display</div>
          <div className="display-subtitle">Live Patient Queue Board</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="sse-indicator">
            <span className={`sse-dot ${sseConnected ? "" : "disconnected"}`} />
            {sseConnected ? "LIVE" : "Reconnecting..."}
          </div>
          <div className="display-clock">
            {clock.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
          </div>
        </div>
      </div>

      {/* Department tabs */}
      <div className="display-dept-tabs">
        <button className={`display-dept-tab ${selectedDept === "all" ? "active" : ""}`} onClick={() => setSelectedDept("all")}>
          All Departments
        </button>
        {departments.map((d) => (
          <button key={d.id} className={`display-dept-tab ${selectedDept === d.id ? "active" : ""}`} onClick={() => setSelectedDept(d.id)}>
            {d.name}
          </button>
        ))}
      </div>

      {/* Main display area */}
      <div className="display-body">
        {/* Now Serving */}
        <div className="display-now-serving">
          {currentPatient ? (
            <>
              <div className="now-serving-label">
                <span className="now-serving-pulse" />
                Now Serving
              </div>
              <div className="now-serving-token">
                #{String(currentPatient.token_number).padStart(3, "0")}
              </div>
              <div className="now-serving-name">{currentPatient.patient_name}</div>
              <div className="now-serving-doctor">
                {currentPatient.doctors?.full_name ? `Dr. ${currentPatient.doctors.full_name}` : ""}
              </div>
              <div className="now-serving-dept">{currentPatient.departments?.name || ""}</div>
              <div className="now-serving-timer">⏱ {formatTimer(nowServingTimer)}</div>

              {/* Show other in-consultation tokens if multiple */}
              {nowServing.length > 1 && (
                <div style={{ marginTop: 20, width: "100%" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "center" }}>
                    Also in consultation
                  </div>
                  {nowServing.slice(1).map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(34,197,94,0.08)", borderRadius: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>#{String(t.token_number).padStart(3, "0")}</span>
                      <span style={{ fontSize: 14 }}>{t.patient_name}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>{t.departments?.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="now-serving-empty">
              <div className="icon">⏳</div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>No patient in consultation</div>
              <div style={{ fontSize: 14, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>Waiting for the next patient to be called</div>
            </div>
          )}
        </div>

        {/* Upcoming Queue */}
        <div className="display-upcoming">
          <h2>Upcoming · {upcoming.length} waiting</h2>
          {upcoming.length === 0 ? (
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", padding: 40, fontSize: 16 }}>
              No patients waiting
            </div>
          ) : (
            <ul className="upcoming-list">
              {upcoming.map((t, idx) => (
                <li key={t.id} className="upcoming-item">
                  <span className="upcoming-token">#{String(t.token_number).padStart(3, "0")}</span>
                  <span className="upcoming-name">{t.patient_name}</span>
                  <span className="upcoming-dept">{t.departments?.name || ""}</span>
                  <span className="upcoming-wait">~{(idx + 1) * avgMin} min</span>
                  {t.priority === "priority" && <span className="upcoming-priority">Priority</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="display-footer">
        <div className="display-stat">
          <div className="display-stat-value">{stats?.total || 0}</div>
          <div className="display-stat-label">Total Today</div>
        </div>
        <div className="display-stat">
          <div className="display-stat-value" style={{ color: "#22c55e" }}>{stats?.completed || 0}</div>
          <div className="display-stat-label">Served</div>
        </div>
        <div className="display-stat">
          <div className="display-stat-value" style={{ color: "#f4b400" }}>{stats?.waiting || 0}</div>
          <div className="display-stat-label">Waiting</div>
        </div>
        <div className="display-stat">
          <div className="display-stat-value">{avgMin}<span style={{ fontSize: 14 }}> min</span></div>
          <div className="display-stat-label">Avg Consultation</div>
        </div>
      </div>
    </div>
  );
}
