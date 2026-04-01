import { useState, useEffect, useCallback, useRef } from "react";
import { getHospitals, issuePatientToken, getTokenStatus } from "./lib/api";
import { loadBooking, saveBooking, loadLastHospital, saveLastHospital } from "./lib/storage";

const SYMPTOMS = [
  { code: "CARD", label: "Chest Pain", desc: "Heart issues, tightness, palpitations, shortness of breath", emoji: "\u2764\uFE0F", accent: "#ef4444" },
  { code: "ORTH", label: "Bone & Joint", desc: "Fracture, joint pain, swelling, sports injury", emoji: "\uD83E\uDDB4", accent: "#f97316" },
  { code: "NEUR", label: "Head & Neuro", desc: "Severe headache, dizziness, numbness, weakness", emoji: "\uD83E\uDDE0", accent: "#8b5cf6" },
  { code: "PEDI", label: "Child / Infant", desc: "Illness or injury in children under 14", emoji: "\uD83D\uDC76", accent: "#06b6d4" },
  { code: "GENM", label: "General / Other", desc: "Fever, cough, cold, weakness, or anything else", emoji: "\uD83E\uDE7A", accent: "#10b981" },
];

const TERMINAL = new Set(["completed", "cancelled"]);

function statusLabel(s) {
  return { waiting: "Waiting", in_consultation: "You're being seen", completed: "Completed", cancelled: "Cancelled" }[s] || s;
}

