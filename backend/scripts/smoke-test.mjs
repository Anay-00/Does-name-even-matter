/* eslint-disable no-console */

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:8080/api/v1";

const hospitalCredentialsByCode = {
  "IND-AITR-01": { email: "aitricare@gmail.com", password: "Aitri@123", role: "hospital_admin_staff" },
  "IND-ACRO-02": { email: "acrolife@gmail.com", password: "Acro@123", role: "hospital_admin_staff" },
  "IND-VIJAY-03": { email: "vijaycare@gmail.com", password: "Vijay@123", role: "hospital_admin_staff" },
  "IND-PALASIA-04": { email: "palasiacare@gmail.com", password: "Palasia@123", role: "hospital_admin_staff" },
  "IND-BHAWAR-05": { email: "bhawarlife@gmail.com", password: "Bhawar@123", role: "hospital_admin_staff" }
};

async function request(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.message || "Unknown request failure";
    throw new Error(`${method} ${path} failed: ${message}`);
  }

  return payload;
}

async function waitForPendingAttempt(requestId, maxMs = 25000) {
  const started = Date.now();
  let lastStatus = "unknown";
  while (Date.now() - started <= maxMs) {
    const details = await request(`/emergency/requests/${requestId}`);
    lastStatus = details?.status || "unknown";
    const pendingAttempt = (details?.attempts || []).find((item) => item.status === "pending");
    if (pendingAttempt?.hospitalId) {
      return { details, pendingAttempt };
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No pending hospital offer found for smoke request (last status: ${lastStatus})`);
}

async function run() {
  const health = await request("/health");
  if (!health.ok) {
    throw new Error("Health check failed");
  }

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: {
      email: "admin@medisync.com",
      password: "admin123",
      role: "admin"
    }
  });

  const adminToken = adminLogin.accessToken;
  const created = await request("/emergency/requests", {
    method: "POST",
    body: {
      callerName: "Smoke Runner",
      callerPhone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      patientName: "Smoke Runner",
      patientAge: 31,
      patientGender: "male",
      emergencyType: "cardiac_arrest",
      symptoms: ["cardiac_arrest", "critical"],
      requestedResources: ["ambulance", "icu_bed", "emergency_doctor"],
      location: {
        latitude: 22.824,
        longitude: 75.943,
        address: "AITR, Indore",
        landmark: "Smoke"
      },
      requestedForSelf: true
    }
  });

  const { pendingAttempt } = await waitForPendingAttempt(created.id);

  const overview = await request("/admin/overview", { token: adminToken });
  const assignedHospital = (overview?.hospitals || []).find((item) => item.id === pendingAttempt.hospitalId);
  if (!assignedHospital?.code) {
    throw new Error("Assigned hospital code not found in admin overview");
  }

  const hospitalCredentials = hospitalCredentialsByCode[assignedHospital.code];
  if (!hospitalCredentials) {
    throw new Error(`No credentials configured for ${assignedHospital.code}`);
  }

  const hospitalLogin = await request("/auth/login", {
    method: "POST",
    body: hospitalCredentials
  });

  const token = hospitalLogin.accessToken;

  const queue = await request("/hospital/requests?status=pending_hospital_response&limit=10", {
    token
  });

  const commandCenter = await request("/hospital/command-center", {
    token
  });

  const accepted = await request(`/hospital/requests/${created.id}/respond`, {
    method: "POST",
    token,
    body: {
      action: "accept"
    }
  });

  console.log(
    JSON.stringify(
      {
        requestId: created.id,
        assignedHospitalId: pendingAttempt.hospitalId,
        assignedHospitalCode: assignedHospital.code,
        queueCount: queue?.items?.length || 0,
        commandCenterTotal: commandCenter?.counters?.total || 0,
        finalStatus: accepted.status
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
