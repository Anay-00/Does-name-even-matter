import { supabaseAdmin } from "../src/config/supabase.js";

const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const req = await supabaseAdmin
  .from("emergency_requests")
  .select("id,status,assigned_hospital_id,created_at,patient_name")
  .gte("created_at", since)
  .order("created_at", { ascending: false })
  .limit(80);

if (req.error) {
  console.error(req.error);
  process.exit(1);
}

const rows = req.data || [];
const ids = rows.map((item) => item.id);

let attempts = [];
if (ids.length > 0) {
  const result = await supabaseAdmin
    .from("request_attempts")
    .select("emergency_request_id,hospital_id,decision,created_at")
    .in("emergency_request_id", ids);

  if (result.error) {
    console.error(result.error);
    process.exit(1);
  }

  attempts = result.data || [];
}

const byStatus = {};
for (const row of rows) {
  byStatus[row.status] = (byStatus[row.status] || 0) + 1;
}

const pendingByHospital = {};
for (const attempt of attempts) {
  if (attempt.decision === "pending") {
    pendingByHospital[attempt.hospital_id] = (pendingByHospital[attempt.hospital_id] || 0) + 1;
  }
}

console.log(
  JSON.stringify(
    {
      since,
      total: rows.length,
      byStatus,
      pendingByHospital,
      latest: rows.slice(0, 10)
    },
    null,
    2
  )
);
