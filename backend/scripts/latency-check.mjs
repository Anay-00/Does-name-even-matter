/* eslint-disable no-console */

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:8080/api/v1";
const benchmarkEmergencyType = process.env.LATENCY_EMERGENCY_TYPE || "cardiac_arrest";

const resourceByEmergencyType = {
  cardiac_arrest: ["ambulance", "icu_bed", "emergency_doctor"],
  stroke_alert: ["ambulance", "icu_bed", "emergency_doctor"],
  trauma_injury: ["ambulance", "normal_bed", "emergency_doctor"],
  respiratory_distress: ["ambulance", "normal_bed", "emergency_doctor"],
  fever_illness: ["ambulance", "normal_bed"],
  minor_injury: ["ambulance", "normal_bed"]
};

const hospitalCredentialsByCode = {
  "IND-AITR-01": { email: "aitricare@gmail.com", password: "Aitri@123", role: "hospital_admin_staff" },
  "IND-ACRO-02": { email: "acrolife@gmail.com", password: "Acro@123", role: "hospital_admin_staff" },
  "IND-VIJAY-03": { email: "vijaycare@gmail.com", password: "Vijay@123", role: "hospital_admin_staff" },
  "IND-PALASIA-04": { email: "palasiacare@gmail.com", password: "Palasia@123", role: "hospital_admin_staff" },
  "IND-BHAWAR-05": { email: "bhawarlife@gmail.com", password: "Bhawar@123", role: "hospital_admin_staff" }
};

async function request(path, { method = "GET", token, body } = {}) {
  const started = Date.now();
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  return {
    ok: response.ok,
    status: response.status,
    payload,
    durationMs: Date.now() - started
  };
}

function median(numbers) {
  if (numbers.length === 0) {
    return 0;
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[middle - 1] + sorted[middle]) / 2)
    : sorted[middle];
}

async function runOne(iteration) {
  const flowStart = Date.now();

  const create = await request("/emergency/requests", {
    method: "POST",
    body: {
      callerName: `Latency Runner ${iteration}`,
      callerPhone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      patientName: `Latency Runner ${iteration}`,
      patientAge: 31,
      patientGender: "male",
      emergencyType: benchmarkEmergencyType,
      symptoms: [benchmarkEmergencyType, "critical"],
      requestedResources: resourceByEmergencyType[benchmarkEmergencyType] || ["ambulance", "normal_bed"],
      location: {
        latitude: 22.824,
        longitude: 75.943,
        address: "AITR, Indore",
        landmark: "Latency"
      },
      requestedForSelf: true
    }
  });

  if (!create.ok || !create.payload?.id) {
    throw new Error(`Create failed: ${create.payload?.error?.message || create.status}`);
  }

  const requestId = create.payload.id;

  const pendingSearchStart = Date.now();
  let pendingHospitalId = null;
  while (Date.now() - pendingSearchStart <= 25000) {
    const details = await request(`/emergency/requests/${requestId}`);
    const pendingAttempt = (details.payload?.attempts || []).find((item) => item.status === "pending");
    if (pendingAttempt?.hospitalId) {
      pendingHospitalId = pendingAttempt.hospitalId;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!pendingHospitalId) {
    throw new Error(`Pending offer not found for ${requestId}`);
  }

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: { email: "admin@medisync.com", password: "admin123", role: "admin" }
  });

  const overview = await request("/admin/overview", { token: adminLogin.payload?.accessToken });
  const assignedHospital = (overview.payload?.hospitals || []).find((item) => item.id === pendingHospitalId);
  const credentials = hospitalCredentialsByCode[assignedHospital?.code || ""];
  if (!credentials) {
    throw new Error(`Credentials missing for assigned hospital ${assignedHospital?.code || "unknown"}`);
  }

  const hospitalLogin = await request("/auth/login", {
    method: "POST",
    body: credentials
  });

  const accept = await request(`/hospital/requests/${requestId}/respond`, {
    method: "POST",
    token: hospitalLogin.payload?.accessToken,
    body: { action: "accept" }
  });

  if (!accept.ok) {
    throw new Error(`Accept failed: ${accept.payload?.error?.message || accept.status}`);
  }

  const userVisibilityStart = Date.now();
  let userVisibleMs = null;
  while (Date.now() - userVisibilityStart <= 20000) {
    const details = await request(`/emergency/requests/${requestId}`);
    if (details.payload?.status === "accepted" && details.payload?.assignedHospitalId) {
      userVisibleMs = Date.now() - userVisibilityStart;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return {
    requestId,
    assignedHospitalCode: assignedHospital?.code || null,
    createMs: create.durationMs,
    pendingVisibleMs: Date.now() - pendingSearchStart,
    acceptApiMs: accept.durationMs,
    userAcceptedVisibleMs: userVisibleMs,
    totalMs: Date.now() - flowStart
  };
}

async function run() {
  const runs = [];
  const count = Number(process.env.LATENCY_RUNS || 3);

  for (let i = 1; i <= count; i += 1) {
    const result = await runOne(i);
    runs.push(result);
    console.log(`Run ${i}:`, JSON.stringify(result));
  }

  const totals = runs.map((item) => item.totalMs);
  const accepts = runs.map((item) => item.acceptApiMs);
  const pendingVisible = runs.map((item) => item.pendingVisibleMs);

  console.log(
    JSON.stringify(
      {
        runs,
        summary: {
          targetMs: 20000,
          emergencyType: benchmarkEmergencyType,
          maxTotalMs: Math.max(...totals),
          avgTotalMs: Math.round(totals.reduce((sum, value) => sum + value, 0) / totals.length),
          medianTotalMs: median(totals),
          maxAcceptApiMs: Math.max(...accepts),
          avgAcceptApiMs: Math.round(accepts.reduce((sum, value) => sum + value, 0) / accepts.length),
          avgPendingVisibleMs: Math.round(pendingVisible.reduce((sum, value) => sum + value, 0) / pendingVisible.length)
        }
      },
      null,
      2
    )
  );
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
