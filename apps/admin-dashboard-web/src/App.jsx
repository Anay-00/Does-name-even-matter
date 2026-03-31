import { useEffect, useMemo, useState } from "react";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function authLogin(credentials) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Admin login failed");
  }
  return payload;
}

async function authGet(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await parseJsonSafe(response);
  if (!response.ok) {
    throw new Error(payload?.error?.message || `GET ${path} failed`);
  }
  return payload;
}

async function authSend(path, method, token, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
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

const menuGroups = [
  { title: "Dashboard", items: ["Executive Overview", "Emergency Governance", "Operational KPIs"] },
  { title: "Doctors", items: ["All Doctors", "Add Doctor", "Shift Management"] },
  { title: "Room Allotment", items: ["Allotted Rooms", "New Allotment", "Occupancy Analytics"] },
  { title: "Settings", items: ["Billing & Payment", "General", "Roles"] },
  { title: "Network Control", items: ["City Network", "Hospital Onboarding", "Provider Onboarding", "Ambulance Fleet"] },
  { title: "Reports & Analytics", items: ["Revenue Reports", "Department Reports", "Case Outcomes"] }
];

function DataTable({ columns, rows, emptyText }) {
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

function ExecutiveOverview({ snapshot, recentRequests, errorMessage, isLoading }) {
  const counters = snapshot?.counters || {};
  return (
    <>
      <section className="kpi-grid">
        <article className="kpi-card purple"><h3>Total Cases</h3><p>{counters.total ?? 0}</p><small>System scope</small></article>
        <article className="kpi-card blue"><h3>Pending Response</h3><p>{counters.pending_hospital_response ?? 0}</p><small>Needs hospital action</small></article>
        <article className="kpi-card green"><h3>Accepted</h3><p>{counters.accepted ?? 0}</p><small>Routed successfully</small></article>
        <article className="kpi-card orange"><h3>Failed / Cancelled</h3><p>{(counters.failed_no_match ?? 0) + (counters.cancelled ?? 0)}</p><small>Escalation cases</small></article>
      </section>

      <section className="panel-grid three">
        <article className="panel mini">
          <h3>Route Quality</h3>
          <div className="donut" />
        </article>
        <article className="panel mini">
          <h3>Daily Throughput</h3>
          <div className="bars">
            <span style={{ height: "62%" }} />
            <span style={{ height: "74%" }} />
            <span style={{ height: "81%" }} />
            <span style={{ height: "58%" }} />
          </div>
        </article>
        <article className="panel mini">
          <h3>Case Mix</h3>
          <div className="pie" />
        </article>
      </section>

      <section className="panel">
        <header>
          <h3>Recent Emergency Requests</h3>
          <span>{snapshot?.generatedAt ? new Date(snapshot.generatedAt).toLocaleString() : "Realtime feed"}</span>
        </header>
        {isLoading ? <p className="muted-text">Refreshing command center data...</p> : null}
        {errorMessage ? <p className="muted-text">{errorMessage}</p> : null}
        <DataTable
          columns={["Request", "Patient", "Type", "Status", "Assigned Hospital"]}
          rows={recentRequests.map((item) => [
            item.id,
            item.patientName || item.callerName || "Unknown",
            item.emergencyType || "general",
            item.status,
            item.assignedHospitalName || "Unassigned"
          ])}
          emptyText="No requests available."
        />
      </section>
    </>
  );
}

function EmergencyGovernance({ recentRequests, onRetry }) {
  const retryable = recentRequests.filter((item) => ["failed_no_match", "rejected_retrying"].includes(item.status));
  return (
    <section className="panel">
      <header>
        <h3>Emergency Governance</h3>
        <span>Intervene and retry allocations</span>
      </header>
      <DataTable
        columns={["Request", "Patient", "Status", "Action"]}
        rows={retryable.map((item) => [item.id, item.patientName || item.callerName || "Unknown", item.status, "Retry"])}
        emptyText="No requests currently require retry governance."
      />
      <div className="cards">
        {retryable.slice(0, 6).map((item) => (
          <div key={item.id}>
            <strong>{item.id}</strong>
            <p>{item.patientName || item.callerName || "Unknown"} | {item.status}</p>
            <div className="actions-row left">
              <button className="primary" onClick={() => onRetry(item.id)}>Retry Allocation</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OperationalKPIs({ doctors, roomAllotments, billingSnapshot }) {
  const totalRevenueServices = (billingSnapshot?.services || []).reduce((sum, s) => sum + Number(s.amount || 0), 0);
  return (
    <section className="panel">
      <header>
        <h3>Operational KPIs</h3>
        <span>Cross-functional execution metrics</span>
      </header>
      <section className="kpi-grid">
        <article className="kpi-card blue"><h3>Doctors Registered</h3><p>{doctors.length}</p><small>Credentialed resources</small></article>
        <article className="kpi-card green"><h3>Active Admissions</h3><p>{roomAllotments.length}</p><small>Room allocations</small></article>
        <article className="kpi-card orange"><h3>Configured Services</h3><p>{billingSnapshot?.services?.length || 0}</p><small>Billable catalog</small></article>
        <article className="kpi-card purple"><h3>Catalog Value</h3><p>${totalRevenueServices}</p><small>Billing baseline</small></article>
      </section>
    </section>
  );
}

function AllDoctors({ doctors }) {
  return (
    <section className="panel">
      <header>
        <h3>All Doctors</h3>
        <span>Administrative roster control</span>
      </header>
      <DataTable
        columns={["Name", "Department", "Specialization", "Mobile", "Email"]}
        rows={doctors.map((d) => [
          `${d.firstName || ""} ${d.lastName || ""}`.trim(),
          d.department || "General",
          d.specialization || "General Medicine",
          d.mobile || "-",
          d.email || "-"
        ])}
        emptyText="No doctors registered in the system."
      />
    </section>
  );
}

function AddDoctor({ onSubmit, actionMessage }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Add Doctor</h3>
        <span>Create credentialed doctor profile</span>
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
          <input name="dateOfBirth" placeholder="Date Of Birth*" required />
          <input name="bloodGroup" placeholder="Blood Group" />
        </div>
        <div className="form-grid three-col">
          <input name="email" placeholder="Email*" required />
          <input name="mobile" placeholder="Mobile*" required />
          <input name="alternateContact" placeholder="Alternate Contact" />
        </div>
        <div className="form-grid three-col">
          <input name="department" placeholder="Department*" required />
          <input name="specialization" placeholder="Specialization*" required />
          <input name="address" placeholder="Address" />
        </div>
        <div className="actions-row">
          <button type="reset" className="ghost">Clear</button>
          <button type="submit" className="primary">Save Doctor</button>
        </div>
      </form>
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </section>
  );
}

function ShiftManagement({ shifts, onAddShift }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Shift Management</h3>
        <span>Hospital-wide rota planning</span>
      </header>
      <form className="inline-form" onSubmit={onAddShift}>
        <input name="name" placeholder="Doctor Name*" required />
        <input name="department" placeholder="Department*" required />
        <input name="window" placeholder="Shift Window*" required />
        <button type="submit" className="primary">Add Shift</button>
      </form>
      <DataTable
        columns={["Doctor", "Department", "Shift", "Status"]}
        rows={shifts.map((item) => [item.name, item.department, item.window, item.status])}
        emptyText="No shifts defined."
      />
    </section>
  );
}

function AllottedRooms({ roomAllotments }) {
  return (
    <section className="panel">
      <header>
        <h3>Allotted Rooms</h3>
        <span>Inpatient assignment register</span>
      </header>
      <DataTable
        columns={["Room", "Patient", "Patient ID", "Status", "Allotted At"]}
        rows={roomAllotments.map((r) => [
          r.roomNumber || "Auto",
          r.patientName,
          r.patientId,
          r.status || "admitted",
          r.allottedAt ? new Date(r.allottedAt).toLocaleString() : "-"
        ])}
        emptyText="No room allotments available."
      />
    </section>
  );
}

function NewAllotment({ onSubmit, actionMessage }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>New Allotment</h3>
        <span>Create patient room assignment</span>
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
          <input name="roomNumber" placeholder="Room Number" />
          <input name="medicalHistory" placeholder="Medical History" />
          <input name="allergies" placeholder="Allergies" />
        </div>
        <div className="actions-row">
          <button type="reset" className="ghost">Clear</button>
          <button type="submit" className="primary">Assign Room</button>
        </div>
      </form>
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </section>
  );
}

function OccupancyAnalytics({ roomAllotments }) {
  const occupied = roomAllotments.length;
  const capacity = Math.max(occupied + 18, 40);
  const utilization = Math.round((occupied / capacity) * 100);
  return (
    <section className="panel">
      <header>
        <h3>Occupancy Analytics</h3>
        <span>Administrative capacity planning</span>
      </header>
      <section className="kpi-grid">
        <article className="kpi-card blue"><h3>Total Capacity</h3><p>{capacity}</p><small>Configured beds</small></article>
        <article className="kpi-card green"><h3>Occupied</h3><p>{occupied}</p><small>Current admissions</small></article>
        <article className="kpi-card orange"><h3>Available</h3><p>{capacity - occupied}</p><small>Ready for intake</small></article>
        <article className="kpi-card purple"><h3>Utilization</h3><p>{utilization}%</p><small>Network-wide</small></article>
      </section>
    </section>
  );
}

function BillingAndPayment({ billingSnapshot, onAddService, onUpdateTax, actionMessage }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Billing & Payment</h3>
        <span>Service catalog and tax control</span>
      </header>
      <form className="inline-form" onSubmit={onAddService}>
        <input name="serviceName" placeholder="Service Name*" required />
        <input name="amount" type="number" step="0.01" placeholder="Amount*" required />
        <button type="submit" className="primary">Add Service</button>
      </form>
      <DataTable
        columns={["Service", "Amount"]}
        rows={(billingSnapshot?.services || []).map((service) => [service.serviceName, `$${service.amount}`])}
        emptyText="No billing services configured."
      />
      <form className="inline-form" onSubmit={onUpdateTax}>
        <input name="taxPercentage" type="number" step="0.1" defaultValue={billingSnapshot?.taxPercentage ?? 5} required />
        <button type="submit" className="ghost">Update Tax</button>
      </form>
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </section>
  );
}

function GeneralSettings() {
  return (
    <section className="panel">
      <header>
        <h3>General Settings</h3>
        <span>System-wide operational controls</span>
      </header>
      <div className="cards">
        <div><strong>Hospital network profile</strong><p>Manage identity and location metadata.</p></div>
        <div><strong>Notification policies</strong><p>Configure SLA alerts and escalation channels.</p></div>
        <div><strong>Command center windows</strong><p>Set staffing windows and monitoring thresholds.</p></div>
      </div>
    </section>
  );
}

function RolesSettings() {
  return (
    <section className="panel">
      <header>
        <h3>Roles</h3>
        <span>Access and governance matrix</span>
      </header>
      <DataTable
        columns={["Role", "Scope", "Privileges"]}
        rows={[
          ["super_admin", "Global", "Full control"],
          ["admin", "Network", "Governance + reporting"],
          ["hospital_admin_staff", "Hospital", "Operational management"],
          ["doctor", "Hospital", "Clinical response + case access"]
        ]}
        emptyText="No roles defined."
      />
    </section>
  );
}

function RevenueReports({ billingSnapshot }) {
  const total = (billingSnapshot?.services || []).reduce((sum, s) => sum + Number(s.amount || 0), 0);
  return (
    <section className="panel">
      <header>
        <h3>Revenue Reports</h3>
        <span>Financial analytics baseline</span>
      </header>
      <section className="kpi-grid">
        <article className="kpi-card green"><h3>Configured Services</h3><p>{billingSnapshot?.services?.length || 0}</p><small>Revenue lines</small></article>
        <article className="kpi-card blue"><h3>Catalog Value</h3><p>${total}</p><small>Base service total</small></article>
        <article className="kpi-card orange"><h3>Tax Rate</h3><p>{billingSnapshot?.taxPercentage ?? 0}%</p><small>Current setting</small></article>
        <article className="kpi-card purple"><h3>Projection</h3><p>${Math.round(total * 1.35)}</p><small>Period estimate</small></article>
      </section>
    </section>
  );
}

function DepartmentReports({ doctors }) {
  const grouped = doctors.reduce((acc, d) => {
    const key = d.department || "General";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  return (
    <section className="panel">
      <header>
        <h3>Department Reports</h3>
        <span>Staffing distribution</span>
      </header>
      <DataTable
        columns={["Department", "Doctor Count"]}
        rows={Object.entries(grouped).map(([dep, count]) => [dep, String(count)])}
        emptyText="No department data available."
      />
    </section>
  );
}

function CaseOutcomes({ snapshot }) {
  const counters = snapshot?.counters || {};
  return (
    <section className="panel">
      <header>
        <h3>Case Outcomes</h3>
        <span>Allocation and closure analysis</span>
      </header>
      <DataTable
        columns={["Outcome", "Count"]}
        rows={[
          ["Accepted", String(counters.accepted ?? 0)],
          ["Completed", String(counters.completed ?? 0)],
          ["Rejected retrying", String(counters.rejected_retrying ?? 0)],
          ["Failed no match", String(counters.failed_no_match ?? 0)],
          ["Cancelled", String(counters.cancelled ?? 0)]
        ]}
        emptyText="No outcome data available."
      />
    </section>
  );
}

function CityNetwork({ overview }) {
  const totals = overview?.totals || {};
  return (
    <section className="panel">
      <header>
        <h3>City Network</h3>
        <span>Admin network topology</span>
      </header>
      <section className="kpi-grid">
        <article className="kpi-card blue"><h3>Total Hospitals</h3><p>{totals.hospitals ?? 0}</p><small>Registered nodes</small></article>
        <article className="kpi-card green"><h3>Active Hospitals</h3><p>{totals.activeHospitals ?? 0}</p><small>Approved and live</small></article>
        <article className="kpi-card orange"><h3>Providers</h3><p>{totals.providers ?? 0}</p><small>Ambulance providers</small></article>
        <article className="kpi-card purple"><h3>Fleet</h3><p>{totals.ambulances ?? 0}</p><small>Total ambulances</small></article>
      </section>
      <DataTable
        columns={["Hospital", "Code", "Status", "Resources"]}
        rows={(overview?.hospitals || []).map((item) => [
          item.name,
          item.code,
          item.isActive ? "active" : "pending_approval",
          Object.keys(item.resources || {}).length.toString()
        ])}
        emptyText="No hospitals available in city network."
      />
    </section>
  );
}

function HospitalOnboarding({ overview, onCreate, onApprove, actionMessage }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Hospital Onboarding</h3>
        <span>Create and approve hospitals</span>
      </header>
      <form onSubmit={onCreate}>
        <div className="form-grid three-col">
          <input name="city" placeholder="City*" defaultValue="Indore" required />
          <input name="code" placeholder="Hospital Code*" required />
          <input name="name" placeholder="Hospital Name*" required />
          <input name="address" placeholder="Address*" required />
          <input name="landmark" placeholder="Landmark" />
          <input name="latitude" type="number" step="0.000001" placeholder="Latitude*" required />
          <input name="longitude" type="number" step="0.000001" placeholder="Longitude*" required />
        </div>
        <div className="actions-row">
          <button type="submit" className="primary">Onboard Hospital</button>
        </div>
      </form>
      <div className="cards">
        {(overview?.hospitals || []).map((item) => (
          <div key={item.id}>
            <strong>{item.name}</strong>
            <p>{item.code} | {item.isActive ? "active" : "pending_approval"}</p>
            {!item.isActive ? (
              <div className="actions-row left">
                <button className="primary" onClick={() => onApprove(item.id)}>Approve Hospital</button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </section>
  );
}

function ProviderOnboarding({ providers, onCreate, actionMessage }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Provider Onboarding</h3>
        <span>Register ambulance provider partners</span>
      </header>
      <form className="inline-form" onSubmit={onCreate}>
        <input name="city" placeholder="City*" defaultValue="Indore" required />
        <input name="name" placeholder="Provider Name*" required />
        <button type="submit" className="primary">Create Provider</button>
      </form>
      <DataTable
        columns={["Provider", "Status", "Created"]}
        rows={(providers || []).map((item) => [item.name, item.isActive ? "active" : "inactive", new Date(item.createdAt).toLocaleString()])}
        emptyText="No ambulance providers onboarded."
      />
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </section>
  );
}

function AmbulanceFleet({ fleet, pendingRequests, providers, hospitals, onRegister, onDispatch, onLocation, actionMessage }) {
  return (
    <section className="panel form-panel">
      <header>
        <h3>Ambulance Fleet</h3>
        <span>Registration, location updates, and dispatch</span>
      </header>

      <form onSubmit={onRegister}>
        <div className="form-grid three-col">
          <input name="city" defaultValue="Indore" placeholder="City*" required />
          <select name="ownerType" defaultValue="hospital" required>
            <option value="hospital">Hospital</option>
            <option value="provider">Provider</option>
          </select>
          <input name="vehicleNumber" placeholder="Vehicle Number*" required />
          <input name="ambulanceType" placeholder="Ambulance Type*" required />
          <select name="hospitalId" defaultValue="">
            <option value="">Hospital Owner (optional)</option>
            {(hospitals || []).map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
          <select name="providerId" defaultValue="">
            <option value="">Provider Owner (optional)</option>
            {(providers || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <input name="latitude" type="number" step="0.000001" placeholder="Latitude*" required />
          <input name="longitude" type="number" step="0.000001" placeholder="Longitude*" required />
        </div>
        <div className="actions-row">
          <button type="submit" className="primary">Register Ambulance</button>
        </div>
      </form>

      <DataTable
        columns={["Vehicle", "Owner", "Status", "Latitude", "Longitude", "Actions"]}
        rows={(fleet || []).map((item) => [
          item.vehicleNumber,
          item.ownerType,
          item.tripStatus,
          String(item.latitude),
          String(item.longitude),
          "Manage"
        ])}
        emptyText="No ambulances in fleet."
      />

      <div className="cards">
        {(fleet || []).slice(0, 10).map((item) => (
          <div key={item.id}>
            <strong>{item.vehicleNumber}</strong>
            <p>{item.ownerType} | {item.tripStatus}</p>
            <form className="inline-form" onSubmit={(event) => onLocation(event, item.id)}>
              <input name="latitude" type="number" step="0.000001" defaultValue={item.latitude} required />
              <input name="longitude" type="number" step="0.000001" defaultValue={item.longitude} required />
              <button type="submit" className="ghost">Update GPS</button>
            </form>
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
      {actionMessage ? <p className="muted-text">{actionMessage}</p> : null}
    </section>
  );
}

export default function App() {
  const [activeMain, setActiveMain] = useState("Dashboard");
  const [activeSub, setActiveSub] = useState("Executive Overview");
  const [accessToken, setAccessToken] = useState("");

  const [snapshot, setSnapshot] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [networkOverview, setNetworkOverview] = useState(null);
  const [ambulanceFleet, setAmbulanceFleet] = useState([]);
  const [providers, setProviders] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [roomAllotments, setRoomAllotments] = useState([]);
  const [billingSnapshot, setBillingSnapshot] = useState({ taxPercentage: 5, services: [] });
  const [shifts, setShifts] = useState([
    { name: "Dr. Emily Jones", department: "Orthopedics", window: "10:00 AM - 4:00 PM", status: "Active" },
    { name: "Dr. Alan Brown", department: "Neurology", window: "8:00 AM - 3:00 PM", status: "Active" }
  ]);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [connectionLabel, setConnectionLabel] = useState("Offline sample mode");
  const [authError, setAuthError] = useState("");
  const [authForm, setAuthForm] = useState({
    email: "admin@medisync.com",
    password: "admin123",
    role: "admin"
  });

  const pageTitle = useMemo(() => activeSub, [activeSub]);

  async function refreshAllData(token) {
    const [commandCenter, requestsPayload, overviewPayload, providersPayload, fleetPayload, doctorPayload, roomPayload, billingPayload] = await Promise.all([
      authGet("/hospital/command-center", token),
      authGet("/hospital/requests?limit=50", token),
      authGet("/admin/overview", token),
      authGet("/admin/ambulance-providers", token),
      authGet("/ambulance/fleet", token),
      authGet("/operations/doctors", token),
      authGet("/operations/room-allotments", token),
      authGet("/operations/billing", token)
    ]);

    setSnapshot(commandCenter);
    setRecentRequests(requestsPayload?.items || []);
    setNetworkOverview(overviewPayload || null);
    setProviders(providersPayload?.items || []);
    setAmbulanceFleet(fleetPayload?.items || []);
    setDoctors(doctorPayload?.items || []);
    setRoomAllotments(roomPayload?.items || []);
    setBillingSnapshot(billingPayload || { taxPercentage: 5, services: [] });
  }

  useEffect(() => {
    if (!accessToken) {
      return undefined;
    }

    let mounted = true;

    async function refresh() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        await refreshAllData(accessToken);

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

    refresh();
    const timer = setInterval(refresh, 30000);
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
      const login = await authLogin(authForm);
      setAccessToken(login.accessToken);
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
    setSnapshot(null);
    setRecentRequests([]);
    setNetworkOverview(null);
    setProviders([]);
    setAmbulanceFleet([]);
    setDoctors([]);
    setRoomAllotments([]);
    setBillingSnapshot({ taxPercentage: 5, services: [] });
    setConnectionLabel("Offline sample mode");
  }

  async function createDoctor(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!accessToken) {
      setActionMessage("Doctor creation requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(form);
      const created = await authSend("/operations/doctors", "POST", accessToken, {
        firstName: String(fd.get("firstName") || ""),
        middleName: String(fd.get("middleName") || ""),
        lastName: String(fd.get("lastName") || ""),
        gender: String(fd.get("gender") || "other"),
        dateOfBirth: String(fd.get("dateOfBirth") || ""),
        bloodGroup: String(fd.get("bloodGroup") || ""),
        email: String(fd.get("email") || ""),
        mobile: String(fd.get("mobile") || ""),
        alternateContact: String(fd.get("alternateContact") || ""),
        address: String(fd.get("address") || ""),
        department: String(fd.get("department") || "General"),
        specialization: String(fd.get("specialization") || "General Medicine")
      });
      setDoctors((prev) => [created, ...prev]);
      await refreshAllData(accessToken);
      setActionMessage("Doctor profile created.");
      form.reset();
    } catch (error) {
      setActionMessage(`Doctor save failed: ${error.message}`);
    }
  }

  async function createAllotment(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!accessToken) {
      setActionMessage("Room allotment requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(form);
      const created = await authSend("/operations/room-allotments", "POST", accessToken, {
        patientName: String(fd.get("patientName") || ""),
        patientId: String(fd.get("patientId") || ""),
        age: Number(fd.get("age") || 0),
        gender: String(fd.get("gender") || "other"),
        mobile: String(fd.get("mobile") || ""),
        emergencyContact: String(fd.get("emergencyContact") || ""),
        medicalHistory: String(fd.get("medicalHistory") || ""),
        allergies: String(fd.get("allergies") || ""),
        roomNumber: String(fd.get("roomNumber") || "Auto")
      });
      setRoomAllotments((prev) => [created, ...prev]);
      await refreshAllData(accessToken);
      setActionMessage("Room allotment created.");
      form.reset();
    } catch (error) {
      setActionMessage(`Room allotment failed: ${error.message}`);
    }
  }

  async function addBilling(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!accessToken) {
      setActionMessage("Billing changes require live backend connection.");
      return;
    }
    try {
      const fd = new FormData(form);
      const service = await authSend("/operations/billing/services", "POST", accessToken, {
        serviceName: String(fd.get("serviceName") || ""),
        amount: Number(fd.get("amount") || 0)
      });
      setBillingSnapshot((prev) => ({ ...prev, services: [service, ...(prev.services || [])] }));
      await refreshAllData(accessToken);
      setActionMessage("Billing service added.");
      form.reset();
    } catch (error) {
      setActionMessage(`Billing service failed: ${error.message}`);
    }
  }

  async function setTax(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionMessage("Billing changes require live backend connection.");
      return;
    }
    try {
      const fd = new FormData(event.currentTarget);
      const updated = await authSend("/operations/billing/tax", "PUT", accessToken, {
        taxPercentage: Number(fd.get("taxPercentage") || 0)
      });
      setBillingSnapshot((prev) => ({ ...prev, taxPercentage: updated.taxPercentage }));
      await refreshAllData(accessToken);
      setActionMessage("Tax settings updated.");
    } catch (error) {
      setActionMessage(`Tax update failed: ${error.message}`);
    }
  }

  async function retryAllocation(requestId) {
    if (!accessToken) {
      setActionMessage("Retry requires live backend connection.");
      return;
    }
    try {
      await authSend(`/hospital/requests/${requestId}/retry`, "POST", accessToken, { reason: "admin_review" });
      await refreshAllData(accessToken);
      setActionMessage(`Retry triggered for ${requestId}.`);
    } catch (error) {
      setActionMessage(`Retry failed: ${error.message}`);
    }
  }

  async function createHospital(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionMessage("Hospital onboarding requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(event.currentTarget);
      await authSend("/admin/hospitals", "POST", accessToken, {
        city: String(fd.get("city") || "Indore"),
        code: String(fd.get("code") || ""),
        name: String(fd.get("name") || ""),
        address: String(fd.get("address") || ""),
        landmark: String(fd.get("landmark") || ""),
        latitude: Number(fd.get("latitude") || 0),
        longitude: Number(fd.get("longitude") || 0)
      });
      await refreshAllData(accessToken);
      setActionMessage("Hospital onboarded and pending approval.");
    } catch (error) {
      setActionMessage(`Hospital onboarding failed: ${error.message}`);
    }
  }

  async function approveHospital(hospitalId) {
    if (!accessToken) {
      setActionMessage("Approval requires live backend connection.");
      return;
    }
    try {
      await authSend(`/admin/hospitals/${hospitalId}/approve`, "POST", accessToken, {});
      await refreshAllData(accessToken);
      setActionMessage("Hospital approved.");
    } catch (error) {
      setActionMessage(`Approval failed: ${error.message}`);
    }
  }

  async function createProvider(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionMessage("Provider onboarding requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(event.currentTarget);
      await authSend("/admin/ambulance-providers", "POST", accessToken, {
        city: String(fd.get("city") || "Indore"),
        name: String(fd.get("name") || "")
      });
      await refreshAllData(accessToken);
      setActionMessage("Provider onboarded successfully.");
      event.currentTarget.reset();
    } catch (error) {
      setActionMessage(`Provider onboarding failed: ${error.message}`);
    }
  }

  async function registerAmbulance(event) {
    event.preventDefault();
    if (!accessToken) {
      setActionMessage("Ambulance registration requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(event.currentTarget);
      await authSend("/ambulance/fleet", "POST", accessToken, {
        city: String(fd.get("city") || "Indore"),
        ownerType: String(fd.get("ownerType") || "hospital"),
        hospitalId: String(fd.get("hospitalId") || "") || undefined,
        providerId: String(fd.get("providerId") || "") || undefined,
        vehicleNumber: String(fd.get("vehicleNumber") || ""),
        ambulanceType: String(fd.get("ambulanceType") || "ALS"),
        latitude: Number(fd.get("latitude") || 0),
        longitude: Number(fd.get("longitude") || 0)
      });
      await refreshAllData(accessToken);
      setActionMessage("Ambulance registered.");
      event.currentTarget.reset();
    } catch (error) {
      setActionMessage(`Ambulance registration failed: ${error.message}`);
    }
  }

  async function updateAmbulanceLocation(event, ambulanceId) {
    event.preventDefault();
    if (!accessToken) {
      setActionMessage("GPS update requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(event.currentTarget);
      await authSend(`/ambulance/${ambulanceId}/location`, "PATCH", accessToken, {
        latitude: Number(fd.get("latitude") || 0),
        longitude: Number(fd.get("longitude") || 0)
      });
      await refreshAllData(accessToken);
      setActionMessage("Ambulance GPS updated.");
    } catch (error) {
      setActionMessage(`GPS update failed: ${error.message}`);
    }
  }

  async function dispatchAmbulance(event, ambulanceId) {
    event.preventDefault();
    if (!accessToken) {
      setActionMessage("Dispatch requires live backend connection.");
      return;
    }
    try {
      const fd = new FormData(event.currentTarget);
      await authSend(`/ambulance/${ambulanceId}/dispatch`, "POST", accessToken, {
        requestId: String(fd.get("requestId") || "") || undefined,
        patientLatitude: Number(fd.get("patientLatitude") || 0),
        patientLongitude: Number(fd.get("patientLongitude") || 0),
        patientPhone: String(fd.get("patientPhone") || "") || undefined
      });
      await refreshAllData(accessToken);
      setActionMessage("Ambulance dispatched.");
    } catch (error) {
      setActionMessage(`Dispatch failed: ${error.message}`);
    }
  }

  function addShift(event) {
    event.preventDefault();
    const fd = new FormData(event.currentTarget);
    setShifts((prev) => [
      {
        name: String(fd.get("name") || ""),
        department: String(fd.get("department") || ""),
        window: String(fd.get("window") || ""),
        status: "Active"
      },
      ...prev
    ]);
    event.currentTarget.reset();
    setActionMessage("Shift added.");
  }

  function renderPage() {
    const key = `${activeMain}:${activeSub}`;

    if (key === "Dashboard:Executive Overview") return <ExecutiveOverview snapshot={snapshot} recentRequests={recentRequests} isLoading={isLoading} errorMessage={errorMessage} />;
    if (key === "Dashboard:Emergency Governance") return <EmergencyGovernance recentRequests={recentRequests} onRetry={retryAllocation} />;
    if (key === "Dashboard:Operational KPIs") return <OperationalKPIs doctors={doctors} roomAllotments={roomAllotments} billingSnapshot={billingSnapshot} />;

    if (key === "Doctors:All Doctors") return <AllDoctors doctors={doctors} />;
    if (key === "Doctors:Add Doctor") return <AddDoctor onSubmit={createDoctor} actionMessage={actionMessage} />;
    if (key === "Doctors:Shift Management") return <ShiftManagement shifts={shifts} onAddShift={addShift} />;

    if (key === "Room Allotment:Allotted Rooms") return <AllottedRooms roomAllotments={roomAllotments} />;
    if (key === "Room Allotment:New Allotment") return <NewAllotment onSubmit={createAllotment} actionMessage={actionMessage} />;
    if (key === "Room Allotment:Occupancy Analytics") return <OccupancyAnalytics roomAllotments={roomAllotments} />;

    if (key === "Settings:Billing & Payment") return <BillingAndPayment billingSnapshot={billingSnapshot} onAddService={addBilling} onUpdateTax={setTax} actionMessage={actionMessage} />;
    if (key === "Settings:General") return <GeneralSettings />;
    if (key === "Settings:Roles") return <RolesSettings />;

    if (key === "Network Control:City Network") return <CityNetwork overview={networkOverview} />;
    if (key === "Network Control:Hospital Onboarding") return <HospitalOnboarding overview={networkOverview} onCreate={createHospital} onApprove={approveHospital} actionMessage={actionMessage} />;
    if (key === "Network Control:Provider Onboarding") return <ProviderOnboarding providers={providers} onCreate={createProvider} actionMessage={actionMessage} />;
    if (key === "Network Control:Ambulance Fleet") return <AmbulanceFleet fleet={ambulanceFleet} pendingRequests={recentRequests} providers={providers} hospitals={networkOverview?.hospitals || []} onRegister={registerAmbulance} onDispatch={dispatchAmbulance} onLocation={updateAmbulanceLocation} actionMessage={actionMessage} />;

    if (key === "Reports & Analytics:Revenue Reports") return <RevenueReports billingSnapshot={billingSnapshot} />;
    if (key === "Reports & Analytics:Department Reports") return <DepartmentReports doctors={doctors} />;
    if (key === "Reports & Analytics:Case Outcomes") return <CaseOutcomes snapshot={snapshot} />;

    return <ExecutiveOverview snapshot={snapshot} recentRequests={recentRequests} isLoading={isLoading} errorMessage={errorMessage} />;
  }

  if (!accessToken) {
    return (
      <div className="layout" style={{ minHeight: "100vh", alignItems: "center", justifyContent: "center" }}>
        <section className="panel form-panel" style={{ width: "min(540px, 92vw)" }}>
          <header>
            <h3>Admin Dashboard Login</h3>
            <span>Sign in with admin credentials</span>
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
                <option value="admin">admin</option>
                <option value="super_admin">super_admin</option>
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
    <div className="layout">
      <aside className="sidebar">
        <div className="logo">MediSync Admin</div>
        <div className="user-block">
          <div className="user-avatar">MA</div>
          <div>
            <h4>MediSync Administrator</h4>
            <p>Network Governance</p>
          </div>
        </div>
        <nav>
          {menuGroups.map((group) => {
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
        </nav>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1>{pageTitle}</h1>
            <p>{activeMain} / {activeSub}</p>
          </div>
          <div className="top-right">
            <span className="connect-badge">{connectionLabel}</span>
            <span className="notif">3</span>
            <div className="flag">IN</div>
            <strong>Admin Control</strong>
            <button className="ghost" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        {renderPage()}
      </main>
    </div>
  );
}
