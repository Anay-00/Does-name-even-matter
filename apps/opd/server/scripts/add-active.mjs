/**
 * Adds active (waiting + in_consultation) tokens to make the demo live.
 * Run after seed.mjs.
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const today = new Date().toISOString().slice(0, 10);
const now = new Date();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Find hospital with OPD departments
const { data: hospitals } = await sb.from("hospitals").select("id, name, code").eq("is_active", true).order("name");
let hospitalId = null;
for (const h of hospitals) {
  const { data: d } = await sb.from("departments").select("id").eq("hospital_id", h.id).eq("status", "active");
  if (d?.length > 0) { hospitalId = h.id; console.log(`Using ${h.name}`); break; }
}
if (!hospitalId) { console.error("No hospital with departments found. Run seed.mjs first."); process.exit(1); }

const { data: depts } = await sb.from("departments").select("id, name").eq("hospital_id", hospitalId).eq("status", "active");
const { data: docs } = await sb.from("doctors").select("id, department").eq("hospital_id", hospitalId).eq("is_active", true);

const { data: existing } = await sb.from("opd_tokens").select("token_number").eq("hospital_id", hospitalId).eq("counter_date", today).order("token_number", { ascending: false }).limit(1);
let tokenNum = existing?.[0]?.token_number || 0;

const NAMES = ["Aditya Kumar", "Priya Sharma", "Rohit Singh", "Neha Gupta", "Vikram Patel", "Anjali Verma", "Arjun Chauhan", "Pooja Yadav", "Karan Mehta", "Sneha Joshi", "Deepak Tiwari", "Kavita Saxena", "Manoj Dubey", "Ritu Mishra", "Gaurav Rajput", "Shalini Nair", "Sachin Soni", "Divya Pandey", "Nitin Thakur", "Swati Jain", "Harsh Kulkarni", "Nandini Bhat", "Pankaj Choudhary", "Komal Iyer", "Rahul Pawar"];
const tokens = [];

// 3 in_consultation tokens
for (let i = 0; i < 3; i++) {
  tokenNum++;
  const dept = depts[i % depts.length];
  const doc = docs.find((d) => d.department === dept.name) || docs[i % docs.length];
  tokens.push({
    hospital_id: hospitalId, department_id: dept.id, doctor_id: doc?.id || null,
    token_number: tokenNum, patient_name: NAMES[i],
    patient_age: 25 + Math.floor(Math.random() * 40),
    patient_gender: i % 2 === 0 ? "male" : "female",
    priority: "normal", status: "in_consultation",
    issued_at: new Date(now.getTime() - (30 + i * 5) * 60000).toISOString(),
    called_at: new Date(now.getTime() - (5 + i) * 60000).toISOString(),
    counter_date: today,
  });
}

// 22 waiting tokens
for (let i = 0; i < 22; i++) {
  tokenNum++;
  const dept = depts[i % depts.length];
  const doc = docs.find((d) => d.department === dept.name) || null;
  tokens.push({
    hospital_id: hospitalId, department_id: dept.id, doctor_id: doc?.id || null,
    token_number: tokenNum, patient_name: NAMES[3 + (i % (NAMES.length - 3))],
    patient_age: 18 + Math.floor(Math.random() * 55),
    patient_gender: ["male", "female"][i % 2],
    priority: i < 2 ? "priority" : "normal", status: "waiting",
    issued_at: new Date(now.getTime() - (20 - i) * 60000).toISOString(),
    counter_date: today,
  });
}

const { error } = await sb.from("opd_tokens").insert(tokens);
if (error) { console.error("Insert error:", error.message); process.exit(1); }

console.log(`✅ Added ${tokens.length} active tokens (3 in_consultation, 22 waiting)`);

// Update all counters
for (const dept of depts) {
  await sb.from("opd_counters").upsert(
    { hospital_id: hospitalId, department_id: dept.id, counter_date: today, last_token_number: tokenNum },
    { onConflict: "hospital_id,department_id,counter_date" }
  );
}
console.log(`   Counters updated to ${tokenNum}`);
