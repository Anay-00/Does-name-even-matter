/* eslint-disable no-console */

const base = process.env.SMOKE_BASE_URL || "http://localhost:8080/api/v1";

async function req(path, options = {}) {
  const response = await fetch(`${base}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function run() {
  const login = await req("/auth/login", {
    method: "POST",
    body: {
      email: "aitricare@gmail.com",
      password: "Aitri@123",
      role: "hospital_admin_staff"
    }
  });

  if (!login.ok || !login.data?.accessToken) {
    throw new Error("AITR login failed");
  }

  const create = await req("/emergency/requests", {
    method: "POST",
    body: {
      callerName: "Fastlane Probe",
      callerPhone: `9${Math.floor(100000000 + Math.random() * 899999999)}`,
      patientName: "Fastlane Probe",
      patientAge: 30,
      patientGender: "male",
      emergencyType: "minor_injury",
      symptoms: ["minor_injury"],
      requestedResources: ["ambulance", "normal_bed"],
      location: {
        latitude: 22.824,
        longitude: 75.943,
        address: "AITR, Indore",
        landmark: "Probe"
      },
      requestedForSelf: true
    }
  });

  if (!create.ok || !create.data?.id) {
    throw new Error("Request create failed");
  }

  const fast = await req("/hospital/requests?limit=80&mode=fast", {
    token: login.data.accessToken
  });

  const items = fast.data?.items || [];
  const item = items.find((entry) => entry.id === create.data.id) || null;

  console.log(
    JSON.stringify(
      {
        requestId: create.data.id,
        visibleInFastLane: Boolean(item),
        visibleStatus: item?.status || null,
        totalVisible: items.length
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
