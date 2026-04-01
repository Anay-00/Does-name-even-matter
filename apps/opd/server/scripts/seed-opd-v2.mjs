/**
 * Seed OPD v2 — Inserts departments + doctors for all 5 hospitals.
 * Also renames IND-ACRO-02 → IND-AURO-02 / "Aurobindo Hospital" in hospitals table.
 *
 * Usage:  node apps/opd/server/scripts/seed-opd-v2.mjs
 * Requires: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in apps/opd/server/.env or backend/.env
 */

import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env") });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: resolve(__dirname, "../../../../backend/.env") });
}

const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/* ── Hospital rename: ACRO → AURO ─────────────────────────────── */
async function renameAcro() {
  const { data: existing } = await sb
    .from("hospitals")
    .select("id")
    .eq("code", "IND-ACRO-02")
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from("hospitals")
      .update({ code: "IND-AURO-02", name: "Aurobindo Hospital", address: "Near Aurobindo Hospital, Sanwer Road, Indore" })
      .eq("id", existing.id);
    if (error) console.error("  Rename failed:", error.message);
    else console.log("  ✓ Renamed IND-ACRO-02 → IND-AURO-02 (Aurobindo Hospital)");
  } else {
    console.log("  – IND-ACRO-02 not found (already renamed or missing)");
  }
}

/* ── Departments (5 per hospital) ──────────────────────────────── */
const DEPARTMENTS = [
  { code: "CARD", name: "Cardiology",       symptom_label: "Chest Pain / Heart Issues",  symptom_description: "Chest pain, palpitations, shortness of breath" },
  { code: "ORTH", name: "Orthopedics",      symptom_label: "Bone / Joint / Injury",      symptom_description: "Bone pain, fractures, sprains, joint issues, back pain" },
  { code: "NEUR", name: "Neurology",        symptom_label: "Head / Neurological",        symptom_description: "Headache, dizziness, seizures, numbness, memory issues" },
  { code: "PEDI", name: "Pediatrics",       symptom_label: "Child / Infant Care",        symptom_description: "Child illness, vaccination, growth concerns (0-16 yrs)" },
  { code: "GENM", name: "General Medicine", symptom_label: "Other / General",            symptom_description: "Fever, cold, cough, infections, general checkup" },
];

/* ── Doctor roster — 3 per specialty per hospital ──────────────── */
const DOCTOR_ROSTER = {
  "IND-AITR-01": [
    { deptCode: "CARD", name: "Dr. Rajesh Kumar",      qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Ananya Iyer",       qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Harsh Trivedi",     qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Priya Sharma",      qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Kunal Bose",        qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Sneha Pillai",      qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Amit Patel",        qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Ritika Sen",        qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Vishal Thakur",     qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Sunita Verma",      qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Arjun Nambiar",     qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Divya Rajan",       qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Vikram Singh",      qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Meghna Jain",       qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Siddharth Roy",     qualification: "MBBS, MD",            room: "115" },
  ],
  "IND-AURO-02": [
    { deptCode: "CARD", name: "Dr. Neha Gupta",        qualification: "MD Cardiology",       room: "201" },
    { deptCode: "CARD", name: "Dr. Tarun Saxena",      qualification: "DM Cardiology",       room: "206" },
    { deptCode: "CARD", name: "Dr. Prerna Malik",      qualification: "MD Cardiology",       room: "207" },
    { deptCode: "ORTH", name: "Dr. Sanjay Mishra",     qualification: "MS Orthopedics",      room: "202" },
    { deptCode: "ORTH", name: "Dr. Aditi Kulkarni",    qualification: "MS Orthopedics",      room: "208" },
    { deptCode: "ORTH", name: "Dr. Ramesh Tiwari",     qualification: "DNB Orthopedics",     room: "209" },
    { deptCode: "NEUR", name: "Dr. Kavita Joshi",      qualification: "DM Neurology",        room: "203" },
    { deptCode: "NEUR", name: "Dr. Nikhil Bansal",     qualification: "DM Neurology",        room: "210" },
    { deptCode: "NEUR", name: "Dr. Swati Menon",       qualification: "MD Neurology",        room: "211" },
    { deptCode: "PEDI", name: "Dr. Rohit Agarwal",     qualification: "MD Pediatrics",       room: "204" },
    { deptCode: "PEDI", name: "Dr. Pallavi Grover",    qualification: "MD Pediatrics",       room: "212" },
    { deptCode: "PEDI", name: "Dr. Aman Bajaj",        qualification: "DNB Pediatrics",      room: "213" },
    { deptCode: "GENM", name: "Dr. Meena Reddy",       qualification: "MD General Medicine",  room: "205" },
    { deptCode: "GENM", name: "Dr. Karan Ahuja",       qualification: "MD General Medicine",  room: "214" },
    { deptCode: "GENM", name: "Dr. Isha Bhatt",        qualification: "MBBS, MD",            room: "215" },
  ],
  "IND-VIJAY-03": [
    { deptCode: "CARD", name: "Dr. Arun Malhotra",     qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Pooja Nair",        qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Deepak Soni",       qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Deepika Nair",      qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Mohit Gupta",       qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Rashi Chauhan",     qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Suresh Yadav",      qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Anjali Bhatt",      qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Pranav Sinha",      qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Anjali Desai",      qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Vivek Sharma",      qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Nisha Kapoor",      qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Manoj Tiwari",      qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Shruti Pandey",     qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Rohan Joshi",       qualification: "MBBS, MD",            room: "115" },
  ],
  "IND-PALASIA-04": [
    { deptCode: "CARD", name: "Dr. Rakesh Dubey",      qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Nandini Rao",       qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Ajay Verma",        qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Pooja Saxena",      qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Sameer Khan",       qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Kavya Iyer",        qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Vivek Choudhary",   qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Anita Desai",       qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Gaurav Soni",       qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Shweta Pandey",     qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Rahul Mehta",       qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Tanya Gupta",       qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Ashok Bhatia",      qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Neelam Puri",       qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Varun Thakur",      qualification: "MBBS, MD",            room: "115" },
  ],
  "IND-BHAWAR-05": [
    { deptCode: "CARD", name: "Dr. Nitin Kapoor",      qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Suman Agarwal",     qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Rajat Mishra",      qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Ritu Dixit",        qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Anil Sharma",       qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Mansi Patel",       qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Gaurav Mehta",      qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Preeti Jain",       qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Ashish Dubey",      qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Pallavi Sinha",     qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Sunil Reddy",       qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Bhavna Chauhan",    qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Dinesh Chauhan",    qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Renu Saxena",       qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Kartik Nair",       qualification: "MBBS, MD",            room: "115" },
  ],
};

