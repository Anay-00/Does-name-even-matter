import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { io } from "socket.io-client";

function formatTimer(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DisplayPage() {
  const { hospitalId } = useParams();
  const navigate = useNavigate();

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

/* ── Display Board ──────────────────────────────────────────────── */

function DisplayBoard({ hospitalId }) {
  const [data, setData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [clock, setClock] = useState(new Date());
  const [selectedDept, setSelectedDept] = useState("all");
  const [nowServingTimer, setNowServingTimer] = useState(0);
  const timerRef = useRef(null);
  const socketRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const d = await api.getDisplayData(hospitalId);
      setData(d);
    } catch {
      // silent
    }
  }, [hospitalId]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Socket.IO for real-time updates (anonymous — no auth needed for display)
  useEffect(() => {
    const socket = io("/", {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("join:hospital", hospitalId);
    });
    socket.on("disconnect", () => setConnected(false));
    socket.on("queue:update", () => fetchData());

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [hospitalId, fetchData]);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Derived data
  const departments = data?.departments || [];
  const doctors = data?.doctors || [];
  const active = data?.active || [];
  const docMap = Object.fromEntries(doctors.map((d) => [d.id, d]));

  // Filter by department
  const filtered = selectedDept === "all"
    ? active
    : active.filter((t) => t.department_id === selectedDept);

  const nowServing = filtered.filter((t) => t.status === "in_consultation");
  const upcoming = filtered.filter((t) => t.status === "waiting");
  const currentPatient = nowServing[0] || null;

  // Timer for now-serving
  useEffect(() => {
    clearInterval(timerRef.current);
    const startField = currentPatient?.consultation_started_at || currentPatient?.called_at;
    if (startField) {
      const start = new Date(startField).getTime();
      timerRef.current = setInterval(() => {
        setNowServingTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      setNowServingTimer(Math.floor((Date.now() - start) / 1000));
    } else {
      setNowServingTimer(0);
    }
    return () => clearInterval(timerRef.current);
  }, [currentPatient?.id, currentPatient?.consultation_started_at, currentPatient?.called_at]);

  const totalToday = data?.totalToday || 0;
  const completedToday = data?.completedToday || 0;
  const waitingCount = upcoming.length;

  return (
    <div className="display-page">
      {/* Header */}
      <div className="display-header">
        <div>
          <div className="display-hospital">🏥 OPD Queue Display</div>
          <div className="display-subtitle">Live Patient Queue Board</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444", display: "inline-block" }} />
            {connected ? "LIVE" : "Reconnecting..."}
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
              <div className="now-serving-token">{currentPatient.token_number}</div>
              <div className="now-serving-name">{currentPatient.patient_name}</div>
              <div className="now-serving-doctor">{currentPatient.doctor_name || ""}</div>
              <div className="now-serving-dept">
                {currentPatient.department_name || ""} · Room {currentPatient.doctor_room || currentPatient.room_number}
              </div>
              <div className="now-serving-timer">⏱ {formatTimer(nowServingTimer)}</div>

              {nowServing.length > 1 && (
                <div style={{ marginTop: 20, width: "100%" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8, textAlign: "center" }}>
                    Also in consultation
                  </div>
                  {nowServing.slice(1).map((t) => (
                    <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "rgba(34,197,94,0.08)", borderRadius: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 20, fontWeight: 800, color: "#22c55e" }}>{t.token_number}</span>
                      <span style={{ fontSize: 14 }}>{t.patient_name}</span>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginLeft: "auto" }}>{t.department_name}</span>
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
              {upcoming.map((t, idx) => {
                const doc = docMap[t.doctor_id];
                const avgMin = doc?.avg_consultation_minutes || t.doctor_avg_minutes || 10;
                return (
                  <li key={t.id} className="upcoming-item">
                    <span className="upcoming-token">{t.token_number}</span>
                    <span className="upcoming-name">{t.patient_name}</span>
                    <span className="upcoming-dept">{t.department_name || ""} · Room {t.doctor_room || t.room_number}</span>
                    <span className="upcoming-wait">~{Math.round(avgMin * (idx + 1))} min</span>
                    {t.priority === "priority" && <span className="upcoming-priority">Priority</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="display-footer">
        <div className="display-stat">
          <div className="display-stat-value">{totalToday}</div>
          <div className="display-stat-label">Total Today</div>
        </div>
        <div className="display-stat">
          <div className="display-stat-value" style={{ color: "#22c55e" }}>{completedToday}</div>
          <div className="display-stat-label">Served</div>
        </div>
        <div className="display-stat">
          <div className="display-stat-value" style={{ color: "#f4b400" }}>{waitingCount}</div>
          <div className="display-stat-label">Waiting</div>
        </div>
        <div className="display-stat">
          <div className="display-stat-value">{nowServing.length}</div>
          <div className="display-stat-label">In Consultation</div>
        </div>
      </div>
    </div>
  );
}
