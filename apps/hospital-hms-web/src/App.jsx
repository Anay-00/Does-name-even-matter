import { useEffect, useMemo, useRef, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:http://8080//api/v1";

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function apiLogin(credentials) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Login failed");
  }
  return payload;
}

async function authGet(path, accessToken) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `GET ${path} failed`);
  }
  return payload;
}

async function authSend(path, method, accessToken, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `${method} ${path} failed`);
  }
  return payload;
}

async function authGetItemsOrDefault(path, accessToken, defaultItems = []) {
  try {
    const payload = await authGet(path, accessToken);
    return payload?.items || defaultItems;
  } catch {
    return defaultItems;
  }
}

async function authGetOrDefault(path, accessToken, fallbackPayload) {
  try {
    return await authGet(path, accessToken);
  } catch {
    return fallbackPayload;
  }
}

function isPendingActionable(status) {
  return status === "pending_hospital_response";
}

function isUnresolvedStatus(status) {
  return ["created", "pending_hospital_response", "rejected_retrying", "failed_no_match"].includes(status);
}

const menuGroups = [
  { title: "HMS Overview", items: ["Operations Overview", "Emergency Board", "Department Snapshot"] },
  { title: "Doctors", items: ["All Doctors", "Add Doctor", "Shift Management"] },
  { title: "Patients", items: ["OPD Register", "IPD Register", "Discharge Queue"] },
  { title: "Room Management", items: ["Allotted Rooms", "New Allotment", "Ward Occupancy"] },
  { title: "Departments", items: ["Department List", "Add Department"] },
  { title: "Laboratory", items: ["Sample Queue", "Reports Dispatch"] },
  { title: "Operation Theatre", items: ["OT Schedule", "Consumables"] },
  { title: "Emergency Transport", items: ["Fleet Monitor", "Dispatch Hub"] },
  { title: "Blood Bank", items: ["Stock Ledger", "Issue Desk"] },
  { title: "Inventory", items: ["Central Inventory", "Assets & Equipment"] },
  { title: "Human Resources", items: ["Staff Directory", "Attendance"] },
  { title: "Documents & Consent", items: ["Document Vault", "Consent Tracker"] },
  { title: "Pharmacy", items: ["Inventory", "Issue Counter"] },
  { title: "Billing & Accounts", items: ["Billing Desk", "Invoice Ledger", "Insurance Claims"] },
  { title: "Quality & Support", items: ["Feedback", "Quality & Compliance", "Waste Management", "Visitor Management"] },
  { title: "Reports & Settings", items: ["Reports & Analytics", "System Settings"] }
];

const DEPARTMENT_OPTIONS = [
  "General Medicine",
  "Emergency",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Radiology",
  "Surgery"
];

const SPECIALIZATION_OPTIONS = [
  "General Physician",
  "Emergency Medicine",
  "Cardiologist",
  "Neurologist",
  "Orthopedic Surgeon",
  "Pediatrician",
  "Gynecologist",
  "Radiologist",
  "Anesthesiologist"
];

const ROOM_NUMBER_OPTIONS = [
  "ER-01",
  "ER-02",
  "ICU-01",
  "ICU-02",
  "GW-101",
  "GW-102",
  "GW-103",
  "PW-201",
  "PW-202",
  "PW-203"
];

const RESPONSE_LOCK_TTL_MS = 15000;

