import http from "http";

function post(path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: "localhost",
      port: 8080,
      path,
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers }
    };
    const req = http.request(opts, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(data || "{}") }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    http.get("http://localhost:8080" + path, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => resolve(JSON.parse(data || "{}")));
    }).on("error", reject);
  });
}

async function run() {
  const phone = "6" + String(Date.now()).slice(-9);

  const { body: created } = await post(
    "/api/v1/emergency/requests",
    JSON.stringify({
      callerName: "SSE E2E",
      callerPhone: phone,
      patientName: "SSE Patient E2E",
      patientAge: 32,
      patientGender: "male",
      emergencyType: "minor_injury",
      symptoms: ["small cut", "pain"],
      requestedResources: ["ambulance", "first_aid"],
      location: { latitude: 22.7196, longitude: 75.8577, address: "Indore SSE Test" }
    })
  );

  console.log("Created:", created.id, "Status:", created.status);

  // Open SSE stream
  const sseEvents = [];
  const sseUrl = `http://localhost:8080/api/v1/events/stream?requestIds=${created.id}`;
  const sseReq = http.get(sseUrl, (res) => {
    res.setEncoding("utf8");
    let buf = "";
    res.on("data", (chunk) => {
      buf += chunk;
      const lines = buf.split("\n");
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const data = JSON.parse(line.slice(6));
          if (data.type === "heartbeat") continue;
          sseEvents.push(data);
          console.log("  SSE >>", data.type, data.payload?.status || "", data.payload?.assignedHospitalName || "");
        } catch {}
      }
    });
  });

  await new Promise((r) => setTimeout(r, 500));

  // Login as PalasiaCare (often in the wave for Indore 22.71x requests)
  const { body: loginResp } = await post(
    "/api/v1/auth/login",
    JSON.stringify({ email: "palasiacare@gmail.com", password: "Palasia@123", role: "hospital_admin_staff" })
  );
  console.log("Logged in as PalasiaCare, token obtained");

  // Wait for pending_hospital_response, then accept
  let accepted = false;
  for (let i = 0; i < 20; i++) {
    const req = await get("/api/v1/emergency/requests/" + created.id);
    if (req.status === "pending_hospital_response") {
      console.log("Status is pending_hospital_response — accepting now...");
      const { body: resp, status } = await post(
        `/api/v1/hospital/requests/${created.id}/respond`,
        JSON.stringify({ action: "accept" }),
        { Authorization: "Bearer " + loginResp.accessToken }
      );
      if (status < 300) {
        console.log("Accepted! Hospital:", resp.assignedHospitalName);
        accepted = true;
        break;
      } else {
        console.log("Accept returned", status, JSON.stringify(resp).slice(0, 150));
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  if (!accepted) {
    console.log("Could not accept within timeout");
  }

  // Wait for SSE events to propagate
  await new Promise((r) => setTimeout(r, 2000));
  sseReq.destroy();

  console.log("\n=== SSE Summary ===");
  console.log("Total events:", sseEvents.length);
  for (const e of sseEvents) {
    console.log(`  ${e.type} | status=${e.payload?.status || "-"} | hospital=${e.payload?.assignedHospitalName || "-"}`);
  }

  const acceptEvt = sseEvents.find((e) => e.payload?.status === "accepted");
  if (acceptEvt) {
    console.log("\n*** SUCCESS: 'accepted' event delivered via SSE! ***");
    console.log("  Hospital:", acceptEvt.payload.assignedHospitalName);
    console.log("  Doctor:", acceptEvt.payload.assignedDoctorName);
    console.log("  Ambulance:", acceptEvt.payload.assignedAmbulanceVehicleNumber);
  } else {
    console.log("\nNo 'accepted' event found on SSE stream.");
  }

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
