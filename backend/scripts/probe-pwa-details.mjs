/* eslint-disable no-console */

const base = process.env.SMOKE_BASE_URL || "http://localhost:8080/api/v1";

async function req(path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, payload };
}

const credsByCode = {
  "IND-AITR-01": { email: "aitricare@gmail.com", password: "Aitri@123", role: "hospital_admin_staff" },
  "IND-AURO-02": { email: "aurobindo@gmail.com", password: "Auro@123", role: "hospital_admin_staff" },
  "IND-VIJAY-03": { email: "vijaycare@gmail.com", password: "Vijay@123", role: "hospital_admin_staff" },
  "IND-PALASIA-04": { email: "palasiacare@gmail.com", password: "Palasia@123", role: "hospital_admin_staff" },
  "IND-BHAWAR-05": { email: "bhawarlife@gmail.com", password: "Bhawar@123", role: "hospital_admin_staff" }
};

async function run() {
  const create = await req("/emergency/requests", {
    method: "POST",
    body: {
      callerName: "PWA Probe",
      callerPhone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      patientName: "PWA Probe",
      patientAge: 32,
      patientGender: "male",
      emergencyType: "minor_injury",
      symptoms: ["minor_injury"],
      requestedResources: ["ambulance", "normal_bed"],
      location: {
        latitude: 22.824,
        longitude: 75.943,
        address: "AITR, Indore",
        landmark: "PWA"
      },
      requestedForSelf: true
    }
  });

  if (!create.ok) {
    throw new Error(`Create failed: ${create.status} ${JSON.stringify(create.payload)}`);
  }

  const requestId = create.payload.id;

  let pendingHospitalId = null;
  const start = Date.now();
  while (Date.now() - start < 30000) {
    const details = await req(`/emergency/requests/${requestId}`);
    const pending = (details.payload?.attempts || []).find((item) => item.status === "pending");
    if (pending?.hospitalId) {
      pendingHospitalId = pending.hospitalId;
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (!pendingHospitalId) {
    throw new Error(`No pending hospital found for ${requestId}`);
  }

  const adminLogin = await req("/auth/login", {
    method: "POST",
    body: { email: "admin@medisync.com", password: "admin123", role: "admin" }
  });

  const overview = await req("/admin/overview", { token: adminLogin.payload.accessToken });
  const assignedHospital = (overview.payload?.hospitals || []).find((item) => item.id === pendingHospitalId);
  const credentials = credsByCode[assignedHospital?.code || ""];

  const hospitalLogin = await req("/auth/login", {
    method: "POST",
    body: credentials
  });

  const accept = await req(`/hospital/requests/${requestId}/respond`, {
    method: "POST",
    token: hospitalLogin.payload.accessToken,
    body: { action: "accept" }
  });

  const final = await req(`/emergency/requests/${requestId}`);

  console.log(
    JSON.stringify(
      {
        requestId,
        acceptPayload: accept.payload,
        finalStatusPayload: {
          id: final.payload?.id,
          status: final.payload?.status,
          assignedHospitalId: final.payload?.assignedHospitalId,
          assignedHospitalName: final.payload?.assignedHospitalName,
          assignedDoctorName: final.payload?.assignedDoctorName,
          assignedAmbulanceId: final.payload?.assignedAmbulanceId,
          assignedAmbulanceVehicleNumber: final.payload?.assignedAmbulanceVehicleNumber,
          assignedAmbulanceMobileNumber: final.payload?.assignedAmbulanceMobileNumber,
          assignedRoomNumber: final.payload?.assignedRoomNumber
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