function Table({ columns, rows, emptyText }) {
  return (
    <table>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col}>{col}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length}>{emptyText}</td>
          </tr>
        ) : (
          rows.map((row, index) => (
            <tr key={`row-${index}`}>
              {row.map((cell, cIndex) => (
                <td key={`cell-${index}-${cIndex}`}>{cell}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

function formatAgeMinutes(timestamp) {
  if (!timestamp) {
    return "-";
  }
  const ageMs = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.max(0, Math.floor(ageMs / 60000));
  if (minutes < 1) {
    return "now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

function OverviewPage({ snapshot, pendingRequests, activeRequests, recentRequests, isLoading, errorMessage, lastFastSyncAt }) {
  const counters = snapshot?.counters || {};
  const reqRows = recentRequests.slice(0, 8).map((item) => [
    item.id,
    item.patientName || item.callerName || "Unknown",
    item.emergencyType || "general",
    item.status,
    item.assignedHospitalName || "Unassigned"
  ]);

  const oldestPendingMinutes = pendingRequests.reduce((maxAge, item) => {
    const ageMs = Date.now() - new Date(item.createdAt || Date.now()).getTime();
    return Math.max(maxAge, Math.floor(ageMs / 60000));
  }, 0);

  return (
    <>
      <section className="kpi-grid">
        <article className="kpi-card green"><h3>Live Pending</h3><p>{pendingRequests.length}</p><small>Requires immediate action</small></article>
        <article className="kpi-card blue"><h3>Accepted Now</h3><p>{activeRequests.length}</p><small>Being handled by this hospital</small></article>
        <article className="kpi-card orange"><h3>Oldest Pending</h3><p>{oldestPendingMinutes}m</p><small>Queue aging signal</small></article>
        <article className="kpi-card red"><h3>Escalation Bucket</h3><p>{(counters.failed_no_match ?? 0) + (counters.rejected_retrying ?? 0)}</p><small>Requires supervisor review</small></article>
      </section>

      <section className="panel-grid split">
        <article className="panel">
          <header>
            <h3>Fast Response Queue</h3>
            <span>{lastFastSyncAt ? `Synced ${new Date(lastFastSyncAt).toLocaleTimeString()}` : "Realtime"}</span>
          </header>
          <Table
            columns={["Request", "Patient", "Type", "State", "Age", "Priority"]}
            rows={pendingRequests.slice(0, 10).map((item) => [
              item.id,
              item.patientName || item.callerName || "Unknown",
              item.emergencyType || "general",
              item.status,
              formatAgeMinutes(item.createdAt),
              item.priority || "normal"
            ])}
            emptyText="No pending responses right now."
          />
        </article>

        <article className="panel">
          <header>
            <h3>Live Emergency Feed</h3>
            <span>{snapshot?.generatedAt ? new Date(snapshot.generatedAt).toLocaleString() : "Realtime"}</span>
          </header>
          <Table
            columns={["Request", "Patient", "Type", "Status", "Assigned"]}
            rows={reqRows}
            emptyText="No emergency requests in the current scope."
          />
        </article>
      </section>

      <section className="panel">
        <header>
          <h3>Operations Status</h3>
          <span>MediSync Runtime</span>
        </header>
        {isLoading ? <p className="muted-text">Refreshing hospital operational data...</p> : null}
        {errorMessage ? <p className="muted-text">{errorMessage}</p> : null}
        {!isLoading && !errorMessage ? (
          <ul className="status-list">
            <li><span>Dispatch routing health</span><em className="pill ok">Stable</em></li>
            <li><span>Queue sync interval</span><em className="pill ok">2.5s fast lane</em></li>
            <li><span>ER assignment SLA</span><em className="pill ok">Under 30s</em></li>
            <li><span>Clinical handoff media</span><em className="pill ok">Linked</em></li>
          </ul>
        ) : null}
      </section>
    </>
  );
}

function EmergencyBoardPage({ pendingRequests, activeRequests, onRespond, onLoadMedia, mediaByRequest, actionInFlight }) {
  const rows = pendingRequests.map((item) => [
    item.id,
    item.patientName || item.callerName || "Unknown",
    item.emergencyType || "general",
    item.status,
    formatAgeMinutes(item.createdAt)
  ]);

  return (
    <section className="panel">
      <header>
        <h3>Emergency Board: Live Wave Queue</h3>
        <span>First-accept-wins workflow</span>
      </header>
      <Table
        columns={["Request", "Patient", "Type", "Status", "Queue Age"]}
        rows={rows}
        emptyText="No pending requests available at the moment."
      />

      <h4 className="section-title">Pending Actions</h4>
      <div className="cards">
        {pendingRequests.slice(0, 8).map((item) => {
          const busyAction = actionInFlight[item.id];
          const actionable = isPendingActionable(item.status);
          return (
          <div key={item.id} className="case-card pending">
            <p>{item.patientName || item.callerName || "Unknown"} | {item.emergencyType || "general"} | {item.status} | waiting {formatAgeMinutes(item.createdAt)}</p>
            <div className="actions-row left">
              <button className="primary" disabled={Boolean(busyAction) || !actionable} onClick={() => onRespond(item.id, "accept")}>{busyAction === "accept" ? "Accepting..." : "Accept"}</button>
              <button className="ghost" disabled={Boolean(busyAction) || !actionable} onClick={() => onRespond(item.id, "reject")}>{busyAction === "reject" ? "Rejecting..." : "Reject"}</button>
              <button className="ghost" disabled={Boolean(busyAction)} onClick={() => onLoadMedia(item.id)}>View Case Media</button>
            </div>
            {!actionable ? <span className="pill">Waiting for allocation offer</span> : null}
            {(mediaByRequest[item.id] || []).length > 0 ? (
              <ul className="status-list" style={{ marginTop: "0.6rem" }}>
                {(mediaByRequest[item.id] || []).slice(0, 2).map((media) => (
                  <li key={media.id}>
                    <span>{media.mediaType.toUpperCase()} | {new Date(media.createdAt).toLocaleTimeString()}</span>
                    <em className="pill ok">Guidance shared</em>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )})}
      </div>

      <h4 className="section-title">Accepted / In Progress</h4>
      <div className="cards">
        {activeRequests.slice(0, 8).map((item) => (
          <div key={item.id} className="case-card active">
            <p>{item.patientName || item.callerName || "Unknown"} | {item.emergencyType || "general"}</p>
            <div className="actions-row left">
              <button className="ghost" onClick={() => onLoadMedia(item.id)}>Open Media + Guidance</button>
            </div>
            <span className="pill ok">Assigned to this hospital | Room {item.assignedRoomNumber || "Pending"}</span>
            <ul className="status-list" style={{ marginTop: "0.6rem" }}>
              <li>
                <span>Doctor: {item.assignedDoctorName || "Pending"}</span>
                <em className="pill ok">Assigned</em>
              </li>
              <li>
                <span>
                  Ambulance: {item.assignedAmbulanceVehicleNumber || "Pending"}
                  {item.assignedAmbulanceMobileNumber ? ` | ${item.assignedAmbulanceMobileNumber}` : ""}
                </span>
                <em className="pill ok">Dispatched</em>
              </li>
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function DepartmentSnapshotPage({ doctors, roomAllotments, snapshot }) {
  const counters = snapshot?.counters || {};
  const byDept = doctors.reduce((acc, doctor) => {
    const key = doctor.department || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <section className="panel">
      <header>
        <h3>Department Snapshot</h3>
        <span>Clinical operations distribution</span>
      </header>
      <section className="kpi-grid">
        <article className="kpi-card blue"><h3>Total Doctors</h3><p>{doctors.length}</p><small>Registered in HMS</small></article>
        <article className="kpi-card green"><h3>Active Room Allotments</h3><p>{roomAllotments.length}</p><small>Current admissions</small></article>
        <article className="kpi-card orange"><h3>Completed Requests</h3><p>{counters.completed ?? 0}</p><small>Closed emergency flows</small></article>
        <article className="kpi-card red"><h3>Retrying Requests</h3><p>{counters.rejected_retrying ?? 0}</p><small>Pending reassignment</small></article>
      </section>
      <Table
        columns={["Department", "Doctor Count"]}
        rows={Object.entries(byDept).map(([name, count]) => [name, String(count)])}
        emptyText="No department data available yet."
      />
    </section>
  );
}

function AddDoctorPage({ onSubmit }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Add Doctor</h3>
        <span>Register new doctor profile</span>
      </header>
      <form onSubmit={onSubmit}>
        <div className="form-grid three-col">
          <input name="firstName" placeholder="First name*" required />
          <input name="middleName" placeholder="Middle name" />
          <input name="lastName" placeholder="Last name*" required />
          <select name="gender" defaultValue="" required>
            <option value="" disabled>Gender*</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input name="dateOfBirth" type="date" required />
          <select name="bloodGroup" defaultValue="">
            <option value="" disabled>Blood Group</option>
            <option>O+</option>
            <option>O-</option>
            <option>A+</option>
            <option>A-</option>
            <option>B+</option>
            <option>B-</option>
            <option>AB+</option>
            <option>AB-</option>
          </select>
        </div>
        <div className="form-grid three-col">
          <input name="email" placeholder="Email*" required />
          <input name="mobile" placeholder="Mobile*" required />
          <input name="alternateContact" placeholder="Alternative Contact" />
        </div>
        <div className="form-grid three-col">
          <select name="department" defaultValue="" required>
            <option value="" disabled>Department*</option>
            {DEPARTMENT_OPTIONS.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
          <select name="specialization" defaultValue="" required>
            <option value="" disabled>Specialization*</option>
            {SPECIALIZATION_OPTIONS.map((specialization) => (
              <option key={specialization} value={specialization}>{specialization}</option>
            ))}
          </select>
          <input name="address" placeholder="Address" />
        </div>
        <div className="actions-row">
          <button type="reset" className="ghost">Clear</button>
          <button type="submit" className="primary">Save Doctor</button>
        </div>
      </form>
    </section>
  );
}

function AllDoctorsPage({ doctors }) {
  return (
    <section className="panel">
      <header>
        <h3>All Doctors</h3>
        <span>Clinical roster</span>
      </header>
      <Table
        columns={["Name", "Department", "Specialization", "Mobile", "Email"]}
        rows={doctors.map((doctor) => [
          `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim(),
          doctor.department || "General",
          doctor.specialization || "General Medicine",
          doctor.mobile || "-",
          doctor.email || "-"
        ])}
        emptyText="No doctors registered yet."
      />
    </section>
  );
}

function ShiftManagementPage({ shifts, doctors, onAddShift }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Shift Management</h3>
        <span>Schedule doctor rotations</span>
      </header>
      <form className="inline-form" onSubmit={onAddShift}>
        <select name="doctorId" defaultValue="" required>
          <option value="" disabled>Select Doctor*</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {`${doctor.firstName || ""} ${doctor.lastName || ""}`.trim() || doctor.email || "Doctor"}
            </option>
          ))}
        </select>
        <input name="shiftStart" type="datetime-local" required />
        <input name="shiftEnd" type="datetime-local" required />
        <button type="submit" className="primary">Add Shift</button>
      </form>
      <Table
        columns={["Doctor", "Department", "Shift", "Status"]}
        rows={shifts.map((item) => [item.name, item.department, item.window, item.status])}
        emptyText="No shifts configured."
      />
    </section>
  );
}

function OpdPage({ recentRequests }) {
  return (
    <section className="panel">
      <header>
        <h3>OPD Register</h3>
        <span>Outpatient flow</span>
      </header>
      <Table
        columns={["Request", "Patient", "Type", "Status", "Created"]}
        rows={recentRequests.map((item) => [
          item.id,
          item.patientName || item.callerName || "Unknown",
          item.emergencyType || "general",
          item.status,
          item.createdAt ? new Date(item.createdAt).toLocaleString() : "-"
        ])}
        emptyText="No OPD records available."
      />
    </section>
  );
}

function IpdPage({ roomAllotments }) {
  return (
    <section className="panel">
      <header>
        <h3>IPD Register</h3>
        <span>Inpatient admissions</span>
      </header>
      <Table
        columns={["Patient", "Patient ID", "Room", "Status", "Allotted"]}
        rows={roomAllotments.map((item) => [
          item.patientName,
          item.patientId,
          item.roomNumber || "Auto",
          item.status || "admitted",
          item.allottedAt ? new Date(item.allottedAt).toLocaleString() : "-"
        ])}
        emptyText="No IPD admissions yet."
      />
    </section>
  );
}

function DischargeQueuePage({ roomAllotments, billingInvoices, onDischarge, dischargeInFlight }) {
  const [billByRoom, setBillByRoom] = useState({});
  const queue = roomAllotments.filter((item) => item.status !== "discharged");
  const invoiceByAllotment = new Map((billingInvoices || []).map((item) => [item.roomAllotmentId, item]));
  return (
    <section className="panel">
      <header>
        <h3>Discharge Queue</h3>
        <span>Enter final bill and discharge instantly</span>
      </header>
      <Table
        columns={["Patient", "Room", "Current Status", "Bill Amount", "Invoice", "Next Action"]}
        rows={queue.map((item) => [
          item.patientName,
          item.roomNumber || "Auto",
          item.status || "admitted",
          <input
            key={`bill-${item.id}`}
            type="number"
            min="1"
            step="0.01"
            placeholder="Enter bill"
            value={billByRoom[item.id] || ""}
            onChange={(event) => setBillByRoom((prev) => ({ ...prev, [item.id]: event.target.value }))}
            style={{ width: 140 }}
          />,
          (() => {
            const invoice = invoiceByAllotment.get(item.id);
            if (!invoice) {
              return "Not generated";
            }
            return `${invoice.invoiceNumber} | $${invoice.totalAmount}`;
          })(),
          <button
            key={`discharge-${item.id}`}
            type="button"
            className="primary"
            disabled={Boolean(dischargeInFlight[item.id])}
            onClick={() => onDischarge(item.id, Number(billByRoom[item.id] || 0))}
          >
            {dischargeInFlight[item.id] ? "Generating..." : "Generate Bill + Discharge"}
          </button>
        ])}
        emptyText="No pending discharges."
      />
    </section>
  );
}

function AllottedRoomsPage({ roomAllotments, billingInvoices }) {
  const activeAllotments = roomAllotments.filter((item) => item.status !== "discharged");
  const invoiceByAllotment = new Map((billingInvoices || []).map((item) => [item.roomAllotmentId, item]));

  return (
    <section className="panel">
      <header>
        <h3>Allotted Rooms</h3>
        <span>Current active room assignments</span>
      </header>
      <Table
        columns={["Room", "Patient", "Type", "Bed", "Admission", "Gender", "Mobile", "Status", "Amount Charged"]}
        rows={activeAllotments.map((item, index) => [
          item.roomNumber || "Auto",
          item.patientName,
          String(item.roomNumber || "").startsWith("ICU") ? "ICU" : String(item.roomNumber || "").startsWith("ER") ? "Emergency" : "General",
          String((index % 8) + 1),
          item.allottedAt ? new Date(item.allottedAt).toLocaleDateString() : "-",
          item.gender || "-",
          item.mobile || "-",
          item.status || "admitted",
          `$${invoiceByAllotment.get(item.id)?.totalAmount || 0}`
        ])}
        emptyText="No active room allotments."
      />
    </section>
  );
}

function NewAllotmentPage({ onSubmit }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>New Room Allotment</h3>
        <span>Create inpatient bed assignment</span>
      </header>
      <form onSubmit={onSubmit}>
        <div className="form-grid three-col">
          <input name="patientName" placeholder="Patient Name*" required />
          <input name="patientId" placeholder="Patient ID*" required />
          <input name="age" type="number" placeholder="Age*" required />
          <select name="gender" defaultValue="" required>
            <option value="" disabled>Gender*</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <input name="mobile" placeholder="Mobile*" required />
          <input name="emergencyContact" placeholder="Emergency Contact" />
        </div>
        <div className="form-grid three-col">
          <select name="roomNumber" defaultValue="" required>
            <option value="" disabled>Room Number*</option>
            {ROOM_NUMBER_OPTIONS.map((room) => (
              <option key={room} value={room}>{room}</option>
            ))}
          </select>
          <input name="medicalHistory" placeholder="Medical History" />
          <input name="allergies" placeholder="Allergies" />
        </div>
        <div className="actions-row">
          <button type="reset" className="ghost">Clear</button>
          <button type="submit" className="primary">Assign Room</button>
        </div>
      </form>
    </section>
  );
}

function WardOccupancyPage({ roomAllotments, ambulanceFleet, consumables, inventory, billingInvoices }) {
  const activeAllotments = roomAllotments.filter((item) => item.status !== "discharged");
  const occupied = activeAllotments.length;
  const totalBeds = Math.max(occupied + 12, 20);
  const available = Math.max(totalBeds - occupied, 0);

  const latestByRoom = new Map();
  for (const item of roomAllotments) {
    const room = item.roomNumber;
    if (!room) {
      continue;
    }
    if (!latestByRoom.has(room)) {
      latestByRoom.set(room, item);
    }
  }

  const allRoomNames = Array.from(new Set([
    ...ROOM_NUMBER_OPTIONS,
    ...roomAllotments.map((item) => item.roomNumber).filter(Boolean)
  ])).sort((a, b) => a.localeCompare(b));

  const invoiceByAllotment = new Map((billingInvoices || []).map((item) => [item.roomAllotmentId, item]));

  const allRoomRows = allRoomNames.map((room, index) => {
    const allotment = latestByRoom.get(room) || null;
    const isOccupied = Boolean(allotment && allotment.status !== "discharged");
    const invoice = allotment ? invoiceByAllotment.get(allotment.id) : null;
    return [
      room,
      allotment?.patientName || "-",
      room.startsWith("ICU") ? "ICU" : room.startsWith("ER") ? "Emergency" : "General",
      String((index % 8) + 1),
      allotment?.allottedAt ? new Date(allotment.allottedAt).toLocaleDateString() : "-",
      allotment?.gender || "-",
      allotment?.mobile || "-",
      isOccupied ? "Occupied" : "Available",
      `$${invoice?.totalAmount || 0}`
    ];
  });

  const equipmentRows = [
    ...(consumables || []).map((item) => [item.name, String(item.quantity), item.status || "Ready", "OT"]),
    ...(inventory || []).map((item) => [item.medicine, String(item.units), (item.units || 0) > 25 ? "Available" : "Low", "Pharmacy"])
  ];

  return (
    <section className="panel">
      <header>
        <h3>Ward Occupancy</h3>
        <span>Live room utilization and support inventory</span>
      </header>

      <section className="kpi-grid">
        <article className="kpi-card green"><h3>Total Beds</h3><p>{totalBeds}</p><small>Configured</small></article>
        <article className="kpi-card blue"><h3>Occupied</h3><p>{occupied}</p><small>Active patients</small></article>
        <article className="kpi-card orange"><h3>Available</h3><p>{available}</p><small>Ready for admission</small></article>
        <article className="kpi-card red"><h3>Utilization</h3><p>{Math.round((occupied / totalBeds) * 100)}%</p><small>Current load</small></article>
      </section>

      <header style={{ marginTop: 16 }}>
        <h3>All Rooms</h3>
        <span>Shows both occupied and available rooms</span>
      </header>
      <Table
        columns={["Room No", "Patient Name", "Room Type", "Bed No", "Admission Date", "Gender", "Mobile", "Status", "Amount Charged"]}
        rows={allRoomRows}
        emptyText="No room data available."
      />

      <header style={{ marginTop: 16 }}>
        <h3>Ambulance List</h3>
        <span>Simple operational list view</span>
      </header>
      <Table
        columns={["Vehicle Number", "Mobile", "Status", "Latitude", "Longitude"]}
        rows={(ambulanceFleet || []).map((item) => [
          item.vehicleNumber,
          item.mobileNumber || "-",
          item.tripStatus || "idle",
          String(item.latitude ?? "-"),
          String(item.longitude ?? "-")
        ])}
        emptyText="No ambulances available."
      />

      <header style={{ marginTop: 16 }}>
        <h3>Equipment Snapshot</h3>
        <span>Consolidated OT and pharmacy resources</span>
      </header>
      <Table
        columns={["Item", "Quantity", "Status", "Source"]}
        rows={equipmentRows}
        emptyText="No equipment data available."
      />
    </section>
  );
}

function SampleQueuePage({ samples, onAddSample }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Laboratory Sample Queue</h3>
        <span>Track sample processing lifecycle</span>
      </header>
      <form className="inline-form" onSubmit={onAddSample}>
        <input name="sampleId" placeholder="Sample ID*" required />
        <input name="patient" placeholder="Patient Name*" required />
        <input name="test" placeholder="Test Name*" required />
        <button type="submit" className="primary">Add Sample</button>
      </form>
      <Table
        columns={["Sample ID", "Patient", "Test", "Status"]}
        rows={samples.map((item) => [item.sampleId, item.patient, item.test, item.status])}
        emptyText="No lab samples in queue."
      />
    </section>
  );
}

function ReportsDispatchPage({ samples }) {
  const completed = samples.filter((item) => item.status === "report_ready");
  return (
    <section className="panel">
      <header>
        <h3>Reports Dispatch</h3>
        <span>Ready-to-send lab reports</span>
      </header>
      <Table
        columns={["Sample ID", "Patient", "Test", "Dispatch Status"]}
        rows={completed.map((item) => [item.sampleId, item.patient, item.test, "Ready"])}
        emptyText="No reports ready for dispatch."
      />
    </section>
  );
}

function OTSchedulePage({ otCases, onAddOtCase }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>OT Schedule</h3>
        <span>Manage operation theatre slots</span>
      </header>
      <form className="inline-form" onSubmit={onAddOtCase}>
        <select name="ot" defaultValue="" required>
          <option value="" disabled>OT Room*</option>
          <option value="OT-1">OT-1</option>
          <option value="OT-2">OT-2</option>
          <option value="OT-3">OT-3</option>
        </select>
        <input name="procedure" placeholder="Procedure*" required />
        <input name="surgeon" placeholder="Surgeon*" required />
        <input name="time" type="datetime-local" required />
        <button type="submit" className="primary">Schedule</button>
      </form>
      <Table
        columns={["OT", "Procedure", "Surgeon", "Time", "Status"]}
        rows={otCases.map((item) => [item.ot, item.procedure, item.surgeon, item.time, item.status])}
        emptyText="No OT cases scheduled."
      />
    </section>
  );
}

function ConsumablesPage({ consumables, onAddConsumable }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Consumables</h3>
        <span>Track OT materials and stock</span>
      </header>
      <form className="inline-form" onSubmit={onAddConsumable}>
        <input name="name" placeholder="Item Name*" required />
        <input name="quantity" type="number" placeholder="Quantity*" required />
        <button type="submit" className="primary">Add Item</button>
      </form>
      <Table
        columns={["Item", "Quantity", "Status"]}
        rows={consumables.map((item) => [item.name, String(item.quantity), item.status])}
        emptyText="No consumables tracked yet."
      />
    </section>
  );
}

function PharmacyInventoryPage({ inventory, onAddInventory }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Pharmacy Inventory</h3>
        <span>Medicine stock management</span>
      </header>
      <form className="inline-form" onSubmit={onAddInventory}>
        <input name="medicine" placeholder="Medicine Name*" required />
        <input name="units" type="number" placeholder="Units*" required />
        <button type="submit" className="primary">Add Stock</button>
      </form>
      <Table
        columns={["Medicine", "Units", "Status"]}
        rows={inventory.map((item) => [item.medicine, String(item.units), item.units < 20 ? "Low" : "Healthy"])}
        emptyText="No inventory records available."
      />
    </section>
  );
}

function IssueCounterPage({ issueLog, inventory, onIssueDrug }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Issue Counter</h3>
        <span>Dispense medicine to patients</span>
      </header>
      <form className="inline-form" onSubmit={onIssueDrug}>
        <input name="patient" placeholder="Patient Name*" required />
        <select name="medicine" defaultValue="" required>
          <option value="" disabled>Medicine*</option>
          {inventory.map((item) => (
            <option key={item.id || item.medicine} value={item.medicine}>{item.medicine}</option>
          ))}
        </select>
        <button type="submit" className="primary">Issue</button>
      </form>
      <Table
        columns={["Patient", "Medicine", "Issued At"]}
        rows={issueLog.map((item) => [item.patient, item.medicine, item.issuedAt])}
        emptyText="No issues recorded yet."
      />
    </section>
  );
}

function BillingDeskPage({ billingSnapshot, billingInvoices, onAddService, onUpdateTax }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Billing Desk</h3>
        <span>Service, tax, and instant invoice generation view</span>
      </header>
      <form className="inline-form" onSubmit={onAddService}>
        <input name="serviceName" placeholder="Service Name*" required />
        <input name="amount" type="number" step="0.01" placeholder="Amount*" required />
        <button type="submit" className="primary">Add Service</button>
      </form>
      <Table
        columns={["Service", "Amount"]}
        rows={(billingSnapshot?.services || []).map((item) => [item.serviceName, `$${item.amount}`])}
        emptyText="No billing services configured."
      />
      <form className="inline-form" onSubmit={onUpdateTax}>
        <input
          name="taxPercentage"
          type="number"
          step="0.1"
          defaultValue={billingSnapshot?.taxPercentage ?? 5}
          placeholder="Tax Percentage*"
          required
        />
        <button type="submit" className="ghost">Update Tax</button>
      </form>

      <header style={{ marginTop: 16 }}>
        <h3>Recent Generated Invoices</h3>
        <span>Auto-created at discharge</span>
      </header>
      <div className="cards">
        {(billingInvoices || []).slice(0, 8).map((invoice) => (
          <div key={invoice.id}>
            <strong>{invoice.invoiceNumber}</strong>
            <p>{invoice.patientName} | {invoice.roomNumber || "-"}</p>
            <p>Subtotal: ${invoice.subtotal} | Tax: ${invoice.taxAmount}</p>
            <p>Total: ${invoice.totalAmount}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BillingInvoicePage({ invoices }) {
  return (
    <section className="panel">
      <header>
        <h3>Invoice Ledger</h3>
        <span>Discharge bills generated in real time</span>
      </header>
      <Table
        columns={["Invoice", "Patient", "Room", "Subtotal", "Tax", "Total", "Status", "Billed At"]}
        rows={(invoices || []).map((item) => [
          item.invoiceNumber,
          item.patientName,
          item.roomNumber || "-",
          `$${item.subtotal}`,
          `${item.taxPercentage}%`,
          `$${item.totalAmount}`,
          item.status || "generated",
          item.billedAt ? new Date(item.billedAt).toLocaleString() : "-"
        ])}
        emptyText="No invoices generated yet."
      />
      <div className="cards" style={{ marginTop: 12 }}>
        {(invoices || []).slice(0, 10).map((item) => (
          <div key={`invoice-card-${item.id}`}>
            <strong>{item.invoiceNumber}</strong>
            <p>{item.patientName}</p>
            <p>Room: {item.roomNumber || "-"}</p>
            <p>Total: ${item.totalAmount}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function InsuranceClaimsPage({ claims, onAddClaim }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Insurance Claims</h3>
        <span>Claims submission and tracking</span>
      </header>
      <form className="inline-form" onSubmit={onAddClaim}>
        <input name="patient" placeholder="Patient Name*" required />
        <select name="provider" defaultValue="" required>
          <option value="" disabled>Provider*</option>
          <option value="Star Health">Star Health</option>
          <option value="HDFC ERGO">HDFC ERGO</option>
          <option value="ICICI Lombard">ICICI Lombard</option>
          <option value="Niva Bupa">Niva Bupa</option>
          <option value="Aditya Birla Health">Aditya Birla Health</option>
        </select>
        <input name="amount" type="number" step="0.01" placeholder="Claim Amount*" required />
        <button type="submit" className="primary">Submit Claim</button>
      </form>
      <Table
        columns={["Patient", "Provider", "Amount", "Status"]}
        rows={claims.map((item) => [item.patient, item.provider, `$${item.amount}`, item.status])}
        emptyText="No insurance claims submitted."
      />
    </section>
  );
}

function FleetMonitorPage({ fleet, onRegister, onLocation }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Fleet Monitor</h3>
        <span>Hospital ambulance tracking and onboarding</span>
      </header>
      <form onSubmit={onRegister}>
        <div className="form-grid three-col">
          <input name="city" defaultValue="Indore" placeholder="City*" required />
          <input name="vehicleNumber" placeholder="Vehicle Number*" required />
          <input name="mobileNumber" placeholder="Mobile Number*" required />
          <input name="latitude" type="number" step="0.000001" placeholder="Latitude*" required />
          <input name="longitude" type="number" step="0.000001" placeholder="Longitude*" required />
          <button type="submit" className="primary">Register Ambulance</button>
        </div>
      </form>
      <Table
        columns={["Vehicle Number", "Mobile", "Status", "Latitude", "Longitude"]}
        rows={(fleet || []).map((item) => [item.vehicleNumber, item.mobileNumber || "-", item.tripStatus || "idle", String(item.latitude), String(item.longitude)])}
        emptyText="No hospital ambulances registered yet."
      />
      <header style={{ marginTop: 16 }}>
        <h3>Update Ambulance GPS</h3>
        <span>One-line update form for each ambulance</span>
      </header>
      {(fleet || []).map((item) => (
        <form key={`gps-${item.id}`} className="inline-form" onSubmit={(event) => onLocation(event, item.id)}>
          <strong style={{ minWidth: 120 }}>{item.vehicleNumber}</strong>
          <input name="latitude" type="number" step="0.000001" defaultValue={item.latitude} required />
          <input name="longitude" type="number" step="0.000001" defaultValue={item.longitude} required />
          <button type="submit" className="ghost">Update GPS</button>
        </form>
      ))}
    </section>
  );
}

function DispatchHubPage({ fleet, pendingRequests, onDispatch }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Dispatch Hub</h3>
        <span>Dispatch nearest ambulance to active emergencies</span>
      </header>
      <div className="cards">
        {(fleet || []).slice(0, 10).map((item) => (
          <div key={item.id}>
            <strong>{item.vehicleNumber}</strong>
            <p>{item.tripStatus} | lat {item.latitude}, lng {item.longitude}</p>
            <form className="inline-form" onSubmit={(event) => onDispatch(event, item.id)}>
              <select name="requestId" defaultValue="">
                <option value="">No request link</option>
                {(pendingRequests || []).map((request) => (
                  <option key={request.id} value={request.id}>{request.id}</option>
                ))}
              </select>
              <input name="patientLatitude" type="number" step="0.000001" placeholder="Patient lat*" required />
              <input name="patientLongitude" type="number" step="0.000001" placeholder="Patient lng*" required />
              <input name="patientPhone" placeholder="Patient phone" />
              <button type="submit" className="primary">Dispatch</button>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}

function BloodBankStockPage({ units, onAddUnit }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Blood Bank Stock Ledger</h3>
        <span>Group-wise live inventory</span>
      </header>
      <form className="inline-form" onSubmit={onAddUnit}>
        <input name="bloodGroup" placeholder="Blood Group* (A+, O-)" required />
        <select name="component" defaultValue="" required>
          <option value="" disabled>Component*</option>
          <option value="Whole Blood">Whole Blood</option>
          <option value="Packed RBC">Packed RBC</option>
          <option value="Plasma">Plasma</option>
          <option value="Platelets">Platelets</option>
        </select>
        <input name="unitsAvailable" type="number" min="0" placeholder="Units*" required />
        <input name="reorderLevel" type="number" min="0" placeholder="Reorder Level" defaultValue="5" />
        <button type="submit" className="primary">Add Stock</button>
      </form>
      <Table
        columns={["Blood Group", "Component", "Units", "Reorder", "Updated"]}
        rows={(units || []).map((item) => [
          item.bloodGroup,
          item.component,
          String(item.unitsAvailable),
          String(item.reorderLevel),
          item.updatedAt ? new Date(item.updatedAt).toLocaleString() : "-"
        ])}
        emptyText="No blood inventory configured yet."
      />
      <div className="cards">
        {(units || []).slice(0, 12).map((item) => (
          <div key={item.id}>
            <strong>{item.bloodGroup} | {item.component}</strong>
            <p>Units: {item.unitsAvailable}</p>
            <p>Status: {item.unitsAvailable <= item.reorderLevel ? "Low Stock" : "Healthy"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BloodIssueDeskPage({ issues, units, onIssueBlood }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Blood Issue Desk</h3>
        <span>Issue and track emergency blood dispatches</span>
      </header>
      <form className="inline-form" onSubmit={onIssueBlood}>
        <input name="patient" placeholder="Patient Name*" required />
        <select name="bloodGroup" defaultValue="" required>
          <option value="" disabled>Blood Group*</option>
          {[...new Set((units || []).map((item) => item.bloodGroup))].map((group) => (
            <option key={group} value={group}>{group}</option>
          ))}
        </select>
        <select name="component" defaultValue="" required>
          <option value="" disabled>Component*</option>
          <option value="Whole Blood">Whole Blood</option>
          <option value="Packed RBC">Packed RBC</option>
          <option value="Plasma">Plasma</option>
          <option value="Platelets">Platelets</option>
        </select>
        <input name="unitsIssued" type="number" min="1" placeholder="Units Issued*" required />
        <button type="submit" className="primary">Issue Blood</button>
      </form>
      <Table
        columns={["Patient", "Blood Group", "Component", "Units", "Status", "Issued At"]}
        rows={(issues || []).map((item) => [
          item.patient,
          item.bloodGroup,
          item.component,
          String(item.unitsIssued),
          item.status || "Issued",
          item.issuedAt ? new Date(item.issuedAt).toLocaleString() : "-"
        ])}
        emptyText="No blood issues yet."
      />
      <div className="cards">
        {(issues || []).slice(0, 10).map((item) => (
          <div key={item.id}>
            <strong>{item.patient}</strong>
            <p>{item.bloodGroup} | {item.component}</p>
            <p>Units: {item.unitsIssued}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function DepartmentListPage({ doctors, departments }) {
  const doctorByDepartment = doctors.reduce((acc, item) => {
    const key = item.department || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const rows = departments.map((item) => [
    item.name,
    item.head,
    String(doctorByDepartment[item.name] || 0),
    item.status
  ]);

  return (
    <section className="panel">
      <header>
        <h3>Department List</h3>
        <span>Clinical and admin department registry</span>
      </header>
      <Table columns={["Department", "Head", "Doctors", "Status"]} rows={rows} emptyText="No departments found." />
    </section>
  );
}

function AddDepartmentPage({ onAddDepartment }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Add Department</h3>
        <span>Create and track new service units</span>
      </header>
      <form className="inline-form" onSubmit={onAddDepartment}>
        <input name="name" placeholder="Department Name*" required />
        <input name="head" placeholder="Department Head*" required />
        <button type="submit" className="primary">Add Department</button>
      </form>
    </section>
  );
}

function CentralInventoryPage({ consumables, inventory }) {
  const combined = [
    ...(inventory || []).map((item) => ({ name: item.medicine, units: item.units, source: "Pharmacy" })),
    ...(consumables || []).map((item) => ({ name: item.name, units: item.quantity, source: "OT" }))
  ];
  return (
    <section className="panel">
      <header>
        <h3>Central Inventory</h3>
        <span>Unified stock visibility across units</span>
      </header>
      <Table
        columns={["Item", "Units", "Source", "Status"]}
        rows={combined.map((item) => [item.name, String(item.units), item.source, Number(item.units || 0) < 20 ? "Low" : "Healthy"])}
        emptyText="No inventory records available."
      />
    </section>
  );
}

function AssetsEquipmentPage({ onAddAsset, assets }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Assets & Equipment</h3>
        <span>Track equipment lifecycle and ownership</span>
      </header>
      <form className="inline-form" onSubmit={onAddAsset}>
        <input name="assetName" placeholder="Asset Name*" required />
        <input name="tag" placeholder="Asset Tag*" required />
        <input name="location" placeholder="Location*" required />
        <button type="submit" className="primary">Add Asset</button>
      </form>
      <div className="cards">
        {(assets || []).map((item) => (
          <div key={item.id}>
            <strong>{item.assetName}</strong>
            <p>Tag: {item.tag}</p>
            <p>Location: {item.location}</p>
            <p>Status: {item.status}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StaffDirectoryPage({ doctors, staff }) {
  return (
    <section className="panel">
      <header>
        <h3>Staff Directory</h3>
        <span>Doctors and support staff</span>
      </header>
      <Table
        columns={["Name", "Role", "Department", "Contact"]}
        rows={[
          ...doctors.map((item) => [`${item.firstName} ${item.lastName}`.trim(), "Doctor", item.department || "General", item.mobile || "-"]),
          ...staff.map((item) => [item.name, item.role, item.department, item.contact])
        ]}
        emptyText="No staff records available."
      />
    </section>
  );
}

function AttendancePage({ shiftRows }) {
  return (
    <section className="panel">
      <header>
        <h3>Attendance</h3>
        <span>Shift-based attendance monitoring</span>
      </header>
      <Table
        columns={["Name", "Department", "Shift Window", "Status"]}
        rows={shiftRows.map((item) => [item.name, item.department, item.window, item.status || "Active"])}
        emptyText="No attendance shifts available."
      />
    </section>
  );
}

function DocumentVaultPage({ documents, onAddDocument }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Document Vault</h3>
        <span>Patient and legal documents register</span>
      </header>
      <form className="inline-form" onSubmit={onAddDocument}>
        <input name="title" placeholder="Document Title*" required />
        <input name="owner" placeholder="Owner/Patient*" required />
        <button type="submit" className="primary">Add Document</button>
      </form>
      <Table
        columns={["Title", "Owner", "Uploaded At"]}
        rows={documents.map((item) => [item.title, item.owner, item.createdAt])}
        emptyText="No documents logged."
      />
    </section>
  );
}

function ConsentTrackerPage({ consents, onAddConsent }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Consent Tracker</h3>
        <span>Procedure/operation consent monitoring</span>
      </header>
      <form className="inline-form" onSubmit={onAddConsent}>
        <input name="patient" placeholder="Patient Name*" required />
        <input name="procedure" placeholder="Procedure*" required />
        <button type="submit" className="primary">Mark Consent</button>
      </form>
      <Table
        columns={["Patient", "Procedure", "Status", "Captured At"]}
        rows={consents.map((item) => [item.patient, item.procedure, item.status, item.createdAt])}
        emptyText="No consent records yet."
      />
    </section>
  );
}

function FeedbackPage({ feedback, onAddFeedback }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Feedback</h3>
        <span>Patient and caregiver feedback stream</span>
      </header>
      <form className="inline-form" onSubmit={onAddFeedback}>
        <input name="source" placeholder="Source (Patient/Attender)*" required />
        <input name="message" placeholder="Feedback message*" required />
        <button type="submit" className="primary">Submit Feedback</button>
      </form>
      <div className="cards">
        {feedback.map((item) => (
          <div key={item.id}>
            <strong>{item.source}</strong>
            <p>{item.message}</p>
            <p>{item.createdAt}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function QualityCompliancePage({ qualityChecks, onAddQualityCheck }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Quality & Compliance</h3>
        <span>Audit checks and closure status</span>
      </header>
      <form className="inline-form" onSubmit={onAddQualityCheck}>
        <input name="audit" placeholder="Audit/Checklist*" required />
        <select name="status" defaultValue="Open">
          <option value="Open">Open</option>
          <option value="Closed">Closed</option>
        </select>
        <button type="submit" className="primary">Add Audit</button>
      </form>
      <Table
        columns={["Audit", "Status", "Updated At"]}
        rows={qualityChecks.map((item) => [item.audit, item.status, item.createdAt])}
        emptyText="No compliance checks yet."
      />
    </section>
  );
}

function WasteManagementPage({ wasteLogs, onAddWasteLog }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Waste Management</h3>
        <span>Biomedical waste disposal tracking</span>
      </header>
      <form className="inline-form" onSubmit={onAddWasteLog}>
        <input name="category" placeholder="Waste Category*" required />
        <input name="weight" type="number" step="0.1" placeholder="Weight (kg)*" required />
        <button type="submit" className="primary">Log Disposal</button>
      </form>
      <Table
        columns={["Category", "Weight (kg)", "Logged At"]}
        rows={wasteLogs.map((item) => [item.category, String(item.weight), item.createdAt])}
        emptyText="No waste records yet."
      />
    </section>
  );
}

function VisitorManagementPage({ visitors, onAddVisitor }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Visitor Management</h3>
        <span>Entry and visitation tracking</span>
      </header>
      <form className="inline-form" onSubmit={onAddVisitor}>
        <input name="name" placeholder="Visitor Name*" required />
        <input name="patient" placeholder="Patient Name*" required />
        <button type="submit" className="primary">Check In</button>
      </form>
      <Table
        columns={["Visitor", "Patient", "Check In"]}
        rows={visitors.map((item) => [item.name, item.patient, item.createdAt])}
        emptyText="No visitor logs yet."
      />
    </section>
  );
}

function ReportsAnalyticsPage({ snapshot, pendingRequests, activeRequests, claims, billingInvoices }) {
  const counters = snapshot?.counters || {};
  return (
    <section className="panel">
      <header>
        <h3>Reports & Analytics</h3>
        <span>Operational KPIs and financial indicators</span>
      </header>
      <section className="kpi-grid">
        <article className="kpi-card blue"><h3>Pending Emergencies</h3><p>{pendingRequests.length}</p><small>Needs response</small></article>
        <article className="kpi-card green"><h3>Active Cases</h3><p>{activeRequests.length}</p><small>In progress</small></article>
        <article className="kpi-card orange"><h3>Invoices</h3><p>{billingInvoices.length}</p><small>Generated bills</small></article>
        <article className="kpi-card red"><h3>Claims</h3><p>{claims.length}</p><small>Insurance pipeline</small></article>
      </section>
      <Table
        columns={["Metric", "Value"]}
        rows={Object.entries(counters).map(([key, value]) => [key, String(value)])}
        emptyText="No command-center counters available."
      />
    </section>
  );
}

function SystemSettingsPage() {
  return (
    <section className="panel">
      <header>
        <h3>System Settings</h3>
        <span>Configuration controls and operational policies</span>
      </header>
      <div className="cards">
        <div><strong>Realtime Alerts</strong><p>Enabled</p><p>Dispatch + Emergency + Billing</p></div>
        <div><strong>Auto Refresh</strong><p>Enabled</p><p>Fast lane every 1 second</p></div>
        <div><strong>Security Policy</strong><p>JWT + Role Access</p><p>Hospital scope enforced</p></div>
      </div>
    </section>
  );
}

export default function App() {
  const [activeMain, setActiveMain] = useState("HMS Overview");
  const [activeSub, setActiveSub] = useState("Operations Overview");
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      return window.localStorage.getItem("hms-theme") === "dark";
    } catch {
      return false;
    }
  });

  const [accessToken, setAccessToken] = useState("");
  const [hospitalId, setHospitalId] = useState(null);
  const [hospitalCode, setHospitalCode] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [ambulanceFleet, setAmbulanceFleet] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [roomAllotments, setRoomAllotments] = useState([]);
  const [billingSnapshot, setBillingSnapshot] = useState({ taxPercentage: 5, services: [] });
  const [billingInvoices, setBillingInvoices] = useState([]);
  const [bloodUnits, setBloodUnits] = useState([]);
  const [bloodIssues, setBloodIssues] = useState([]);
  const [mediaByRequest, setMediaByRequest] = useState({});

  const [shiftRows, setShiftRows] = useState([]);
  const [labSamples, setLabSamples] = useState([]);
  const [otCases, setOtCases] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [issueLog, setIssueLog] = useState([]);
  const [claims, setClaims] = useState([]);
  const [departments, setDepartments] = useState(() => DEPARTMENT_OPTIONS.map((name) => ({
    id: `dept-${name.replace(/\s+/g, "-").toLowerCase()}`,
    name,
    head: "TBD",
    status: "Active"
  })));
  const [assets, setAssets] = useState([]);
  const [staff, setStaff] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [consents, setConsents] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [qualityChecks, setQualityChecks] = useState([]);
  const [wasteLogs, setWasteLogs] = useState([]);
  const [visitors, setVisitors] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionNotice, setActionNotice] = useState(null);
  const [connectionLabel, setConnectionLabel] = useState("Offline sample mode");
  const [authError, setAuthError] = useState("");
  const [actionInFlight, setActionInFlight] = useState({});
  const [dischargeInFlight, setDischargeInFlight] = useState({});
  const [lastFastSyncAt, setLastFastSyncAt] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showRegionPicker, setShowRegionPicker] = useState(false);
  const [regionCode, setRegionCode] = useState("IN");
  const [navQuery, setNavQuery] = useState("");
  const [liveClock, setLiveClock] = useState(() => new Date());
  const [pageAnimating, setPageAnimating] = useState(false);
  const [authForm, setAuthForm] = useState({
    email: "aitricare@gmail.com",
    password: "Aitri@123",
    role: "hospital_admin_staff"
  });

  const navSearchRef = useRef(null);
  const responseLockRef = useRef(new Map());

  function pruneResponseLocks() {
    const now = Date.now();
    for (const [requestId, lock] of responseLockRef.current.entries()) {
      if (!lock || lock.expiresAt <= now) {
        responseLockRef.current.delete(requestId);
      }
    }
  }

  function setResponseLock(requestId, status) {
    if (!requestId || !status) {
      return;
    }
    responseLockRef.current.set(requestId, {
      status,
      expiresAt: Date.now() + RESPONSE_LOCK_TTL_MS
    });
  }

  function getResponseLockStatus(requestId) {
    const lock = responseLockRef.current.get(requestId);
    if (!lock) {
      return "";
    }
    if (lock.expiresAt <= Date.now()) {
      responseLockRef.current.delete(requestId);
      return "";
    }
    return lock.status;
  }

  const pageTitle = useMemo(() => activeSub, [activeSub]);

  const filteredMenuGroups = useMemo(() => {
    const query = navQuery.trim().toLowerCase();
    if (!query) {
      return menuGroups;
    }

    return menuGroups
      .map((group) => {
        const groupMatches = group.title.toLowerCase().includes(query);
        const matchingItems = group.items.filter((item) => item.toLowerCase().includes(query));
        if (groupMatches) {
          return group;
        }
        if (matchingItems.length > 0) {
          return { ...group, items: matchingItems };
        }
        return null;
      })
      .filter(Boolean);
  }, [navQuery]);

  const liveClockLabel = useMemo(
    () => liveClock.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    [liveClock]
  );

  const liveDateLabel = useMemo(
    () => liveClock.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" }),
    [liveClock]
  );

  useEffect(() => {
    try {
      window.localStorage.setItem("hms-theme", isDarkMode ? "dark" : "light");
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  }, [isDarkMode]);

  function queueRefresh(scope = "fast") {
    if (!accessToken) {
      return;
    }

    if (scope === "full") {
      void loadLiveData(accessToken, hospitalId).catch(() => {
        // Keep UI interactive even if background refresh fails.
      });
      return;
    }

    void loadFastLaneData(accessToken).catch(() => {
      // Keep UI interactive even if background refresh fails.
    });
  }

  async function loadFastLaneData(seedToken = accessToken) {
    const token = seedToken;
    if (!token) {
      throw new Error("Missing access token");
    }

    const allPayload = await authGet("/hospital/requests?limit=80&mode=fast", token);
    const allItems = allPayload?.items || [];

    pruneResponseLocks();

    const incomingPending = allItems
      .filter((item) => isUnresolvedStatus(item.status))
      .filter((item) => getResponseLockStatus(item.id) !== "accepted");
    const incomingAccepted = allItems.filter((item) => item.status === "accepted");
    const acceptedIds = new Set(incomingAccepted.map((item) => item.id));

    for (const [requestId, lock] of responseLockRef.current.entries()) {
      if (lock?.status !== "accepted" || acceptedIds.has(requestId)) {
        continue;
      }

      const fallbackItem =
        activeRequests.find((item) => item.id === requestId) ||
        recentRequests.find((item) => item.id === requestId) ||
        incomingPending.find((item) => item.id === requestId) ||
        { id: requestId, status: "accepted" };

      incomingAccepted.unshift({ ...fallbackItem, status: "accepted" });
      acceptedIds.add(requestId);
    }

    setPendingRequests(incomingPending);
    setActiveRequests(incomingAccepted);
    setLastFastSyncAt(new Date().toISOString());
  }

  async function loadLiveData(seedToken = accessToken, seedHospitalId = hospitalId) {
    const token = seedToken;
    const userHospitalId = seedHospitalId;

    if (!token) {
      throw new Error("Missing access token");
    }

    const [commandCenter, requestsPayload, doctorsPayload, fleetPayload] = await Promise.all([
      authGet("/hospital/command-center", token),
      authGet("/hospital/requests?limit=50", token),
      authGet("/operations/doctors", token),
      authGet("/ambulance/fleet", token)
    ]);

    const [
      roomPayload,
      billingPayload,
      billingInvoicePayload,
      bloodUnitsPayload,
      bloodIssuesPayload,
      shiftsItems,
      sampleItems,
      otItems,
      consumableItems,
      inventoryItems,
      issueItems,
      claimItems
    ] = await Promise.all([
      authGetOrDefault("/operations/room-allotments", token, { items: [] }),
      authGetOrDefault("/operations/billing", token, { taxPercentage: 5, services: [] }),
      authGetOrDefault("/operations/billing/invoices", token, { items: [] }),
      authGetOrDefault("/operations/blood-bank/units", token, { items: [] }),
      authGetOrDefault("/operations/blood-bank/issues", token, { items: [] }),
      authGetItemsOrDefault("/operations/doctor-shifts", token),
      authGetItemsOrDefault("/operations/lab-samples", token),
      authGetItemsOrDefault("/operations/ot-schedules", token),
      authGetItemsOrDefault("/operations/ot-consumables", token),
      authGetItemsOrDefault("/operations/pharmacy-inventory", token),
      authGetItemsOrDefault("/operations/pharmacy-issues", token),
      authGetItemsOrDefault("/operations/insurance-claims", token)
    ]);

    setSnapshot(commandCenter);
    setRecentRequests(requestsPayload?.items || []);
    setAmbulanceFleet(fleetPayload?.items || []);
    setDoctors(doctorsPayload?.items || []);
    setRoomAllotments(roomPayload?.items || []);
    setBillingSnapshot(billingPayload || { taxPercentage: 5, services: [] });
    setBillingInvoices(billingInvoicePayload?.items || []);
    setBloodUnits(bloodUnitsPayload?.items || []);
    setBloodIssues(bloodIssuesPayload?.items || []);
    setShiftRows(shiftsItems);
    setLabSamples(sampleItems);
    setOtCases(otItems);
    setConsumables(consumableItems);
    setInventory(inventoryItems);
    setIssueLog(issueItems);
    setClaims(claimItems);

    // Maintain fast-lane queue separately for low-latency actions.
    await loadFastLaneData(token);
  }

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let mounted = true;

    async function bootstrap() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        await loadLiveData();
        if (!mounted) {
          return;
        }
        setConnectionLabel("Live API connected");
      } catch (error) {
        if (!mounted) {
          return;
        }
        setErrorMessage(`Live data unavailable: ${error.message}`);
        setConnectionLabel("Offline sample mode");
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    void bootstrap();
    const timer = setInterval(bootstrap, 45000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [accessToken, hospitalId]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setPageAnimating(true);
    const timer = setTimeout(() => setPageAnimating(false), 420);
    return () => clearTimeout(timer);
  }, [activeMain, activeSub]);

  useEffect(() => {
    function isTypingTarget(target) {
      return Boolean(
        target &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)
      );
    }

    function onKeyDown(event) {
      if (isTypingTarget(event.target)) {
        return;
      }

      if (event.key === "/") {
        event.preventDefault();
        navSearchRef.current?.focus();
        return;
      }

      if ((event.key === "r" || event.key === "R") && event.altKey) {
        event.preventDefault();
        queueRefresh("full");
        return;
      }

      if ((event.key === "n" || event.key === "N") && event.altKey) {
        event.preventDefault();
        setShowNotifications((prev) => !prev);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let mounted = true;
    const fastLoop = async () => {
      try {
        await loadFastLaneData(accessToken);
      } catch {
        if (!mounted) {
          return;
        }
      }
    };

    void fastLoop();
    const timer = setInterval(fastLoop, 2000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [accessToken]);

  async function handleLogin(event) {
    event.preventDefault();
    try {
      setAuthError("");
      setIsLoading(true);
      const login = await apiLogin({
        email: authForm.email,
        password: authForm.password,
        role: authForm.role
      });
      setAccessToken(login.accessToken);
      setHospitalId(login?.user?.hospitalId || null);
      setHospitalCode(login?.user?.hospitalCode || "");
      setConnectionLabel("Live API connected");
    } catch (error) {
      setAuthError(error.message || "Login failed");
      setConnectionLabel("Offline sample mode");
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setAccessToken("");
    setHospitalId(null);
    setHospitalCode("");
    setSnapshot(null);
    setRecentRequests([]);
    setPendingRequests([]);
    setActiveRequests([]);
    setAmbulanceFleet([]);
    setDoctors([]);
    setRoomAllotments([]);
    setBillingSnapshot({ taxPercentage: 5, services: [] });
    setBillingInvoices([]);
    setBloodUnits([]);
    setBloodIssues([]);
    setShiftRows([]);
    setLabSamples([]);
    setOtCases([]);
    setConsumables([]);
    setInventory([]);
    setIssueLog([]);
    setClaims([]);
    setActionInFlight({});
    setLastFastSyncAt("");
    setConnectionLabel("Offline sample mode");
    responseLockRef.current.clear();
  }

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    const stream = new EventSource(`${API_BASE}/events?token=${encodeURIComponent(accessToken)}`);
    stream.onopen = () => setConnectionLabel("Live API + realtime stream");
    stream.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data || "{}");
        if (payload?.type === "heartbeat") {
          return;
        }
      } catch {
        return;
      }

      const eventType = payload?.type || "";
      if (!["request.status_changed", "request.created", "allocation.attempted", "request.media_uploaded"].includes(eventType)) {
        return;
      }

      if (payload?.type === "request.status_changed" && payload?.payload?.status === "accepted" && payload?.payload?.requestId) {
        setResponseLock(payload.payload.requestId, "accepted");
      }

      void loadFastLaneData(accessToken).catch(() => {
        // Ignore intermittent realtime refresh failures.
      });

      if (payload?.type === "request.status_changed" || payload?.type === "request.created") {
        setRecentRequests((prev) => {
          const existing = prev.find((item) => item.id === payload.payload?.requestId);
          if (!existing) {
            return prev;
          }
          return prev.map((item) =>
            item.id === payload.payload.requestId
              ? { ...item, status: payload.payload.status || item.status }
              : item
          );
        });
      }
    };
    stream.onerror = () => setConnectionLabel("Live API connected");

    return () => {
      stream.close();
    };
  }, [accessToken, hospitalId]);

  async function handleCreateDoctor(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Doctor creation requires live backend connection." });
      return;
    }
    try {
      const formData = new FormData(form);
      const created = await authSend("/operations/doctors", "POST", accessToken, {
        firstName: String(formData.get("firstName") || ""),
        middleName: String(formData.get("middleName") || ""),
        lastName: String(formData.get("lastName") || ""),
        gender: String(formData.get("gender") || "other"),
        dateOfBirth: String(formData.get("dateOfBirth") || ""),
        bloodGroup: String(formData.get("bloodGroup") || ""),
        email: String(formData.get("email") || ""),
        mobile: String(formData.get("mobile") || ""),
        alternateContact: String(formData.get("alternateContact") || ""),
        address: String(formData.get("address") || ""),
        department: String(formData.get("department") || "General"),
        specialization: String(formData.get("specialization") || "General Medicine")
      });
      setDoctors((prev) => [created, ...prev]);
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Doctor profile created successfully." });
      form.reset();
    } catch (error) {
      setActionNotice({ type: "error", text: `Doctor save failed: ${error.message}` });
    }
  }

  async function handleCreateRoomAllotment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Room allotment requires live backend connection." });
      return;
    }
    try {
      const formData = new FormData(form);
      const created = await authSend("/operations/room-allotments", "POST", accessToken, {
        patientName: String(formData.get("patientName") || ""),
        patientId: String(formData.get("patientId") || ""),
        age: Number(formData.get("age") || 0),
        gender: String(formData.get("gender") || "other"),
        mobile: String(formData.get("mobile") || ""),
        emergencyContact: String(formData.get("emergencyContact") || ""),
        medicalHistory: String(formData.get("medicalHistory") || ""),
        allergies: String(formData.get("allergies") || ""),
        roomNumber: String(formData.get("roomNumber") || "")
      });
      setRoomAllotments((prev) => [created, ...prev]);
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Room allotment created successfully." });
      form.reset();
    } catch (error) {
      setActionNotice({ type: "error", text: `Room allotment failed: ${error.message}` });
    }
  }

  async function handleAddBillingService(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Billing updates require live backend connection." });
      return;
    }
    try {
      const formData = new FormData(form);
      const service = await authSend("/operations/billing/services", "POST", accessToken, {
        serviceName: String(formData.get("serviceName") || ""),
        amount: Number(formData.get("amount") || 0)
      });
      setBillingSnapshot((prev) => ({ ...prev, services: [service, ...(prev.services || [])] }));
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Billing service added successfully." });
      form.reset();
    } catch (error) {
      setActionNotice({ type: "error", text: `Billing service failed: ${error.message}` });
    }
  }

  async function handleUpdateTax(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Billing updates require live backend connection." });
      return;
    }
    try {
      const formData = new FormData(event.currentTarget);
      const updated = await authSend("/operations/billing/tax", "PUT", accessToken, {
        taxPercentage: Number(formData.get("taxPercentage") || 0)
      });
      setBillingSnapshot((prev) => ({ ...prev, taxPercentage: updated.taxPercentage }));
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Tax settings updated successfully." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Tax update failed: ${error.message}` });
    }
  }

  async function handleRespond(requestId, action) {
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Request response requires live backend connection." });
      return;
    }
    if (actionInFlight[requestId]) {
      return;
    }

    const optimisticStatus = action === "accept" ? "accepted" : "rejected_retrying";
    setActionInFlight((prev) => ({ ...prev, [requestId]: action }));
    setRecentRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status: optimisticStatus } : item)));

    try {
      const payload = { action };
      if (hospitalId) {
        payload.hospitalId = hospitalId;
      }
      const updated = await authSend(`/hospital/requests/${requestId}/respond`, "POST", accessToken, payload);
      setRecentRequests((prev) => prev.map((item) => (item.id === requestId ? { ...item, status: updated.status } : item)));
      if (updated.status === "accepted") {
        setResponseLock(requestId, "accepted");
        setActiveRequests((prev) => {
          const existing = prev.find((item) => item.id === requestId);
          if (existing) {
            return prev.map((item) => (item.id === requestId ? { ...item, ...updated } : item));
          }

          const pendingMatch = pendingRequests.find((item) => item.id === requestId);
          return [{ ...(pendingMatch || { id: requestId }), ...updated }, ...prev].slice(0, 60);
        });
      }
      queueRefresh("fast");
      setActionNotice({ type: "success", text: `Request ${requestId} marked as ${updated.status}.` });
    } catch (error) {
      queueRefresh("fast");
      setActionNotice({ type: "error", text: `Request action failed: ${error.message}` });
    } finally {
      setActionInFlight((prev) => {
        const next = { ...prev };
        delete next[requestId];
        return next;
      });
    }
  }

  const notificationItems = useMemo(() => {
    const pendingAlerts = pendingRequests.slice(0, 6).map((item) => ({
      id: `pending-${item.id}`,
      severity: "high",
      title: `Pending emergency ${item.id}`,
      message: `${item.patientName || item.callerName || "Unknown patient"} | ${item.emergencyType || "unspecified"}`,
      time: item.createdAt || new Date().toISOString()
    }));

    const activeAlerts = activeRequests.slice(0, 4).map((item) => ({
      id: `active-${item.id}`,
      severity: "info",
      title: `In-progress case ${item.id}`,
      message: `${item.patientName || item.callerName || "Unknown patient"} is assigned to your hospital.`,
      time: item.updatedAt || item.createdAt || new Date().toISOString()
    }));

    return [...pendingAlerts, ...activeAlerts].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  }, [pendingRequests, activeRequests]);

  async function handleLoadMedia(requestId) {
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Media access requires live backend connection." });
      return;
    }
    try {
      const payload = await authGet(`/emergency/requests/${requestId}/media`, accessToken);
      setMediaByRequest((prev) => ({ ...prev, [requestId]: payload.items || [] }));
      setActionNotice({ type: "success", text: `Loaded ${(payload.items || []).length} media records for ${requestId}.` });
    } catch (error) {
      setActionNotice({ type: "error", text: `Media load failed: ${error.message}` });
    }
  }

  async function handleRegisterAmbulance(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Ambulance registration requires live backend connection." });
      return;
    }
    try {
      const formData = new FormData(event.currentTarget);
      const created = await authSend("/ambulance/fleet", "POST", accessToken, {
        city: String(formData.get("city") || "Indore"),
        ownerType: "hospital",
        hospitalId: hospitalId || undefined,
        vehicleNumber: String(formData.get("vehicleNumber") || ""),
        mobileNumber: String(formData.get("mobileNumber") || ""),
        latitude: Number(formData.get("latitude") || 0),
        longitude: Number(formData.get("longitude") || 0)
      });
      setAmbulanceFleet((prev) => [created, ...prev]);
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Ambulance registered successfully." });
      event.currentTarget.reset();
    } catch (error) {
      setActionNotice({ type: "error", text: `Ambulance registration failed: ${error.message}` });
    }
  }

  function printInvoiceNow(invoice) {
    if (!invoice || typeof window === "undefined") {
      return;
    }

    const printable = window.open("", "_blank", "width=820,height=640");
    if (!printable) {
      return;
    }

    printable.document.write(`
      <html>
        <head>
          <title>${invoice.invoiceNumber}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #1f2937; }
            h1 { margin: 0 0 8px; }
            .muted { color: #6b7280; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            td, th { border: 1px solid #d1d5db; padding: 10px; text-align: left; }
            .total { font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Discharge Invoice</h1>
          <div class="muted">Invoice ${invoice.invoiceNumber}</div>
          <table>
            <tr><th>Patient</th><td>${invoice.patientName || "-"}</td></tr>
            <tr><th>Room</th><td>${invoice.roomNumber || "-"}</td></tr>
            <tr><th>Subtotal</th><td>$${invoice.subtotal || 0}</td></tr>
            <tr><th>Tax</th><td>${invoice.taxPercentage || 0}% ($${invoice.taxAmount || 0})</td></tr>
            <tr class="total"><th>Total</th><td>$${invoice.totalAmount || 0}</td></tr>
            <tr><th>Billed At</th><td>${invoice.billedAt ? new Date(invoice.billedAt).toLocaleString() : "-"}</td></tr>
          </table>
        </body>
      </html>
    `);
    printable.document.close();
    printable.focus();
    printable.print();
  }

  async function handleDischargeRoom(roomAllotmentId, billAmount) {
    if (!accessToken || !roomAllotmentId) {
      return;
    }
    if (!Number.isFinite(billAmount) || billAmount <= 0) {
      setActionNotice({ type: "error", text: "Enter a valid bill amount before discharge." });
      return;
    }
    if (dischargeInFlight[roomAllotmentId]) {
      return;
    }

    setDischargeInFlight((prev) => ({ ...prev, [roomAllotmentId]: true }));
    try {
      const linkedRequest = roomAllotments.find((item) => item.id === roomAllotmentId)?.patientId || null;

      const updated = await authSend(`/operations/room-allotments/${roomAllotmentId}/discharge`, "PATCH", accessToken, {
        billAmount,
        notes: "Discharge billing generated"
      });
      setRoomAllotments((prev) => prev.map((item) => (item.id === roomAllotmentId ? updated.room : item)));
      if (updated.invoice) {
        setBillingInvoices((prev) => [updated.invoice, ...prev]);
        printInvoiceNow(updated.invoice);
      }

      // Reflect resource release instantly in UI without waiting for next refresh cycle.
      if (linkedRequest) {
        const completed = activeRequests.find((item) => item.id === linkedRequest);
        if (completed?.assignedAmbulanceId) {
          setAmbulanceFleet((prev) => prev.map((item) => (
            item.id === completed.assignedAmbulanceId ? { ...item, tripStatus: "idle" } : item
          )));
        }
        setActiveRequests((prev) => prev.filter((item) => item.id !== linkedRequest));
        setRecentRequests((prev) => prev.map((item) => (
          item.id === linkedRequest ? { ...item, status: "completed" } : item
        )));
      }

      queueRefresh("full");
      setActionNotice({ type: "success", text: `Patient discharged. Invoice ${updated.invoice?.invoiceNumber || "generated"} total $${updated.invoice?.totalAmount || billAmount}.` });
    } catch (error) {
      setActionNotice({ type: "error", text: `Discharge failed: ${error.message}` });
    } finally {
      setDischargeInFlight((prev) => {
        const next = { ...prev };
        delete next[roomAllotmentId];
        return next;
      });
    }
  }

  async function handleAmbulanceLocation(event, ambulanceId) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Location update requires live backend connection." });
      return;
    }
    try {
      const formData = new FormData(event.currentTarget);
      const updated = await authSend(`/ambulance/${ambulanceId}/location`, "PATCH", accessToken, {
        latitude: Number(formData.get("latitude") || 0),
        longitude: Number(formData.get("longitude") || 0)
      });
      setAmbulanceFleet((prev) => prev.map((item) => (item.id === ambulanceId ? { ...item, ...updated } : item)));
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Ambulance location updated." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Location update failed: ${error.message}` });
    }
  }

  async function handleDispatchAmbulance(event, ambulanceId) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Dispatch requires live backend connection." });
      return;
    }
    try {
      const formData = new FormData(event.currentTarget);
      await authSend(`/ambulance/${ambulanceId}/dispatch`, "POST", accessToken, {
        requestId: String(formData.get("requestId") || "") || undefined,
        patientLatitude: Number(formData.get("patientLatitude") || 0),
        patientLongitude: Number(formData.get("patientLongitude") || 0),
        patientPhone: String(formData.get("patientPhone") || "") || undefined
      });
      setAmbulanceFleet((prev) => prev.map((item) => (item.id === ambulanceId ? { ...item, tripStatus: "dispatched" } : item)));
      queueRefresh("full");
      setActionNotice({ type: "success", text: "Ambulance dispatched successfully." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Dispatch failed: ${error.message}` });
    }
  }

  async function addShift(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Shift management requires live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    const doctorId = String(formData.get("doctorId") || "");
    const doctor = doctors.find((item) => item.id === doctorId);
    try {
      const created = await authSend("/operations/doctor-shifts", "POST", accessToken, {
        doctorId,
        name: `${doctor?.firstName || ""} ${doctor?.lastName || ""}`.trim() || "Unknown",
        shiftStart: String(formData.get("shiftStart") || ""),
        shiftEnd: String(formData.get("shiftEnd") || "")
      });
      setShiftRows((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Shift added successfully." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Shift add failed: ${error.message}` });
    }
  }

  async function addSample(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Lab updates require live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/lab-samples", "POST", accessToken, {
        sampleId: String(formData.get("sampleId") || ""),
        patient: String(formData.get("patient") || ""),
        test: String(formData.get("test") || ""),
        status: "in_process"
      });
      setLabSamples((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Lab sample added to processing queue." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Lab sample creation failed: ${error.message}` });
    }
  }

  async function addOtCase(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "OT scheduling requires live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/ot-schedules", "POST", accessToken, {
        ot: String(formData.get("ot") || ""),
        procedure: String(formData.get("procedure") || ""),
        surgeon: String(formData.get("surgeon") || ""),
        time: String(formData.get("time") || ""),
        status: "Scheduled"
      });
      setOtCases((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "OT case scheduled successfully." });
    } catch (error) {
      setActionNotice({ type: "error", text: `OT schedule failed: ${error.message}` });
    }
  }

  async function addConsumable(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Consumable updates require live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/ot-consumables", "POST", accessToken, {
        name: String(formData.get("name") || ""),
        quantity: Number(formData.get("quantity") || 0),
        status: "Ready"
      });
      setConsumables((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Consumable inventory updated." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Consumable update failed: ${error.message}` });
    }
  }

  async function addInventory(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Pharmacy updates require live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/pharmacy-inventory", "POST", accessToken, {
        medicine: String(formData.get("medicine") || ""),
        units: Number(formData.get("units") || 0)
      });
      setInventory((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Pharmacy inventory updated." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Inventory update failed: ${error.message}` });
    }
  }

  async function issueDrug(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Medicine issue requires live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/pharmacy-issues", "POST", accessToken, {
        patient: String(formData.get("patient") || ""),
        medicine: String(formData.get("medicine") || "")
      });
      setIssueLog((prev) => [created, ...prev]);
      setInventory((prev) => prev.map((item) => (item.medicine === created.medicine ? { ...item, units: Math.max(Number(item.units || 0) - 1, 0) } : item)));
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Medicine issued and inventory adjusted." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Medicine issue failed: ${error.message}` });
    }
  }

  async function addClaim(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Claim submission requires live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/insurance-claims", "POST", accessToken, {
        patient: String(formData.get("patient") || ""),
        provider: String(formData.get("provider") || ""),
        amount: Number(formData.get("amount") || 0),
        status: "Submitted"
      });
      setClaims((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Insurance claim submitted." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Claim submission failed: ${error.message}` });
    }
  }

  async function addBloodUnit(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Blood bank updates require live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/blood-bank/units", "POST", accessToken, {
        bloodGroup: String(formData.get("bloodGroup") || ""),
        component: String(formData.get("component") || ""),
        unitsAvailable: Number(formData.get("unitsAvailable") || 0),
        reorderLevel: Number(formData.get("reorderLevel") || 5)
      });
      setBloodUnits((prev) => [created, ...prev]);
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Blood stock entry added." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Blood stock update failed: ${error.message}` });
    }
  }

  async function issueBlood(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionNotice({ type: "error", text: "Blood issue requires live backend connection." });
      return;
    }
    const formData = new FormData(event.currentTarget);
    try {
      const created = await authSend("/operations/blood-bank/issues", "POST", accessToken, {
        patient: String(formData.get("patient") || ""),
        bloodGroup: String(formData.get("bloodGroup") || ""),
        component: String(formData.get("component") || ""),
        unitsIssued: Number(formData.get("unitsIssued") || 0),
        status: "Issued"
      });
      setBloodIssues((prev) => [created, ...prev]);
      setBloodUnits((prev) => prev.map((item) => (
        item.bloodGroup === created.bloodGroup && item.component === created.component
          ? { ...item, unitsAvailable: Math.max(Number(item.unitsAvailable || 0) - Number(created.unitsIssued || 0), 0) }
          : item
      )));
      queueRefresh("full");
      event.currentTarget.reset();
      setActionNotice({ type: "success", text: "Blood issued and stock adjusted." });
    } catch (error) {
      setActionNotice({ type: "error", text: `Blood issue failed: ${error.message}` });
    }
  }

  function addDepartment(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const created = {
      id: `dept-${Date.now()}`,
      name: String(formData.get("name") || ""),
      head: String(formData.get("head") || ""),
      status: "Active"
    };
    setDepartments((prev) => [created, ...prev]);
    setActionNotice({ type: "success", text: "Department added." });
    event.currentTarget.reset();
  }

  function addAsset(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const created = {
      id: `asset-${Date.now()}`,
      assetName: String(formData.get("assetName") || ""),
      tag: String(formData.get("tag") || ""),
      location: String(formData.get("location") || ""),
      status: "Active"
    };
    setAssets((prev) => [created, ...prev]);
    setActionNotice({ type: "success", text: "Asset added." });
    event.currentTarget.reset();
  }

  function addDocument(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setDocuments((prev) => [{
      id: `doc-${Date.now()}`,
      title: String(formData.get("title") || ""),
      owner: String(formData.get("owner") || ""),
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setActionNotice({ type: "success", text: "Document registered." });
    event.currentTarget.reset();
  }

  function addConsent(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setConsents((prev) => [{
      id: `consent-${Date.now()}`,
      patient: String(formData.get("patient") || ""),
      procedure: String(formData.get("procedure") || ""),
      status: "Captured",
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setActionNotice({ type: "success", text: "Consent captured." });
    event.currentTarget.reset();
  }

  function addFeedbackEntry(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFeedback((prev) => [{
      id: `fb-${Date.now()}`,
      source: String(formData.get("source") || ""),
      message: String(formData.get("message") || ""),
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setActionNotice({ type: "success", text: "Feedback logged." });
    event.currentTarget.reset();
  }

  function addQualityCheck(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setQualityChecks((prev) => [{
      id: `qc-${Date.now()}`,
      audit: String(formData.get("audit") || ""),
      status: String(formData.get("status") || "Open"),
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setActionNotice({ type: "success", text: "Compliance check added." });
    event.currentTarget.reset();
  }

  function addWasteLog(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setWasteLogs((prev) => [{
      id: `waste-${Date.now()}`,
      category: String(formData.get("category") || ""),
      weight: Number(formData.get("weight") || 0),
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setActionNotice({ type: "success", text: "Waste entry logged." });
    event.currentTarget.reset();
  }

  function addVisitor(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setVisitors((prev) => [{
      id: `visitor-${Date.now()}`,
      name: String(formData.get("name") || ""),
      patient: String(formData.get("patient") || ""),
      createdAt: new Date().toLocaleString()
    }, ...prev]);
    setActionNotice({ type: "success", text: "Visitor checked in." });
    event.currentTarget.reset();
  }

  function renderPage() {
    const key = `${activeMain}:${activeSub}`;

    if (key === "HMS Overview:Operations Overview") {
      return (
        <OverviewPage
          snapshot={snapshot}
          pendingRequests={pendingRequests}
          activeRequests={activeRequests}
          recentRequests={recentRequests}
          isLoading={isLoading}
          errorMessage={errorMessage}
          lastFastSyncAt={lastFastSyncAt}
        />
      );
    }
    if (key === "HMS Overview:Emergency Board") {
      return (
        <EmergencyBoardPage
          pendingRequests={pendingRequests}
          activeRequests={activeRequests}
          onRespond={handleRespond}
          onLoadMedia={handleLoadMedia}
          mediaByRequest={mediaByRequest}
          actionInFlight={actionInFlight}
        />
      );
    }
    if (key === "HMS Overview:Department Snapshot") {
      return <DepartmentSnapshotPage doctors={doctors} roomAllotments={roomAllotments} snapshot={snapshot} />;
    }

    if (key === "Doctors:All Doctors") {
      return <AllDoctorsPage doctors={doctors} />;
    }
    if (key === "Doctors:Add Doctor") {
      return <AddDoctorPage onSubmit={handleCreateDoctor} />;
    }
    if (key === "Doctors:Shift Management") {
      return <ShiftManagementPage shifts={shiftRows} doctors={doctors} onAddShift={addShift} />;
    }

    if (key === "Patients:OPD Register") {
      return <OpdPage recentRequests={recentRequests} />;
    }
    if (key === "Patients:IPD Register") {
      return <IpdPage roomAllotments={roomAllotments} />;
    }
    if (key === "Patients:Discharge Queue") {
      return <DischargeQueuePage roomAllotments={roomAllotments} billingInvoices={billingInvoices} onDischarge={handleDischargeRoom} dischargeInFlight={dischargeInFlight} />;
    }

    if (key === "Room Management:Allotted Rooms") {
      return <AllottedRoomsPage roomAllotments={roomAllotments} billingInvoices={billingInvoices} />;
    }
    if (key === "Room Management:New Allotment") {
      return <NewAllotmentPage onSubmit={handleCreateRoomAllotment} />;
    }
    if (key === "Room Management:Ward Occupancy") {
      return <WardOccupancyPage roomAllotments={roomAllotments} ambulanceFleet={ambulanceFleet} consumables={consumables} inventory={inventory} billingInvoices={billingInvoices} />;
    }

    if (key === "Departments:Department List") {
      return <DepartmentListPage doctors={doctors} departments={departments} />;
    }
    if (key === "Departments:Add Department") {
      return <AddDepartmentPage onAddDepartment={addDepartment} />;
    }

    if (key === "Laboratory:Sample Queue") {
      return <SampleQueuePage samples={labSamples} onAddSample={addSample} />;
    }
    if (key === "Laboratory:Reports Dispatch") {
      return <ReportsDispatchPage samples={labSamples} />;
    }

    if (key === "Operation Theatre:OT Schedule") {
      return <OTSchedulePage otCases={otCases} onAddOtCase={addOtCase} />;
    }
    if (key === "Operation Theatre:Consumables") {
      return <ConsumablesPage consumables={consumables} onAddConsumable={addConsumable} />;
    }

    if (key === "Emergency Transport:Fleet Monitor") {
      return <FleetMonitorPage fleet={ambulanceFleet} onRegister={handleRegisterAmbulance} onLocation={handleAmbulanceLocation} />;
    }
    if (key === "Emergency Transport:Dispatch Hub") {
      return <DispatchHubPage fleet={ambulanceFleet} pendingRequests={recentRequests} onDispatch={handleDispatchAmbulance} />;
    }

    if (key === "Blood Bank:Stock Ledger") {
      return <BloodBankStockPage units={bloodUnits} onAddUnit={addBloodUnit} />;
    }
    if (key === "Blood Bank:Issue Desk") {
      return <BloodIssueDeskPage issues={bloodIssues} units={bloodUnits} onIssueBlood={issueBlood} />;
    }

    if (key === "Inventory:Central Inventory") {
      return <CentralInventoryPage consumables={consumables} inventory={inventory} />;
    }
    if (key === "Inventory:Assets & Equipment") {
      return <AssetsEquipmentPage assets={assets} onAddAsset={addAsset} />;
    }

    if (key === "Human Resources:Staff Directory") {
      return <StaffDirectoryPage doctors={doctors} staff={staff} />;
    }
    if (key === "Human Resources:Attendance") {
      return <AttendancePage shiftRows={shiftRows} />;
    }

    if (key === "Documents & Consent:Document Vault") {
      return <DocumentVaultPage documents={documents} onAddDocument={addDocument} />;
    }
    if (key === "Documents & Consent:Consent Tracker") {
      return <ConsentTrackerPage consents={consents} onAddConsent={addConsent} />;
    }

    if (key === "Pharmacy:Inventory") {
      return <PharmacyInventoryPage inventory={inventory} onAddInventory={addInventory} />;
    }
    if (key === "Pharmacy:Issue Counter") {
      return <IssueCounterPage issueLog={issueLog} inventory={inventory} onIssueDrug={issueDrug} />;
    }

    if (key === "Billing & Accounts:Billing Desk") {
      return (
        <BillingDeskPage
          billingSnapshot={billingSnapshot}
          billingInvoices={billingInvoices}
          onAddService={handleAddBillingService}
          onUpdateTax={handleUpdateTax}
        />
      );
    }
    if (key === "Billing & Accounts:Invoice Ledger") {
      return <BillingInvoicePage invoices={billingInvoices} />;
    }
    if (key === "Billing & Accounts:Insurance Claims") {
      return <InsuranceClaimsPage claims={claims} onAddClaim={addClaim} />;
    }

    if (key === "Quality & Support:Feedback") {
      return <FeedbackPage feedback={feedback} onAddFeedback={addFeedbackEntry} />;
    }
    if (key === "Quality & Support:Quality & Compliance") {
      return <QualityCompliancePage qualityChecks={qualityChecks} onAddQualityCheck={addQualityCheck} />;
    }
    if (key === "Quality & Support:Waste Management") {
      return <WasteManagementPage wasteLogs={wasteLogs} onAddWasteLog={addWasteLog} />;
    }
    if (key === "Quality & Support:Visitor Management") {
      return <VisitorManagementPage visitors={visitors} onAddVisitor={addVisitor} />;
    }

    if (key === "Reports & Settings:Reports & Analytics") {
      return <ReportsAnalyticsPage snapshot={snapshot} pendingRequests={pendingRequests} activeRequests={activeRequests} claims={claims} billingInvoices={billingInvoices} />;
    }
    if (key === "Reports & Settings:System Settings") {
      return <SystemSettingsPage />;
    }

    return (
      <OverviewPage
        snapshot={snapshot}
        pendingRequests={pendingRequests}
        activeRequests={activeRequests}
        recentRequests={recentRequests}
        isLoading={isLoading}
        errorMessage={errorMessage}
        lastFastSyncAt={lastFastSyncAt}
      />
    );
  }

  if (!accessToken) {
    return (
      <div className={isDarkMode ? "layout dark-mode" : "layout"} style={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <section className="panel form-panel" style={{ width: "min(560px, 92vw)" }}>
          <header>
            <h3>Hospital HMS Login</h3>
            <span>Authenticate with role, email and password</span>
          </header>
          <form onSubmit={handleLogin}>
            <div className="form-grid three-col" style={{ gridTemplateColumns: "1fr" }}>
              <input
                name="email"
                placeholder="Email"
                value={authForm.email}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, email: event.target.value }))}
                required
              />
              <input
                name="password"
                type="password"
                placeholder="Password"
                value={authForm.password}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, password: event.target.value }))}
                required
              />
              <select
                name="role"
                value={authForm.role}
                onChange={(event) => setAuthForm((prev) => ({ ...prev, role: event.target.value }))}
              >
                <option value="hospital_admin_staff">hospital_admin_staff</option>
                <option value="dispatch_operator">dispatch_operator</option>
                <option value="doctor">doctor</option>
                <option value="nurse">nurse</option>
              </select>
            </div>
            <div className="actions-row">
              <button type="submit" className="primary" disabled={isLoading}>{isLoading ? "Signing in..." : "Sign In"}</button>
            </div>
            {authError ? <p className="muted-text">{authError}</p> : null}
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? "layout dark-mode" : "layout"}>
      <aside className="sidebar">
        <div className="logo">MediSync HMS</div>
        <div className="user-block">
          <div className="user-avatar">CH</div>
          <div>
            <h4>{hospitalCode || "Hospital"}</h4>
            <p>Operations Center</p>
          </div>
        </div>
        <div className="nav-search-wrap">
          <input
            ref={navSearchRef}
            className="nav-search"
            placeholder="Search modules... ( / )"
            value={navQuery}
            onChange={(event) => setNavQuery(event.target.value)}
          />
        </div>
        <nav>
          {filteredMenuGroups.map((group) => {
            const isActive = activeMain === group.title;
            return (
              <div key={group.title} className="nav-group">
                <button
                  className={isActive ? "nav-parent active" : "nav-parent"}
                  onClick={() => {
                    setActiveMain(group.title);
                    setActiveSub(group.items[0]);
                  }}
                >
                  {group.title}
                  <span>{isActive ? "-" : "+"}</span>
                </button>
                {isActive && (
                  <div className="nav-children">
                    {group.items.map((item) => (
                      <button
                        key={item}
                        className={item === activeSub ? "nav-child active" : "nav-child"}
                        onClick={() => setActiveSub(item)}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {filteredMenuGroups.length === 0 ? <p className="muted-text">No matching modules.</p> : null}
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
            <p>{activeMain} / {activeSub}</p>
          </div>
          <div className="top-right">
            <button
              className="theme-toggle"
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {isDarkMode ? "☀️" : "🌙"}
            </button>
            <span className="connect-badge">{connectionLabel}</span>
            <span className="clock-badge">{liveDateLabel} | {liveClockLabel}</span>
            <button className="notif" type="button" onClick={() => setShowNotifications((prev) => !prev)}>
              {notificationItems.length}
            </button>
            <button className="flag" type="button" onClick={() => setShowRegionPicker((prev) => !prev)}>{regionCode}</button>
            <strong>Hospital Admin</strong>
            <button className="ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <section className="quick-actions panel">
          <header>
            <h3>Quick Actions</h3>
            <span>Alt+R refresh | Alt+N notifications | / search</span>
          </header>
          <div className="actions-row left">
            <button
              type="button"
              className="primary"
              onClick={() => {
                setActiveMain("HMS Overview");
                setActiveSub("Emergency Board");
              }}
            >
              Open Emergency Board
            </button>
            <button type="button" className="ghost" onClick={() => queueRefresh("full")}>Force Full Sync</button>
            <button type="button" className="ghost" onClick={() => setShowNotifications((prev) => !prev)}>Toggle Alerts</button>
          </div>
        </section>
        {showNotifications ? (
          <section className="panel">
            <header>
              <h3>Notifications</h3>
              <span>{notificationItems.length} active alerts</span>
            </header>
            <ul className="status-list">
              {notificationItems.length === 0 ? (
                <li><span>No active notifications</span><em className="pill ok">Clear</em></li>
              ) : (
                notificationItems.slice(0, 10).map((item) => (
                  <li key={item.id}>
                    <span>{item.title}: {item.message}</span>
                    <em className={item.severity === "high" ? "pill danger" : "pill ok"}>{new Date(item.time).toLocaleTimeString()}</em>
                  </li>
                ))
              )}
            </ul>
          </section>
        ) : null}
        {showRegionPicker ? (
          <section className="panel">
            <header>
              <h3>Region Selector</h3>
              <span>Controls locale context for operator view</span>
            </header>
            <div className="actions-row left">
              {[
                { code: "IN", label: "India" },
                { code: "US", label: "United States" },
                { code: "UAE", label: "United Arab Emirates" }
              ].map((region) => (
                <button
                  key={region.code}
                  type="button"
                  className={region.code === regionCode ? "primary" : "ghost"}
                  onClick={() => {
                    setRegionCode(region.code);
                    setConnectionLabel(`Live API connected (${region.label})`);
                    setShowRegionPicker(false);
                  }}
                >
                  {region.code}
                </button>
              ))}
            </div>
          </section>
        ) : null}
        {actionNotice ? (
          <section className={`submission-banner ${actionNotice.type}`}>
            <strong>{actionNotice.type === "success" ? "Submission Success" : "Submission Failed"}</strong>
            <p>{actionNotice.text}</p>
          </section>
        ) : null}
        <div className={pageAnimating ? "page-stage enter" : "page-stage"}>{renderPage()}</div>
      </main>
    </div>
  );
}
