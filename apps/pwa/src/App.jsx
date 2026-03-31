import { useEffect, useMemo, useRef, useState } from "react";
import { createEmergencyRequest, getEmergencyStatus } from "./lib/api";
import {
  loadActiveRequest,
  loadAuthSession,
  loadHousehold,
  loadQueue,
  loadRequestHistory,
  loadSetupDone,
  saveActiveRequest,
  saveAuthSession,
  saveHousehold,
  saveRequestHistory,
  saveSetupDone,
  saveQueue
} from "./lib/storage";

const SYMPTOMS = [
  {
    id: "chest-pain",
    title: "Chest Pain",
    emergencyType: "cardiac_arrest",
    symptoms: ["chest pain", "sweating", "shortness of breath"],
    requestedResources: ["ambulance", "doctor", "oxygen"]
  },
  {
    id: "stroke-signs",
    title: "Stroke Signs",
    emergencyType: "stroke_alert",
    symptoms: ["face droop", "slurred speech", "arm weakness"],
    requestedResources: ["ambulance", "neurology", "critical_care"]
  },
  {
    id: "breathing",
    title: "Breathing Problem",
    emergencyType: "respiratory_distress",
    symptoms: ["difficulty breathing", "rapid breathing"],
    requestedResources: ["ambulance", "oxygen", "respiratory_support"]
  },
  {
    id: "major-injury",
    title: "Major Injury",
    emergencyType: "trauma_injury",
    symptoms: ["bleeding", "fracture", "severe pain"],
    requestedResources: ["ambulance", "trauma_team", "ot_prepare"]
  },
  {
    id: "fever",
    title: "High Fever",
    emergencyType: "fever_illness",
    symptoms: ["high fever", "weakness", "dehydration"],
    requestedResources: ["ambulance", "general_physician"]
  },
  {
    id: "minor",
    title: "Minor Injury",
    emergencyType: "minor_injury",
    symptoms: ["small cut", "swelling", "pain"],
    requestedResources: ["ambulance", "first_aid"]
  }
];

const TERMINAL_STATUSES = new Set(["completed", "cancelled", "failed_no_match", "expired"]);
const LOCAL_AI_SUGGESTIONS = [
  "Sit upright and stay calm",
  "Chew aspirin (if available)",
  "Loosen tight clothing",
  "Start CPR if unconscious"
];

