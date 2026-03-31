#!/usr/bin/env node
/**
 * OPD Seed Data Generator
 * ─────────────────────────────────────────────────────────────────
 * Simulates a realistic Indian Government Hospital OPD day based on
 * GoI National Health Mission (NHM) & NITI Aayog statistics:
 *
 *   • 350–500 tokens per district hospital per day
 *   • Peak hours: 09:00–12:00 (Poisson distribution, λ peaks at 10 AM)
 *   • Avg consultation: 4–7 min (govt), 10–15 min (private)
 *   • Dept distribution: Gen Medicine 35%, Ortho 13%, Paeds 11%,
 *     Surgery 10%, ObGyn 9%, ENT 6%, Ophthalmology 6%, Derma 5%, Other 5%
 *   • Male:Female ≈ 55:45
 *   • Age: primarily 18–70, median ~38
 *
 * Usage:
 *   cd apps/opd/server
 *   node scripts/seed.mjs            # seed AitriCare (default)
 *   node scripts/seed.mjs --clear    # clear existing OPD data first
 *
 * Requires: SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY env vars
 * ─────────────────────────────────────────────────────────────────
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/* ── GoI OPD Department Distribution ────────────────────────────── */
const DEPT_CONFIG = [
  { name: "General Medicine",       weight: 0.35, avgConsult: 5   },
  { name: "Orthopedics",            weight: 0.13, avgConsult: 7   },
  { name: "Pediatrics",             weight: 0.11, avgConsult: 6   },
  { name: "General Surgery",        weight: 0.10, avgConsult: 8   },
  { name: "Obstetrics & Gynecology",weight: 0.09, avgConsult: 10  },
  { name: "ENT",                    weight: 0.06, avgConsult: 6   },
  { name: "Ophthalmology",          weight: 0.06, avgConsult: 5   },
  { name: "Dermatology",            weight: 0.05, avgConsult: 5   },
  { name: "Psychiatry",             weight: 0.05, avgConsult: 12  },
];

/* ── Hourly arrival rates (Poisson λ) matching GoI peak patterns ── */
const HOURLY_LAMBDA = [
  /* 00 */ 0, 0, 0, 0, 0, 0,
  /* 06 */ 2, 8, 25, 55, 60, 45,
  /* 12 */ 30, 25, 35, 30, 20, 12,
  /* 18 */ 5, 2, 0, 0, 0, 0,
];

/* ── Indian name bank (census-derived) ──────────────────────────── */
const MALE_FIRST = ["Rajesh", "Amit", "Suresh", "Vikram", "Rohit", "Arjun", "Deepak", "Sanjay", "Manoj", "Ravi", "Ashish", "Pankaj", "Ajay", "Rahul", "Vijay", "Arun", "Naveen", "Pradeep", "Vinod", "Ramesh", "Gaurav", "Nitin", "Sachin", "Ankit", "Karan", "Mohit", "Harsh", "Dinesh", "Rakesh", "Mukesh", "Yogesh", "Bharat", "Hemant", "Lokesh", "Mahesh"];
const FEMALE_FIRST = ["Priya", "Sunita", "Anjali", "Neha", "Kavita", "Pooja", "Meena", "Shalini", "Ritu", "Sneha", "Deepika", "Ananya", "Nisha", "Rekha", "Geeta", "Sapna", "Shweta", "Manisha", "Divya", "Seema", "Kamla", "Lakshmi", "Radha", "Asha", "Jyoti", "Preeti", "Komal", "Swati", "Nandini", "Pallavi"];
const LAST_NAMES = ["Sharma", "Patel", "Singh", "Kumar", "Gupta", "Verma", "Joshi", "Malhotra", "Chauhan", "Yadav", "Mishra", "Agarwal", "Shukla", "Mehta", "Pandey", "Tiwari", "Saxena", "Jain", "Soni", "Thakur", "Dubey", "Dwivedi", "Rajput", "Pawar", "Kulkarni", "Bhat", "Rao", "Iyer", "Choudhary", "Nair"];