/* ── Hospital selection ─────────────────────────────────────────── */
function HospitalScreen({ onSelect }) {
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getHospitals()
      .then(setHospitals)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <div className="brand">
        <span className="brand-icon">{"\uD83C\uDFE5"}</span>
        <h1 className="brand-title">MediSync OPD</h1>
        <p className="brand-sub">Book your token — skip the queue</p>
      </div>
      {loading && <p className="msg-muted">Loading hospitals…</p>}
      {error && <p className="msg-error">{error}</p>}
      <div className="list">
        {hospitals.map((h) => (
          <button key={h.id} className="card" onClick={() => onSelect(h)}>
            <span className="card-emoji">{"\uD83C\uDFE5"}</span>
            <div className="card-body">
              <p className="card-title">{h.name}</p>
              <p className="card-sub">{h.code}</p>
            </div>
            <span className="chevron">{"\u203A"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Symptom selection ──────────────────────────────────────────── */
function SymptomScreen({ hospital, onSelect, onBack }) {
  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack}>{"\u2190"} Back</button>
      <div className="screen-head">
        <p className="screen-label">{hospital.name}</p>
        <h2 className="screen-title">What brings you in?</h2>
        <p className="screen-sub">Pick your closest match — we'll assign the right doctor</p>
      </div>
      <div className="list">
        {SYMPTOMS.map((s) => (
          <button
            key={s.code}
            className="card card--symptom"
            style={{ "--accent": s.accent }}
            onClick={() => onSelect(s)}
          >
            <span className="card-emoji">{s.emoji}</span>
            <div className="card-body">
              <p className="card-title">{s.label}</p>
              <p className="card-sub">{s.desc}</p>
            </div>
            <span className="chevron">{"\u203A"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Patient details form ───────────────────────────────────────── */
function FormScreen({ hospital, symptom, onSubmit, onBack }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    const trimName = name.trim();
    const trimPhone = phone.trim().replace(/\D/g, "");
    if (!trimName) return setError("Please enter your name");
    if (trimPhone.length < 10) return setError("Please enter a valid 10-digit mobile number");
    setError("");
    setLoading(true);
    try {
      const result = await issuePatientToken({
        hospitalId: hospital.id,
        patientName: trimName,
        patientMobile: trimPhone,
        symptomCategory: symptom.code,
      });
      onSubmit(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="screen">
      <button className="back-btn" onClick={onBack}>{"\u2190"} Back</button>
      <div className="screen-head">
        <p className="screen-label">{hospital.name} {"\u00B7"} {symptom.label}</p>
        <h2 className="screen-title">Your Details</h2>
        <p className="screen-sub">No account needed — just your name and number</p>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label">Full Name</label>
          <input
            className="field-input"
            type="text"
            placeholder="e.g. Riya Sharma"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label className="field-label">Mobile Number</label>
          <input
            className="field-input"
            type="tel"
            placeholder="10-digit mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="numeric"
          />
        </div>
        {error && <p className="msg-error">{error}</p>}
        <button className="btn-primary" type="submit" disabled={loading}>
          {loading ? "Booking\u2026" : "Get My Token \u2192"}
        </button>
      </form>
    </div>
  );
}

/* ── Token confirmation + live tracking ─────────────────────────── */
function TokenScreen({ booking, hospital, onReset }) {
  const [status, setStatus] = useState(booking);
  const intervalRef = useRef(null);

  const poll = useCallback(async () => {
    try {
      const updated = await getTokenStatus(booking.token.id);
      setStatus(updated);
      if (TERMINAL.has(updated.token?.status)) {
        clearInterval(intervalRef.current);
      }
    } catch {
      // keep existing state on network error
    }
  }, [booking.token.id]);

  useEffect(() => {
    intervalRef.current = setInterval(poll, 5000);
    return () => clearInterval(intervalRef.current);
  }, [poll]);

  const token = status.token;
  const isTerminal = TERMINAL.has(token?.status);

  return (
    <div className="screen screen--token">
      <div className="token-card">
        <p className="token-hosp">{hospital.name}</p>
        <div className="token-number">{token.token_number}</div>
        <span className={`status-badge status-badge--${token.status}`}>
          {statusLabel(token.status)}
        </span>
      </div>

      <div className="detail-list">
        <div className="detail-row">
          <span className="detail-emoji">{"\uD83D\uDC68\u200D\u2695\uFE0F"}</span>
          <div>
            <p className="detail-label">Doctor</p>
            <p className="detail-val">{status.doctor?.name || "\u2014"}</p>
            <p className="detail-sub">{status.doctor?.qualification}</p>
          </div>
        </div>

        <div className="detail-row">
          <span className="detail-emoji">{"\uD83D\uDEAA"}</span>
          <div>
            <p className="detail-label">Room</p>
            <p className="detail-val">Room {status.doctor?.room_number || "\u2014"}</p>
          </div>
        </div>

        {token.status === "waiting" && status.positionInQueue != null && (
          <div className="detail-row detail-row--hi">
            <span className="detail-emoji">{"\uD83D\uDD22"}</span>
            <div>
              <p className="detail-label">Queue Position</p>
              <p className="detail-val">#{status.positionInQueue} in line</p>
            </div>
          </div>
        )}

        {token.status === "waiting" && status.eta != null && (
          <div className="detail-row">
            <span className="detail-emoji">{"\u23F1\uFE0F"}</span>
            <div>
              <p className="detail-label">Estimated Wait</p>
              <p className="detail-val">
                {status.eta === 0 ? "You're next!" : `~${status.eta} min`}
              </p>
            </div>
          </div>
        )}

        {token.status === "in_consultation" && (
          <div className="detail-row detail-row--active">
            <span className="detail-emoji">{"\u2705"}</span>
            <div>
              <p className="detail-label">Action Required</p>
              <p className="detail-val">Please proceed to Room {status.doctor?.room_number}</p>
            </div>
          </div>
        )}

        {token.status === "completed" && (
          <div className="detail-row detail-row--done">
            <span className="detail-emoji">{"\uD83C\uDF89"}</span>
            <div>
              <p className="detail-val">Consultation complete</p>
              <p className="detail-sub">Thank you for using MediSync OPD</p>
            </div>
          </div>
        )}
      </div>

      {!isTerminal && (
        <p className="live-dot">{"\u25CF"} Updating every 5 seconds</p>
      )}

      <button className="btn-secondary" onClick={onReset}>
        Book Another Token
      </button>
    </div>
  );
}

/* ── Root app ───────────────────────────────────────────────────── */
export default function App() {
  const [screen, setScreen] = useState("hospital");
  const [hospital, setHospital] = useState(() => loadLastHospital());
  const [symptom, setSymptom] = useState(null);
  const [booking, setBooking] = useState(() => loadBooking());

  useEffect(() => {
    const saved = loadBooking();
    if (saved && !TERMINAL.has(saved.token?.status)) {
      setHospital(saved.hospital);
      setBooking(saved);
      setScreen("token");
    }
  }, []);

  function handleHospitalSelect(h) {
    setHospital(h);
    saveLastHospital(h);
    setScreen("symptom");
  }

  function handleSymptomSelect(s) {
    setSymptom(s);
    setScreen("form");
  }

  function handleTokenIssued(result) {
    const full = { ...result, hospital };
    saveBooking(full);
    setBooking(full);
    setScreen("token");
  }

  function handleReset() {
    saveBooking(null);
    setBooking(null);
    setSymptom(null);
    setScreen("hospital");
  }

  return (
    <div className="app">
      {screen === "hospital" && (
        <HospitalScreen onSelect={handleHospitalSelect} />
      )}
      {screen === "symptom" && hospital && (
        <SymptomScreen
          hospital={hospital}
          onSelect={handleSymptomSelect}
          onBack={() => setScreen("hospital")}
        />
      )}
      {screen === "form" && hospital && symptom && (
        <FormScreen
          hospital={hospital}
          symptom={symptom}
          onSubmit={handleTokenIssued}
          onBack={() => setScreen("symptom")}
        />
      )}
      {screen === "token" && booking && hospital && (
        <TokenScreen
          booking={booking}
          hospital={hospital}
          onReset={handleReset}
        />
      )}
    </div>
  );
}