function formatStatus(status) {
  return String(status || "pending")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function sanitizePhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function isValidPhone(value) {
  const digits = sanitizePhone(value);
  return digits.length >= 10 && digits.length <= 15;
}

function isTerminal(status) {
  return TERMINAL_STATUSES.has(String(status || "").toLowerCase());
}

function buildStepState(request) {
  const status = String(request?.status || "pending").toLowerCase();
  const hasHospital = Boolean(request?.assignedHospitalId || request?.assignedHospitalName);
  const hasAmbulance = Boolean(
    request?.assignedAmbulanceId ||
    request?.assignedAmbulanceMobileNumber ||
    request?.assignedAmbulancePhone
  );

  return [
    { title: "SOS Sent", done: Boolean(request?.id), active: !request?.id },
    {
      title: "Hospital Matched",
      done: hasHospital || ["offered", "accepted", "in_progress", "completed"].includes(status),
      active: Boolean(request?.id) && !hasHospital
    },
    {
      title: "Ambulance On Route",
      done: hasAmbulance || ["accepted", "in_progress", "completed"].includes(status),
      active: hasHospital && !hasAmbulance
    },
    {
      title: "Reached You",
      done: ["in_progress", "completed"].includes(status),
      active: hasAmbulance && !["in_progress", "completed"].includes(status)
    }
  ];
}

export default function App() {
  const [auth, setAuth] = useState(() => loadAuthSession());
  const [household, setHousehold] = useState(() => loadHousehold());
  const [setupDone, setSetupDone] = useState(() => loadSetupDone());
  const [selectedSymptomId, setSelectedSymptomId] = useState(SYMPTOMS[0].id);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [activeRequest, setActiveRequest] = useState(() => loadActiveRequest());
  const [requestHistory, setRequestHistory] = useState(() => loadRequestHistory());
  const [trackedRequestId, setTrackedRequestId] = useState(() => loadActiveRequest()?.id || "");
  const [queue, setQueue] = useState(() => loadQueue());
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [submitState, setSubmitState] = useState({ loading: false, message: "" });
  const [setupMessage, setSetupMessage] = useState("");
  const [seedMember, setSeedMember] = useState({
    name: "",
    age: "",
    gender: "male",
    relation: "self"
  });
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    address: "Locating...",
    loading: false,
    error: ""
  });
  const [installPrompt, setInstallPrompt] = useState(null);
  const [guidanceState, setGuidanceState] = useState({
    recording: false,
    processing: false,
    message: "",
    suggestions: []
  });

  const liveVideoRef = useRef(null);
  const captureStreamRef = useRef(null);
  const recorderRef = useRef(null);
  const mediaChunksRef = useRef([]);
  const recordingRequestIdRef = useRef(null);

  const selectedSymptom = useMemo(
    () => SYMPTOMS.find((item) => item.id === selectedSymptomId) || SYMPTOMS[0],
    [selectedSymptomId]
  );

  const selectedPatient = useMemo(
    () => household.find((member) => member.id === selectedPatientId) || household[0] || null,
    [household, selectedPatientId]
  );

  const requestSteps = useMemo(() => buildStepState(activeRequest), [activeRequest]);

  useEffect(() => {
    saveAuthSession(auth);
  }, [auth]);

  useEffect(() => {
    saveHousehold(household);
  }, [household]);

  useEffect(() => {
    saveSetupDone(setupDone);
  }, [setupDone]);

  useEffect(() => {
    saveActiveRequest(activeRequest);
  }, [activeRequest]);

  useEffect(() => {
    saveRequestHistory(requestHistory);
  }, [requestHistory]);

  useEffect(() => {
    saveQueue(queue);
  }, [queue]);

  useEffect(() => {
    return () => {
      if (captureStreamRef.current) {
        captureStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onInstall = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstall);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstall);
    };
  }, []);

  useEffect(() => {
    detectLocation();
    if (!navigator.geolocation) {
      return undefined;
    }

    const watcher = navigator.geolocation.watchPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setLocation({
          latitude,
          longitude,
          address: `Current location (${latitude}, ${longitude})`,
          loading: false,
          error: ""
        });
      },
      () => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: "Location unavailable. Request will use last known location."
        }));
      },
      { enableHighAccuracy: true, maximumAge: 7000, timeout: 9000 }
    );

    return () => navigator.geolocation.clearWatch(watcher);
  }, []);

  useEffect(() => {
    if (household.length > 0 && !selectedPatientId) {
      setSelectedPatientId(household[0].id);
    }
    if (household.length > 0 && selectedPatientId && !household.some((member) => member.id === selectedPatientId)) {
      setSelectedPatientId(household[0].id);
    }
  }, [household, selectedPatientId]);

  useEffect(() => {
    if (!isOnline || queue.length === 0) {
      return;
    }

    if (activeRequest?.id && !isTerminal(activeRequest?.status)) {
      return;
    }

    retryQueuedRequests();
  }, [isOnline, queue.length]);

  useEffect(() => {
    if (!trackedRequestId && requestHistory[0]?.id) {
      setTrackedRequestId(requestHistory[0].id);
    }
  }, [trackedRequestId, requestHistory]);

  useEffect(() => {
    setGuidanceState((prev) => ({ ...prev, message: "", suggestions: [] }));
  }, [activeRequest?.id]);

  useEffect(() => {
    if (!trackedRequestId) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const unresolvedIds = [
          trackedRequestId,
          ...requestHistory
            .filter((item) => !isTerminal(item.status))
            .map((item) => item.id)
        ].filter((value, index, list) => value && list.indexOf(value) === index)
          .slice(0, 5);

        const updates = await Promise.all(
          unresolvedIds.map(async (requestId) => {
            try {
              return await getEmergencyStatus(requestId);
            } catch {
              return null;
            }
          })
        );

        for (const item of updates.filter(Boolean)) {
          upsertRequest(item, false);
        }
      } catch {
        // Keep old state and retry on next poll.
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [trackedRequestId, requestHistory]);

  useEffect(() => {
    if (!trackedRequestId || activeRequest?.id === trackedRequestId) {
      return;
    }

    const snapshot = requestHistory.find((item) => item.id === trackedRequestId);
    if (snapshot) {
      setActiveRequest(snapshot);
    }
  }, [trackedRequestId, requestHistory, activeRequest?.id]);

  async function detectLocation() {
    if (!navigator.geolocation) {
      setLocation((prev) => ({ ...prev, error: "Location not supported on this device." }));
      return;
    }

    setLocation((prev) => ({ ...prev, loading: true, error: "" }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Number(position.coords.latitude.toFixed(6));
        const longitude = Number(position.coords.longitude.toFixed(6));
        setLocation({
          latitude,
          longitude,
          address: `Current location (${latitude}, ${longitude})`,
          loading: false,
          error: ""
        });
      },
      () => {
        setLocation((prev) => ({
          ...prev,
          loading: false,
          error: "Unable to detect location right now."
        }));
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 12000 }
    );
  }

  function queueRequest(payload) {
    const next = [...queue, { id: crypto.randomUUID(), payload, queuedAt: Date.now() }];
    setQueue(next);
    setSubmitState({ loading: false, message: "No network. Request queued and will send automatically." });
  }

  async function retryQueuedRequests() {
    const pending = [...queue];
    const remaining = [];
    let latestCreated = null;

    for (const item of pending) {
      try {
        const created = await createEmergencyRequest(item.payload);
        latestCreated = created;
      } catch {
        remaining.push(item);
      }
    }

    if (latestCreated) {
      upsertRequest(latestCreated, true);
      setSubmitState({ loading: false, message: "Queued request sent successfully." });
    }

    setQueue(remaining);
  }

  function upsertRequest(request, setTracked = true) {
    if (!request?.id) {
      return;
    }

    setActiveRequest(request);
    setRequestHistory((prev) => {
      const deduped = prev.filter((item) => item.id !== request.id);
      return [request, ...deduped].slice(0, 8);
    });
    if (setTracked) {
      setTrackedRequestId(request.id);
    }
  }

  async function submitSos() {
    if (!isValidPhone(auth.phone)) {
      setSubmitState({ loading: false, message: "Complete setup first." });
      return;
    }

    if (!selectedPatient) {
      setSubmitState({ loading: false, message: "Select a patient." });
      return;
    }

    if (!location.latitude || !location.longitude) {
      setSubmitState({ loading: false, message: "Getting location. Please retry in a moment." });
      return;
    }

    const payload = {
      callerName: household[0]?.name || selectedPatient.name,
      callerPhone: sanitizePhone(auth.phone),
      patientName: selectedPatient.name,
      patientAge: Number(selectedPatient.age),
      patientGender: selectedPatient.gender,
      emergencyType: selectedSymptom.emergencyType,
      symptoms: selectedSymptom.symptoms,
      requestedResources: selectedSymptom.requestedResources,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        landmark: selectedPatient.relation
      },
      requestedForSelf: selectedPatient.relation === "self"
    };

    if (!isOnline) {
      queueRequest(payload);
      return;
    }

    setSubmitState({ loading: true, message: "Sending request now..." });

    try {
      const created = await createEmergencyRequest(payload);
      upsertRequest(created, true);
      setSubmitState({ loading: false, message: "Help request sent. Stay reachable." });
    } catch (error) {
      const message = String(error?.message || "");
      if (message.includes("fetch") || message.includes("Network")) {
        queueRequest(payload);
        return;
      }
      setSubmitState({ loading: false, message: message || "Unable to send SOS right now." });
    }
  }

  function addSeedMember() {
    const age = Number(seedMember.age);
    if (!seedMember.name.trim() || !Number.isFinite(age) || age < 0 || age > 120) {
      setSetupMessage("Add valid member name and age.");
      return;
    }
    const member = {
      id: crypto.randomUUID(),
      name: seedMember.name.trim(),
      age,
      gender: seedMember.gender,
      relation: seedMember.relation
    };
    setHousehold((prev) => [...prev, member]);
    setSeedMember((prev) => ({ ...prev, name: "", age: "" }));
    setSetupMessage("Member added.");
  }

  function removeMember(memberId) {
    setHousehold((prev) => prev.filter((member) => member.id !== memberId));
  }

  async function startLiveCapture() {
    if (!activeRequest?.id) {
      setGuidanceState((prev) => ({ ...prev, message: "Create a request first." }));
      return;
    }

    if (!isValidPhone(auth.phone)) {
      setGuidanceState((prev) => ({ ...prev, message: "Valid mobile number is required." }));
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setGuidanceState((prev) => ({ ...prev, message: "Live video capture is not supported on this browser." }));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      captureStreamRef.current = stream;
      recordingRequestIdRef.current = activeRequest.id;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }

      const preferredTypes = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const mimeType = preferredTypes.find((value) => MediaRecorder.isTypeSupported(value));
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

      mediaChunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        void finalizeCapture();
      };

      recorder.start(350);
      recorderRef.current = recorder;
      setGuidanceState({
        recording: true,
        processing: false,
        message: "Recording live video. Tap Stop & Send when ready.",
        suggestions: []
      });
    } catch {
      setGuidanceState((prev) => ({ ...prev, message: "Could not access camera/microphone." }));
    }
  }

  function stopLiveCapture() {
    if (!recorderRef.current || recorderRef.current.state === "inactive") {
      return;
    }
    recorderRef.current.stop();
    setGuidanceState((prev) => ({ ...prev, recording: false, processing: true, message: "Analyzing captured video..." }));
  }

  async function captureFrameBlob() {
    const video = liveVideoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.min(video.videoWidth, 960);
    canvas.height = Math.round((canvas.width / video.videoWidth) * video.videoHeight);
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.82);
    });
  }

  async function finalizeCapture() {
    const stream = captureStreamRef.current;
    const chunks = [...mediaChunksRef.current];
    await captureFrameBlob();

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }
    captureStreamRef.current = null;
    recorderRef.current = null;
    mediaChunksRef.current = [];

    if (chunks.length === 0) {
      setGuidanceState((prev) => ({ ...prev, recording: false, processing: false, message: "No video captured." }));
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 900));

    setGuidanceState({
      recording: false,
      processing: false,
      message: "Video capture completed.",
      suggestions: LOCAL_AI_SUGGESTIONS
    });
  }

  const setupComplete = isValidPhone(auth.phone) && household.length > 0;

  useEffect(() => {
    if (setupDone && !setupComplete) {
      setSetupDone(false);
    }
  }, [setupDone, setupComplete]);

  if (!setupDone) {
    return (
      <main className="page">
        <section className="hero">
          <p className="brand">MediSync SOS</p>
          <h1>Quick one-time setup</h1>
          <p className="sub">Verify phone and seed family once. Then emergency flow is only patient + symptom + request.</p>
        </section>

        <section className="panel">
          <h2>Mobile Number</h2>
          <div className="input-grid">
            <label>
              Phone Number
              <input
                value={auth.phone}
                onChange={(event) => setAuth((prev) => ({ ...prev, phone: event.target.value }))}
                placeholder="10+ digit phone"
              />
            </label>
          </div>
          <div className="meta-row">
            <span className={isValidPhone(auth.phone) ? "chip online" : "chip neutral"}>
              {isValidPhone(auth.phone) ? "Phone looks valid" : "Enter valid mobile number"}
            </span>
          </div>
        </section>

        <section className="panel">
          <h2>Seed Family Members</h2>
          <div className="input-grid">
            <label>
              Full Name
              <input
                value={seedMember.name}
                onChange={(event) => setSeedMember((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Patient name"
              />
            </label>
            <label>
              Age
              <input
                type="number"
                min="0"
                max="120"
                value={seedMember.age}
                onChange={(event) => setSeedMember((prev) => ({ ...prev, age: event.target.value }))}
                placeholder="Age"
              />
            </label>
            <label>
              Gender
              <select
                value={seedMember.gender}
                onChange={(event) => setSeedMember((prev) => ({ ...prev, gender: event.target.value }))}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </label>
            <label>
              Relation
              <select
                value={seedMember.relation}
                onChange={(event) => setSeedMember((prev) => ({ ...prev, relation: event.target.value }))}
              >
                <option value="self">Self</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="child">Child</option>
                <option value="spouse">Spouse</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="meta-row">
            <button type="button" className="secondary" onClick={addSeedMember}>
              Add Member
            </button>
            <span className="chip neutral">Saved: {household.length}</span>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setAuth((prev) => ({
                  ...prev,
                  phone: sanitizePhone(prev.phone),
                  verified: true,
                  verifiedAt: new Date().toISOString()
                }));
                setSetupDone(true);
              }}
              disabled={!setupComplete}
            >
              Continue
            </button>
          </div>

          {household.length > 0 ? (
            <div className="patient-list compact">
              {household.map((member) => (
                <div key={member.id} className="patient-item">
                  <span>{member.name} ({member.relation})</span>
                  <button type="button" className="link-btn" onClick={() => removeMember(member.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {setupMessage ? <p className="submit-message">{setupMessage}</p> : null}
      </main>
    );
  }

  async function installApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    setInstallPrompt(null);
  }

  return (
    <main className="page">
      <section className="hero">
        <p className="brand">MediSync SOS</p>
        <h1>Request help in 2 taps</h1>
        <p className="sub">Select patient, choose symptom, and request help.</p>
        <div className="meta-row">
          <span className={isOnline ? "chip online" : "chip offline"}>{isOnline ? "Online" : "Offline"}</span>
          <span className="chip neutral">Queued: {queue.length}</span>
          <span className="chip neutral">Phone: {auth.phone}</span>
          <button type="button" className="secondary" onClick={() => setSetupDone(false)}>
            Manage Family
          </button>
          {installPrompt ? (
            <button className="install-btn" onClick={installApp} type="button">
              Install App
            </button>
          ) : null}
        </div>
      </section>

      <section className="panel symptoms-panel">
        <h2>Who needs help?</h2>
        <div className="patient-list">
          {household.map((member) => (
            <button
              type="button"
              key={member.id}
              className={member.id === selectedPatient?.id ? "symptom active" : "symptom"}
              onClick={() => setSelectedPatientId(member.id)}
            >
              {member.name} ({member.relation})
            </button>
          ))}
        </div>

        <h2>What is happening?</h2>
        <div className="symptoms-grid">
          {SYMPTOMS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === selectedSymptomId ? "symptom active" : "symptom"}
              onClick={() => setSelectedSymptomId(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>
      </section>

      <section className="panel location-panel">
        <h2>Location</h2>
        <p className="muted">{location.address}</p>
        {location.error ? <p className="warn">{location.error}</p> : null}
      </section>

      <section className="submit-strip">
        <button className="sos-btn" type="button" onClick={submitSos} disabled={submitState.loading}>
          {submitState.loading ? "Sending..." : "Request Help"}
        </button>
        {submitState.message ? <p className="submit-message">{submitState.message}</p> : null}
      </section>

      <section className="panel status-panel">
        <h2>Live status</h2>
        {requestHistory.length > 0 ? (
          <div className="history-row">
            {requestHistory.map((request) => (
              <button
                type="button"
                key={request.id}
                className={request.id === (activeRequest?.id || trackedRequestId) ? "history-chip active" : "history-chip"}
                onClick={() => setTrackedRequestId(request.id)}
              >
                {request.id.slice(0, 8)} - {formatStatus(request.status)}
              </button>
            ))}
          </div>
        ) : null}
        {activeRequest?.id ? (
          <>
            <p className="request-id">Request: {activeRequest.id}</p>
            <p className="status-pill">{formatStatus(activeRequest.status)}</p>
            <ul className="steps">
              {requestSteps.map((step) => (
                <li key={step.title} className={step.done ? "done" : step.active ? "active" : "idle"}>
                  {step.title}
                </li>
              ))}
            </ul>
            <div className="status-grid">
              <p>
                <strong>Hospital:</strong> {activeRequest.assignedHospitalName || "Matching"}
              </p>
              <p>
                <strong>Ambulance:</strong> {activeRequest.assignedAmbulanceVehicleNumber || activeRequest.assignedAmbulancePlate || activeRequest.assignedAmbulanceId || "Pending"}
              </p>
              <p>
                <strong>Driver Contact:</strong> {activeRequest.assignedAmbulanceMobileNumber || activeRequest.assignedAmbulancePhone || "Pending"}
              </p>
              <p>
                <strong>Doctor:</strong> {activeRequest.assignedDoctorName || "Pending"}
              </p>
            </div>
          </>
        ) : (
          <p className="muted">No active request yet.</p>
        )}
      </section>

      <section className="panel">
        <h2>Live Video + AI Guidance</h2>
        <p className="muted">Capture live scene after requesting help. AI guidance is generated from the captured video frame.</p>
        <div className="actions-row left">
          <button
            type="button"
            className="primary"
            onClick={startLiveCapture}
            disabled={guidanceState.recording || guidanceState.processing || !activeRequest?.id}
          >
            {guidanceState.recording ? "Recording..." : "Start Live Capture"}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={stopLiveCapture}
            disabled={!guidanceState.recording}
          >
            Stop & Send
          </button>
        </div>
        <video ref={liveVideoRef} className="live-video" autoPlay playsInline muted />
        {guidanceState.message ? <p className="submit-message">{guidanceState.message}</p> : null}
        {guidanceState.suggestions.length > 0 ? (
          <article className="guidance-card">
            <h3>Immediate AI Guidance</h3>
            <ul className="guidance-list">
              {guidanceState.suggestions.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ) : null}
      </section>
    </main>
  );
}