async function seed() {
  console.log("\n=== OPD v2 Seed ===\n");

  // Step 0: Rename ACRO → AURO
  console.log("[0] Renaming hospital...");
  await renameAcro();

  // Step 1: Get all active hospitals
  console.log("\n[1] Fetching hospitals...");
  const { data: hospitals, error: hErr } = await sb
    .from("hospitals")
    .select("id, code, name")
    .eq("is_active", true);

  if (hErr) { console.error("  Failed:", hErr.message); process.exit(1); }
  console.log(`  Found ${hospitals.length} hospitals`);

  const hospitalMap = Object.fromEntries(hospitals.map((h) => [h.code, h]));

  let deptCount = 0;
  let docCount = 0;

  for (const [hospitalCode, roster] of Object.entries(DOCTOR_ROSTER)) {
    const hospital = hospitalMap[hospitalCode];
    if (!hospital) {
      console.log(`  ⓧ Hospital ${hospitalCode} not found in DB — skipping`);
      continue;
    }

    console.log(`\n[2] Seeding ${hospital.name} (${hospitalCode})...`);

    for (const dept of DEPARTMENTS) {
      // Upsert department
      const { data: existingDept } = await sb
        .from("opd_departments")
        .select("id")
        .eq("hospital_id", hospital.id)
        .eq("code", dept.code)
        .maybeSingle();

      let deptId;
      if (existingDept) {
        deptId = existingDept.id;
        console.log(`    – Dept ${dept.code} already exists`);
      } else {
        const { data: newDept, error: dErr } = await sb
          .from("opd_departments")
          .insert({
            hospital_id: hospital.id,
            code: dept.code,
            name: dept.name,
            symptom_label: dept.symptom_label,
            symptom_description: dept.symptom_description,
          })
          .select("id")
          .single();
        if (dErr) { console.error(`    ✗ Dept ${dept.code}:`, dErr.message); continue; }
        deptId = newDept.id;
        deptCount++;
        console.log(`    ✓ Dept ${dept.code} → ${dept.name}`);
      }

      // Upsert doctors for this dept
      const deptDoctors = roster.filter((d) => d.deptCode === dept.code);
      for (const doc of deptDoctors) {
        const { data: existingDoc } = await sb
          .from("opd_doctors")
          .select("id")
          .eq("department_id", deptId)
          .eq("room_number", doc.room)
          .maybeSingle();

        if (existingDoc) {
          console.log(`    – ${doc.name} (Room ${doc.room}) already exists`);
        } else {
          const { error: docErr } = await sb
            .from("opd_doctors")
            .insert({
              hospital_id: hospital.id,
              department_id: deptId,
              name: doc.name,
              qualification: doc.qualification,
              room_number: doc.room,
            });
          if (docErr) { console.error(`    ✗ ${doc.name}:`, docErr.message); continue; }
          docCount++;
          console.log(`    ✓ ${doc.name} (${doc.qualification}) → Room ${doc.room}`);
        }
      }
    }
  }

  console.log(`\n=== Done: ${deptCount} departments, ${docCount} doctors inserted ===\n`);
}

seed().catch((err) => { console.error("Fatal:", err); process.exit(1); });
