/* eslint-disable no-console */

const baseUrl = process.env.SMOKE_BASE_URL || "http://localhost:8080/api/v1";

const hospitalCredentialsByCode = {
  "IND-AITR-01": { email: "aitricare@gmail.com", password: "Aitri@123", role: "hospital_admin_staff" },
  "IND-AURO-02": { email: "aurobindo@gmail.com", password: "Auro@123", role: "hospital_admin_staff" },
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

  return {
    ok: response.ok,
    status: response.status,
    payload
  };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForPendingAttempt(requestId, maxMs = 25000) {
  const started = Date.now();
  while (Date.now() - started <= maxMs) {
    const details = await request(`/emergency/requests/${requestId}`);
    if (details.ok) {
      const pendingAttempt = (details.payload?.attempts || []).find((item) => item.status === "pending");
      if (pendingAttempt?.hospitalId) {
        return pendingAttempt;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error("No pending hospital offer found for regression request");
}

async function run() {
  const health = await request("/health");
  assert(health.ok && health.payload.ok, "Health check failed");

  const adminLogin = await request("/auth/login", {
    method: "POST",
    body: {
      email: "admin@medisync.com",
      password: "admin123",
      role: "admin"
    }
  });
  assert(adminLogin.ok && adminLogin.payload?.accessToken, "Admin login failed");
  const adminToken = adminLogin.payload.accessToken;

  const uniquePhone = `9${Math.floor(100000000 + Math.random() * 899999999)}`;
  const createBody = {
    callerName: "Regression Runner",
    callerPhone: uniquePhone,
    patientName: "Regression Runner",
    patientAge: 34,
    patientGender: "male",
    emergencyType: "cardiac_arrest",
    symptoms: ["cardiac_arrest", "critical"],
    requestedResources: ["ambulance", "icu_bed", "emergency_doctor"],
    location: {
      latitude: 22.824,
      longitude: 75.943,
      address: "AITR, Indore",
      landmark: "Regression"
    },
    requestedForSelf: true
  };

  const created = await request("/emergency/requests", {
    method: "POST",
    body: createBody
  });
  assert(created.ok && created.payload?.id, "Primary emergency request creation failed");

  const pendingAttempt = await waitForPendingAttempt(created.payload.id);

  const overview = await request("/admin/overview", { token: adminToken });
  assert(overview.ok, "Admin overview fetch failed");

  const assignedHospital = (overview.payload?.hospitals || []).find((item) => item.id === pendingAttempt.hospitalId);
  assert(assignedHospital?.code, "Assigned hospital code not found in admin overview");

  const hospitalCredentials = hospitalCredentialsByCode[assignedHospital.code];
  assert(Boolean(hospitalCredentials), `No credentials configured for ${assignedHospital.code}`);

  const hospitalLogin = await request("/auth/login", {
    method: "POST",
    body: hospitalCredentials
  });

  assert(hospitalLogin.ok && hospitalLogin.payload?.accessToken, "Hospital login failed");
  const token = hospitalLogin.payload.accessToken;

  const duplicate = await request("/emergency/requests", {
    method: "POST",
    body: createBody
  });
  assert(!duplicate.ok, "Duplicate emergency request should be rejected");
  assert(
    duplicate.status === 409 || duplicate.status === 400,
    `Duplicate request returned unexpected status: ${duplicate.status}`
  );

  const accepted = await request(`/hospital/requests/${created.payload.id}/respond`, {
    method: "POST",
    token,
    body: {
      action: "accept"
    }
  });
  assert(accepted.ok && accepted.payload?.status === "accepted", "Hospital accept action failed");

  const retryAfterAccept = await request(`/hospital/requests/${created.payload.id}/retry`, {
    method: "POST",
    token,
    body: {
      reason: "regression-check"
    }
  });
  assert(!retryAfterAccept.ok, "Retry should fail for accepted requests");
  assert(
    retryAfterAccept.status === 400 || retryAfterAccept.status === 409,
    `Retry after accept returned unexpected status: ${retryAfterAccept.status}`
  );

  const commandCenter = await request("/hospital/command-center", {
    token
  });
  assert(commandCenter.ok && commandCenter.payload?.counters, "Command-center snapshot fetch failed");

  console.log(
    JSON.stringify(
      {
        requestId: created.payload.id,
        assignedHospitalCode: assignedHospital.code,
        duplicateStatus: duplicate.status,
        retryAfterAcceptStatus: retryAfterAccept.status,
        commandCenterTotal: commandCenter.payload?.counters?.total ?? null,
        finalStatus: accepted.payload?.status
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