/* ── Doctor name bank ───────────────────────────────────────────── */
const DOCTOR_NAMES = [
  { name: "Dr. Anand Verma",      spec: "General Medicine"        },
  { name: "Dr. Priya Sharma",     spec: "General Medicine"        },
  { name: "Dr. Rajiv Mehta",      spec: "General Medicine"        },
  { name: "Dr. Sunil Chauhan",    spec: "Orthopedics"             },
  { name: "Dr. Neeta Joshi",      spec: "Pediatrics"              },
  { name: "Dr. Amit Agarwal",     spec: "General Surgery"         },
  { name: "Dr. Kavita Rao",       spec: "Obstetrics & Gynecology" },
  { name: "Dr. Deepak Tiwari",    spec: "ENT"                     },
  { name: "Dr. Sneha Patel",      spec: "Ophthalmology"           },
  { name: "Dr. Harsh Saxena",     spec: "Dermatology"             },
  { name: "Dr. Meena Kulkarni",   spec: "Psychiatry"              },
];

/* ── Utilities ──────────────────────────────────────────────────── */
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function poissonSample(lambda) {
  if (lambda <= 0) return 0;
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function gaussianAge(mean, std) {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(1, Math.min(95, Math.round(mean + z * std)));
}

function randomPhone() {
  const prefixes = ["98", "97", "96", "95", "94", "93", "91", "90", "88", "87", "86", "85"];
  return pick(prefixes) + String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
}

/* ── Main ───────────────────────────────────────────────────────── */
async function main() {
  const shouldClear = process.argv.includes("--clear");
  const TOTAL_TARGET = 400; // GoI average for district hospital

  console.log("🏥 MediSync OPD Seed — GoI NHM Statistics Model");
  console.log("─".repeat(52));

  // 1. Find first active hospital
  const { data: hospitals } = await supabase
    .from("hospitals")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name")
    .limit(1);

  if (!hospitals?.length) {
    console.error("❌ No active hospitals found. Seed the main system first.");
    process.exit(1);
  }
  const hospital = hospitals[0];
  console.log(`Hospital: ${hospital.name} (${hospital.code})`);

  // 2. Ensure departments exist
  const { data: existingDepts } = await supabase
    .from("departments")
    .select("id, name")
    .eq("hospital_id", hospital.id)
    .eq("status", "active");

  let deptLookup = {};
  if (existingDepts?.length >= DEPT_CONFIG.length) {
    for (const d of existingDepts) deptLookup[d.name] = d.id;
  } else {
    console.log("Creating OPD departments...");
    for (const cfg of DEPT_CONFIG) {
      if (existingDepts?.find((d) => d.name === cfg.name)) {
        deptLookup[cfg.name] = existingDepts.find((d) => d.name === cfg.name).id;
        continue;
      }
      const { data, error } = await supabase
        .from("departments")
        .upsert({ hospital_id: hospital.id, name: cfg.name, status: "active" }, { onConflict: "hospital_id,name" })
        .select("id")
        .single();
      if (error) { console.error(`  ⚠ ${cfg.name}: ${error.message}`); continue; }
      deptLookup[cfg.name] = data.id;
    }
  }
  console.log(`  ${Object.keys(deptLookup).length} departments ready`);

  // 3. Ensure doctors exist
  const { data: existingDocs } = await supabase
    .from("doctors")
    .select("id, full_name, department")
    .eq("hospital_id", hospital.id)
    .eq("is_active", true);

  let doctorsByDept = {};
  if (existingDocs?.length >= DOCTOR_NAMES.length) {
    for (const d of existingDocs) {
      if (!doctorsByDept[d.department]) doctorsByDept[d.department] = [];
      doctorsByDept[d.department].push(d.id);
    }
  } else {
    console.log("Creating OPD doctors...");
    for (const doc of DOCTOR_NAMES) {
      const existing = existingDocs?.find((d) => d.full_name === doc.name);
      if (existing) {
        if (!doctorsByDept[doc.spec]) doctorsByDept[doc.spec] = [];
        doctorsByDept[doc.spec].push(existing.id);
        continue;
      }
      const { data, error } = await supabase
        .from("doctors")
        .insert({
          hospital_id: hospital.id,
          full_name: doc.name,
          specialization: doc.spec,
          department: doc.spec,
          qualification: "MBBS, MD",
          is_emergency_doctor: false,
          is_available: true,
          is_active: true,
        })
        .select("id")
        .single();
      if (error) { console.error(`  ⚠ ${doc.name}: ${error.message}`); continue; }
      if (!doctorsByDept[doc.spec]) doctorsByDept[doc.spec] = [];
      doctorsByDept[doc.spec].push(data.id);
    }
  }
  console.log(`  ${Object.values(doctorsByDept).flat().length} doctors ready`);

  // 4. Clear existing OPD data if requested
  if (shouldClear) {
    console.log("Clearing existing OPD data...");
    await supabase.from("opd_tokens").delete().eq("hospital_id", hospital.id);
    await supabase.from("opd_counters").delete().eq("hospital_id", hospital.id);
  }

  // 5. Generate tokens following GoI Poisson arrival model
  const today = new Date().toISOString().slice(0, 10);
  const baseDate = new Date(`${today}T00:00:00`);
  const nowMs = Date.now();

  // Calculate hourly arrivals using Poisson sampling
  const scale = TOTAL_TARGET / HOURLY_LAMBDA.reduce((a, b) => a + b, 0);
  const hourlyArrivals = HOURLY_LAMBDA.map((lam) => poissonSample(lam * scale));
  const totalTokens = hourlyArrivals.reduce((a, b) => a + b, 0);

  console.log(`\nGenerating ${totalTokens} tokens (GoI target: ${TOTAL_TARGET})...`);
  console.log(`  Hourly: ${hourlyArrivals.filter((h) => h > 0).join(", ")}`);

  // Generate all tokens with timestamps
  const allTokens = [];
  let tokenNumber = 0;

  for (let hour = 0; hour < 24; hour++) {
    const count = hourlyArrivals[hour];
    for (let i = 0; i < count; i++) {
      tokenNumber++;
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      const issuedAt = new Date(baseDate.getTime() + hour * 3600000 + minute * 60000 + second * 1000);

      // Pick department weighted by GoI distribution
      const r = Math.random();
      let cumulative = 0;
      let dept = DEPT_CONFIG[0];
      for (const d of DEPT_CONFIG) {
        cumulative += d.weight;
        if (r <= cumulative) { dept = d; break; }
      }

      const deptId = deptLookup[dept.name];
      if (!deptId) continue;

      const doctorIds = doctorsByDept[dept.name] || [];
      const doctorId = doctorIds.length > 0 ? pick(doctorIds) : null;

      const isMale = Math.random() < 0.55;
      const firstName = isMale ? pick(MALE_FIRST) : pick(FEMALE_FIRST);
      const lastName = pick(LAST_NAMES);
      const age = gaussianAge(38, 16);
      const isPriority = Math.random() < 0.08; // 8% priority cases

      // Determine status based on time relative to "now"
      let status, calledAt = null, completedAt = null, consultDuration = null;
      const tokenTimeMs = issuedAt.getTime();

      if (tokenTimeMs > nowMs) {
        // Future tokens (shouldn't happen for today, but just in case)
        status = "waiting";
      } else {
        // Calculate realistic consultation start (wait ≈ position × avgConsult)
        const avgConsultMs = dept.avgConsult * 60 * 1000;
        const estimatedCallMs = tokenTimeMs + (Math.random() * 30 + 10) * 60 * 1000; // 10–40 min wait

        if (estimatedCallMs + avgConsultMs * 1.5 < nowMs) {
          // Token was well before now → completed
          const skippedRoll = Math.random();
          if (skippedRoll < 0.04) {
            status = "skipped";
          } else if (skippedRoll < 0.06) {
            status = "cancelled";
          } else {
            status = "completed";
            calledAt = new Date(estimatedCallMs);
            consultDuration = Math.round(dept.avgConsult * 60 * (0.5 + Math.random()));
            completedAt = new Date(calledAt.getTime() + consultDuration * 1000);
          }
        } else if (estimatedCallMs < nowMs) {
          // Token was called but might still be in consultation
          if (Math.random() < 0.15) {
            status = "in_consultation";
            calledAt = new Date(estimatedCallMs);
          } else {
            status = "completed";
            calledAt = new Date(estimatedCallMs);
            consultDuration = Math.round(dept.avgConsult * 60 * (0.5 + Math.random()));
            completedAt = new Date(calledAt.getTime() + consultDuration * 1000);
          }
        } else {
          status = "waiting";
        }
      }

      allTokens.push({
        hospital_id: hospital.id,
        department_id: deptId,
        doctor_id: doctorId,
        token_number: tokenNumber,
        patient_name: `${firstName} ${lastName}`,
        patient_age: age,
        patient_gender: isMale ? "male" : "female",
        patient_phone: randomPhone(),
        priority: isPriority ? "priority" : "normal",
        status,
        issued_at: issuedAt.toISOString(),
        called_at: calledAt?.toISOString() || null,
        completed_at: completedAt?.toISOString() || null,
        consultation_duration_seconds: consultDuration,
        counter_date: today,
      });
    }
  }

  // 6. Insert in batches (Supabase limit ~1000 per request)
  const BATCH_SIZE = 200;
  let inserted = 0;
  for (let i = 0; i < allTokens.length; i += BATCH_SIZE) {
    const batch = allTokens.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from("opd_tokens").insert(batch);
    if (error) {
      console.error(`  ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
    } else {
      inserted += batch.length;
    }
  }

  // 7. Update counter
  const counterMap = {};
  for (const t of allTokens) {
    const key = `${t.hospital_id}|${t.department_id}`;
    counterMap[key] = Math.max(counterMap[key] || 0, t.token_number);
  }
  for (const [key, lastNum] of Object.entries(counterMap)) {
    const [hospId, deptId] = key.split("|");
    await supabase
      .from("opd_counters")
      .upsert({ hospital_id: hospId, department_id: deptId, counter_date: today, last_token_number: lastNum }, { onConflict: "hospital_id,department_id,counter_date" });
  }

  // 8. Summary
  const statusCounts = {};
  for (const t of allTokens) statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  const deptCounts = {};
  for (const t of allTokens) {
    const deptName = DEPT_CONFIG.find((d) => deptLookup[d.name] === t.department_id)?.name || "?";
    deptCounts[deptName] = (deptCounts[deptName] || 0) + 1;
  }

  console.log(`\n✅ Inserted ${inserted} / ${allTokens.length} tokens`);
  console.log("\nStatus Distribution:");
  for (const [s, c] of Object.entries(statusCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${s.padEnd(18)} ${c} (${((c / allTokens.length) * 100).toFixed(1)}%)`);
  }
  console.log("\nDepartment Distribution (GoI NHM Model):");
  for (const [d, c] of Object.entries(deptCounts).sort((a, b) => b[1] - a[1])) {
    const bar = "█".repeat(Math.round(c / 5));
    console.log(`  ${d.padEnd(25)} ${String(c).padStart(3)} ${bar}`);
  }

  const completedDurations = allTokens.filter((t) => t.consultation_duration_seconds).map((t) => t.consultation_duration_seconds);
  const avgDuration = completedDurations.length > 0
    ? Math.round(completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length / 60)
    : 0;
  console.log(`\nAvg Consultation: ${avgDuration} min`);
  console.log("─".repeat(52));
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
