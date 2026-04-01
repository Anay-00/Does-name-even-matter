import * as analyticsRepo from "./analyticsRepository.js";

/* ── Symptom labels ─────────────────────────────────────────────── */
const SYMPTOM_LABELS = {
  CARD: "Cardiac / Chest Pain",
  ORTH: "Orthopedic / Bone",
  NEUR: "Neurological / Head",
  PEDI: "Pediatric / Child",
  GENM: "General Medicine",
};

/* ══════════════════════════════════════════════════════════════════
   MAIN ENTRY — used by BOTH dashboard API and PDF generation
   ══════════════════════════════════════════════════════════════════ */
export async function getAnalyticsData(date, hospitalId) {
  const [tokens, doctors, departments] = await Promise.all([
    analyticsRepo.getTokensForDate(date, hospitalId),
    analyticsRepo.getDoctors(hospitalId),
    analyticsRepo.getDepartments(hospitalId),
  ]);

  const doctorMap = Object.fromEntries(doctors.map((d) => [d.id, d]));
  const deptMap = Object.fromEntries(departments.map((d) => [d.id, d]));

  // Enrich tokens
  const enriched = tokens.map((t) => ({
    ...t,
    doctor_name: doctorMap[t.doctor_id]?.name || "Unknown",
    department_name: deptMap[t.department_id]?.name || "Unknown",
    department_code: deptMap[t.department_id]?.code || "",
    waiting_minutes: computeWaitingMinutes(t),
  }));

  const completed = enriched.filter((t) => t.status === "completed");

  return {
    date: date || new Date().toISOString().slice(0, 10),
    totalTokens: tokens.length,
    summary: computeSummary(enriched),
    patientLoadOverTime: computePatientLoadOverTime(enriched),
    consultationTimeAnalysis: computeConsultationTimeAnalysis(completed, doctorMap),
    waitingTimeAnalysis: computeWaitingTimeAnalysis(enriched),
    ageDistribution: computeAgeDistribution(enriched),
    symptomFrequency: computeSymptomFrequency(enriched),
    doctorEfficiencyMatrix: computeDoctorEfficiency(completed, doctorMap),
    peakDelayVsAvailability: computePeakDelayVsAvailability(enriched, doctors),
  };
}

/* ── Helpers ─────────────────────────────────────────────────────── */

function computeWaitingMinutes(token) {
  if (!token.created_at) return null;
  const start = new Date(token.created_at);
  const end = token.consultation_started_at
    ? new Date(token.consultation_started_at)
    : token.called_at
      ? new Date(token.called_at)
      : null;
  if (!end) return null;
  return Math.round(((end - start) / 60000) * 10) / 10;
}

function pad(h) {
  return String(h).padStart(2, "0");
}

/* ── Summary Cards ──────────────────────────────────────────────── */

function computeSummary(tokens) {
  const totalPatients = tokens.length;

  const waits = tokens.map((t) => t.waiting_minutes).filter((w) => w != null && w >= 0);
  const avgWaitingTime =
    waits.length > 0
      ? Math.round((waits.reduce((s, w) => s + w, 0) / waits.length) * 10) / 10
      : 0;

  // Peak hour
  const hourCounts = {};
  tokens.forEach((t) => {
    if (t.created_at) {
      const h = new Date(t.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    }
  });
  const peak = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const peakHour = peak ? `${pad(peak[0])}:00` : "N/A";
  const peakHourCount = peak ? Number(peak[1]) : 0;

  // Top symptom
  const sympCounts = {};
  tokens.forEach((t) => {
    if (t.symptom_category) sympCounts[t.symptom_category] = (sympCounts[t.symptom_category] || 0) + 1;
  });
  const topSymp = Object.entries(sympCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    totalPatients,
    avgWaitingTime,
    peakHour,
    peakHourCount,
    mostCommonSymptom: topSymp ? topSymp[0] : "N/A",
    mostCommonSymptomLabel: topSymp ? SYMPTOM_LABELS[topSymp[0]] || topSymp[0] : "N/A",
    mostCommonSymptomCount: topSymp ? topSymp[1] : 0,
    completed: tokens.filter((t) => t.status === "completed").length,
    cancelled: tokens.filter((t) => t.status === "cancelled").length,
    waiting: tokens.filter((t) => t.status === "waiting").length,
    inConsultation: tokens.filter((t) => t.status === "in_consultation").length,
  };
}

/* ── 1. Patient Load Over Time (Line Chart) ─────────────────────── */

function computePatientLoadOverTime(tokens) {
  const hourCounts = {};
  for (let h = 0; h < 24; h++) hourCounts[h] = 0;

  tokens.forEach((t) => {
    if (t.created_at) hourCounts[new Date(t.created_at).getHours()]++;
  });

  const labels = Object.keys(hourCounts).map((h) => `${pad(h)}:00`);
  const data = Object.values(hourCounts);

  const maxCount = Math.max(...data);
  const peakHours = data.reduce((acc, v, i) => (v === maxCount && maxCount > 0 ? [...acc, labels[i]] : acc), []);
  const activeHours = data.filter((d) => d > 0);
  const avgLoad = activeHours.length > 0 ? (activeHours.reduce((s, v) => s + v, 0) / activeHours.length).toFixed(1) : "0";

  let insight = tokens.length === 0
    ? "No patient data available for this date."
    : `Patient load peaks at ${peakHours.join(", ")} with ${maxCount} registrations. Average hourly load is ${avgLoad} patients. Consider additional staff during peak hours to reduce waiting times.`;

  return { labels, data, insight };
}

/* ── 2. Consultation Time Analysis (Doctor-wise Bar Chart) ──────── */

function computeConsultationTimeAnalysis(completedTokens, doctorMap) {
  const doctorTimes = {};
  completedTokens.forEach((t) => {
    if (t.consultation_duration_seconds && t.doctor_id) {
      if (!doctorTimes[t.doctor_id]) doctorTimes[t.doctor_id] = [];
      doctorTimes[t.doctor_id].push(t.consultation_duration_seconds / 60);
    }
  });

  const labels = [];
  const avgTimes = [];
  const minTimes = [];
  const maxTimes = [];
  const patientCounts = [];

  Object.entries(doctorTimes).forEach(([docId, times]) => {
    labels.push(doctorMap[docId]?.name || "Unknown");
    avgTimes.push(Math.round((times.reduce((s, t) => s + t, 0) / times.length) * 10) / 10);
    minTimes.push(Math.round(Math.min(...times) * 10) / 10);
    maxTimes.push(Math.round(Math.max(...times) * 10) / 10);
    patientCounts.push(times.length);
  });

  const overallAvg = avgTimes.length > 0 ? (avgTimes.reduce((s, v) => s + v, 0) / avgTimes.length).toFixed(1) : "0";
  const fastestDoc = avgTimes.length > 0 ? labels[avgTimes.indexOf(Math.min(...avgTimes))] : "N/A";
  const slowestDoc = avgTimes.length > 0 ? labels[avgTimes.indexOf(Math.max(...avgTimes))] : "N/A";

  let insight = labels.length === 0
    ? "No completed consultations yet to analyze."
    : `Average consultation time is ${overallAvg} min. ${fastestDoc} is fastest; ${slowestDoc} takes longest. Variation may reflect case complexity or process optimization opportunities.`;

  return { labels, avgTimes, minTimes, maxTimes, patientCounts, insight };
}

/* ── 3. Waiting Time Analysis (Bar Chart by hour) ───────────────── */

function computeWaitingTimeAnalysis(tokens) {
  const hourWaits = {};
  for (let h = 0; h < 24; h++) hourWaits[h] = [];

  tokens.forEach((t) => {
    if (t.waiting_minutes != null && t.waiting_minutes >= 0 && t.created_at) {
      hourWaits[new Date(t.created_at).getHours()].push(t.waiting_minutes);
    }
  });

  const labels = [];
  const avgWaits = [];
  const maxWaits = [];

  Object.entries(hourWaits).forEach(([h, waits]) => {
    if (waits.length > 0) {
      labels.push(`${pad(h)}:00`);
      avgWaits.push(Math.round((waits.reduce((s, w) => s + w, 0) / waits.length) * 10) / 10);
      maxWaits.push(Math.round(Math.max(...waits) * 10) / 10);
    }
  });

  const overallAvg = avgWaits.length > 0 ? (avgWaits.reduce((s, v) => s + v, 0) / avgWaits.length).toFixed(1) : "0";
  const worstIdx = maxWaits.length > 0 ? maxWaits.indexOf(Math.max(...maxWaits)) : -1;

  let insight = labels.length === 0
    ? "No waiting time data available yet."
    : `Average waiting time is ${overallAvg} min.${worstIdx >= 0 ? ` Longest waits occur around ${labels[worstIdx]} (up to ${maxWaits[worstIdx]} min).` : ""} Reducing peak-hour bottlenecks could improve patient satisfaction significantly.`;

  return { labels, avgWaits, maxWaits, insight };
}

/* ── 4. Age Distribution ────────────────────────────────────────── */

function computeAgeDistribution(tokens) {
  const hasAge = tokens.some((t) => t.patient_age != null);

  if (hasAge) {
    const buckets = { "0-18": 0, "19-30": 0, "31-45": 0, "46-60": 0, "61-75": 0, "75+": 0 };
    tokens.forEach((t) => {
      const age = t.patient_age;
      if (age == null) return;
      if (age <= 18) buckets["0-18"]++;
      else if (age <= 30) buckets["19-30"]++;
      else if (age <= 45) buckets["31-45"]++;
      else if (age <= 60) buckets["46-60"]++;
      else if (age <= 75) buckets["61-75"]++;
      else buckets["75+"]++;
    });

    const labels = Object.keys(buckets);
    const data = Object.values(buckets);
    const total = data.reduce((s, v) => s + v, 0);
    const peakGroup = labels[data.indexOf(Math.max(...data))];
    const elderlyCount = buckets["61-75"] + buckets["75+"];

    let insight = `Majority of patients fall in the ${peakGroup} age group (${total > 0 ? Math.round((Math.max(...data) / total) * 100) : 0}%). `;
    insight += `Pediatric (0-18): ${buckets["0-18"]}, Elderly (61+): ${elderlyCount}. `;
    insight += elderlyCount > total * 0.3
      ? "High elderly ratio suggests need for geriatric-focused services."
      : "Age distribution is fairly balanced across groups.";

    return { labels, data, insight, hasAge: true };
  }

  // Fallback: estimate from symptom categories
  const sympCounts = {};
  tokens.forEach((t) => (sympCounts[t.symptom_category || "OTHER"] = (sympCounts[t.symptom_category || "OTHER"] || 0) + 1));

  const buckets = { "0-18": 0, "19-30": 0, "31-45": 0, "46-60": 0, "61-75": 0, "75+": 0 };
  tokens.forEach((t) => {
    const cat = t.symptom_category;
    if (cat === "PEDI") buckets["0-18"]++;
    else if (cat === "CARD") { buckets["46-60"] += 0.5; buckets["61-75"] += 0.5; }
    else { buckets["19-30"] += 0.3; buckets["31-45"] += 0.4; buckets["46-60"] += 0.3; }
  });
  Object.keys(buckets).forEach((k) => (buckets[k] = Math.round(buckets[k])));

  const labels = Object.keys(buckets);
  const data = Object.values(buckets);

  let insight = "Patient age data is not recorded — estimates derived from symptom categories. ";
  insight += "Consider adding age collection during registration for better demographics. ";
  insight += `Pediatric (PEDI): ${sympCounts["PEDI"] || 0}, Cardiac (typically older): ${sympCounts["CARD"] || 0}.`;

  return { labels, data, insight, hasAge: false };
}

/* ── 5. Symptom Frequency (Doughnut Chart) ──────────────────────── */

function computeSymptomFrequency(tokens) {
  const counts = {};
  tokens.forEach((t) => {
    const label = SYMPTOM_LABELS[t.symptom_category] || t.symptom_category || "Other";
    counts[label] = (counts[label] || 0) + 1;
  });

  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sorted.map((s) => s[0]);
  const data = sorted.map((s) => s[1]);
  const total = data.reduce((s, v) => s + v, 0);

  let insight = total === 0
    ? "No symptom data available."
    : `${labels[0]} is the most common at ${Math.round((data[0] / total) * 100)}% (${data[0]} patients).${labels.length > 1 ? ` Followed by ${labels[1]} (${data[1]}).` : ""} This distribution helps staffing and resource allocation across departments.`;

  return { labels, data, insight };
}

/* ── 6. Doctor Efficiency Matrix (Scatter Plot) ─────────────────── */

function computeDoctorEfficiency(completedTokens, doctorMap) {
  const stats = {};
  completedTokens.forEach((t) => {
    if (!t.doctor_id || !t.consultation_duration_seconds) return;
    if (!stats[t.doctor_id]) stats[t.doctor_id] = { name: doctorMap[t.doctor_id]?.name || "Unknown", totalMin: 0, count: 0, waitTimes: [] };
    stats[t.doctor_id].totalMin += t.consultation_duration_seconds / 60;
    stats[t.doctor_id].count++;
    if (t.waiting_minutes != null && t.waiting_minutes >= 0) stats[t.doctor_id].waitTimes.push(t.waiting_minutes);
  });

  const points = Object.values(stats).map((s) => ({
    name: s.name,
    patientsHandled: s.count,
    avgConsultationTime: Math.round((s.totalMin / s.count) * 10) / 10,
    avgWaitingTime: s.waitTimes.length > 0 ? Math.round((s.waitTimes.reduce((a, w) => a + w, 0) / s.waitTimes.length) * 10) / 10 : 0,
  }));

  let insight;
  if (points.length === 0) {
    insight = "No completed consultation data to analyze doctor efficiency.";
  } else {
    const highVol = [...points].sort((a, b) => b.patientsHandled - a.patientsHandled)[0];
    const fastest = [...points].sort((a, b) => a.avgConsultationTime - b.avgConsultationTime)[0];
    insight = `${highVol.name} handled the most patients (${highVol.patientsHandled}). ${fastest.name} is most efficient at ${fastest.avgConsultationTime} min avg. Ideal zone: high volume with low avg time.`;
  }

  return { points, insight };
}

/* ── 7. Peak Delay vs Doctor Availability ───────────────────────── */

function computePeakDelayVsAvailability(tokens, doctors) {
  const hourData = {};
  for (let h = 0; h < 24; h++) hourData[h] = { patients: 0, totalWait: 0, waitCount: 0 };

  tokens.forEach((t) => {
    if (!t.created_at) return;
    const h = new Date(t.created_at).getHours();
    hourData[h].patients++;
    if (t.waiting_minutes != null && t.waiting_minutes >= 0) {
      hourData[h].totalWait += t.waiting_minutes;
      hourData[h].waitCount++;
    }
  });

  const labels = [];
  const patientCounts = [];
  const avgDelays = [];
  const doctorCount = doctors.length;

  Object.entries(hourData).forEach(([h, d]) => {
    if (d.patients > 0) {
      labels.push(`${pad(h)}:00`);
      patientCounts.push(d.patients);
      avgDelays.push(d.waitCount > 0 ? Math.round((d.totalWait / d.waitCount) * 10) / 10 : 0);
    }
  });

  const peakDelay = avgDelays.length > 0 ? Math.max(...avgDelays) : 0;
  const peakDelayHour = labels[avgDelays.indexOf(peakDelay)] || "N/A";
  const peakPatients = patientCounts.length > 0 ? Math.max(...patientCounts) : 0;
  const ratio = (peakPatients / Math.max(doctorCount, 1)).toFixed(1);

  let insight = labels.length === 0
    ? "No data available for peak delay analysis."
    : `With ${doctorCount} doctors, peak delay of ${peakDelay} min at ${peakDelayHour}. Peak patient-to-doctor ratio is ${ratio}:1. ${Number(ratio) > 5 ? "Exceeds threshold — consider on-call staff during peak." : "Staffing appears adequate for observed load."}`;

  return { labels, patientCounts, avgDelays, doctorCount, insight };
}
