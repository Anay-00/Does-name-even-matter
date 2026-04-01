/**
 * Generate a multi-page PDF analytics report from processed data.
 * Uses Puppeteer to render an HTML page with Chart.js charts, then
 * converts it to a paginated PDF.
 */
export async function generatePdf(data) {
  const puppeteer = await import("puppeteer").catch(() => null);
  if (!puppeteer) throw new Error("puppeteer is not installed — run: npm install puppeteer");

  const html = buildPdfHtml(data);

  const browser = await puppeteer.default.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0", timeout: 30000 });

  // Wait for all Chart.js canvases to finish rendering
  await page.waitForFunction(() => window.__chartsReady === true, { timeout: 20000 });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "18mm", bottom: "18mm", left: "14mm", right: "14mm" },
  });

  await browser.close();
  return Buffer.from(pdfBuffer);
}

/* ══════════════════════════════════════════════════════════════════
   Build self-contained HTML for the PDF report
   ══════════════════════════════════════════════════════════════════ */
function buildPdfHtml(data) {
  const d = JSON.stringify(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1e293b; background: #fff; }

  .page { page-break-after: always; padding: 8px 0; }
  .page:last-child { page-break-after: auto; }

  /* ─── Header ─── */
  .report-header {
    background: linear-gradient(135deg, #1e40af 0%, #0d9488 100%);
    color: #fff; padding: 28px 32px; border-radius: 12px; margin-bottom: 24px;
  }
  .report-header h1 { font-size: 26px; margin-bottom: 4px; }
  .report-header p { font-size: 13px; opacity: .85; }

  /* ─── Summary cards ─── */
  .summary-row { display: flex; gap: 14px; margin-bottom: 20px; }
  .s-card {
    flex: 1; background: #f8fafc; border-radius: 10px; padding: 16px 18px;
    border-left: 4px solid; text-align: center;
  }
  .s-card.blue   { border-color: #2563eb; }
  .s-card.teal   { border-color: #0d9488; }
  .s-card.amber  { border-color: #d97706; }
  .s-card.pink   { border-color: #db2777; }
  .s-card h4 { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: .5px; margin-bottom: 6px; }
  .s-card .val { font-size: 28px; font-weight: 700; }
  .s-card .sub { font-size: 11px; color: #94a3b8; margin-top: 2px; }

  /* ─── Status bar ─── */
  .status-bar { display: flex; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
  .status-pill {
    display: flex; align-items: center; gap: 6px;
    background: #f1f5f9; padding: 6px 14px; border-radius: 20px; font-size: 13px;
  }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .dot.green  { background: #22c55e; } .dot.blue  { background: #3b82f6; }
  .dot.yellow { background: #eab308; } .dot.red   { background: #ef4444; }

  /* ─── Chart sections ─── */
  .chart-section {
    page-break-inside: avoid; margin-bottom: 28px;
    background: #fafbfc; border-radius: 10px; padding: 20px 24px;
    border: 1px solid #e2e8f0;
  }
  .chart-section h2 { font-size: 16px; font-weight: 700; margin-bottom: 14px; color: #0f172a; }
  .chart-wrap { width: 100%; height: 280px; position: relative; margin-bottom: 14px; }
  .chart-wrap canvas { width: 100% !important; height: 100% !important; }
  .insight {
    background: #eff6ff; border-left: 3px solid #3b82f6; padding: 10px 14px;
    border-radius: 0 8px 8px 0; font-size: 12px; line-height: 1.6; color: #334155;
  }

  /* ─── Footer ─── */
  .report-footer {
    text-align: center; font-size: 11px; color: #94a3b8; margin-top: 24px; padding-top: 12px;
    border-top: 1px solid #e2e8f0;
  }
</style>
</head>
<body>

<!-- ═══════════ PAGE 1: EXECUTIVE SUMMARY ═══════════ -->
<div class="page">
  <div class="report-header">
    <h1>MediSync OPD Analytics Report</h1>
    <p>Date: <span id="rDate"></span> &nbsp;|&nbsp; Generated: ${new Date().toLocaleString()}</p>
  </div>

  <div class="summary-row">
    <div class="s-card blue"><h4>Total Patients</h4><div class="val" id="sTotalPatients"></div></div>
    <div class="s-card teal"><h4>Avg Waiting Time</h4><div class="val" id="sAvgWait"></div><div class="sub">minutes</div></div>
    <div class="s-card amber"><h4>Peak Hour</h4><div class="val" id="sPeakHour"></div><div class="sub" id="sPeakCount"></div></div>
    <div class="s-card pink"><h4>Top Symptom</h4><div class="val" id="sTopSymptom"></div><div class="sub" id="sTopSymptomCount"></div></div>
  </div>

  <div class="status-bar">
    <div class="status-pill"><span class="dot yellow"></span> Waiting: <strong id="sWaiting"></strong></div>
    <div class="status-pill"><span class="dot blue"></span> In Consultation: <strong id="sInConsult"></strong></div>
    <div class="status-pill"><span class="dot green"></span> Completed: <strong id="sCompleted"></strong></div>
    <div class="status-pill"><span class="dot red"></span> Cancelled: <strong id="sCancelled"></strong></div>
  </div>

  <div class="chart-section">
    <h2>1. Patient Load Over Time</h2>
    <div class="chart-wrap"><canvas id="chartPatientLoad"></canvas></div>
    <div class="insight" id="insightPatientLoad"></div>
  </div>
</div>

<!-- ═══════════ PAGE 2: CONSULTATION & WAITING ═══════════ -->
<div class="page">
  <div class="chart-section">
    <h2>2. Consultation Time Analysis (Doctor-wise)</h2>
    <div class="chart-wrap"><canvas id="chartConsultation"></canvas></div>
    <div class="insight" id="insightConsultation"></div>
  </div>

  <div class="chart-section">
    <h2>3. Waiting Time Analysis</h2>
    <div class="chart-wrap"><canvas id="chartWaiting"></canvas></div>
    <div class="insight" id="insightWaiting"></div>
  </div>
</div>

<!-- ═══════════ PAGE 3: DEMOGRAPHICS ═══════════ -->
<div class="page">
  <div class="chart-section">
    <h2>4. Age Distribution</h2>
    <div class="chart-wrap"><canvas id="chartAge"></canvas></div>
    <div class="insight" id="insightAge"></div>
  </div>

  <div class="chart-section">
    <h2>5. Symptom Frequency</h2>
    <div class="chart-wrap"><canvas id="chartSymptom"></canvas></div>
    <div class="insight" id="insightSymptom"></div>
  </div>
</div>

<!-- ═══════════ PAGE 4: DOCTOR PERFORMANCE ═══════════ -->
<div class="page">
  <div class="chart-section">
    <h2>6. Doctor Efficiency Matrix</h2>
    <div class="chart-wrap"><canvas id="chartEfficiency"></canvas></div>
    <div class="insight" id="insightEfficiency"></div>
  </div>

  <div class="chart-section">
    <h2>7. Peak Delay vs Doctor Availability</h2>
    <div class="chart-wrap"><canvas id="chartPeakDelay"></canvas></div>
    <div class="insight" id="insightPeakDelay"></div>
  </div>

  <div class="report-footer">MediSync OPD &mdash; Auto-generated daily analytics report</div>
</div>

<script>
const DATA = ${d};
const COLORS = ['#4F46E5','#0D9488','#D97706','#DC2626','#7C3AED','#2563EB','#059669','#EA580C','#BE185D','#4338CA'];

(function render() {
  const s = DATA.summary;

  // Summary
  document.getElementById('rDate').textContent = DATA.date;
  document.getElementById('sTotalPatients').textContent = s.totalPatients;
  document.getElementById('sAvgWait').textContent = s.avgWaitingTime;
  document.getElementById('sPeakHour').textContent = s.peakHour;
  document.getElementById('sPeakCount').textContent = s.peakHourCount + ' patients';
  document.getElementById('sTopSymptom').textContent = s.mostCommonSymptom;
  document.getElementById('sTopSymptomCount').textContent = s.mostCommonSymptomCount + ' cases';
  document.getElementById('sWaiting').textContent = s.waiting;
  document.getElementById('sInConsult').textContent = s.inConsultation;
  document.getElementById('sCompleted').textContent = s.completed;
  document.getElementById('sCancelled').textContent = s.cancelled;

  // Insights
  document.getElementById('insightPatientLoad').textContent = DATA.patientLoadOverTime.insight;
  document.getElementById('insightConsultation').textContent = DATA.consultationTimeAnalysis.insight;
  document.getElementById('insightWaiting').textContent = DATA.waitingTimeAnalysis.insight;
  document.getElementById('insightAge').textContent = DATA.ageDistribution.insight;
  document.getElementById('insightSymptom').textContent = DATA.symptomFrequency.insight;
  document.getElementById('insightEfficiency').textContent = DATA.doctorEfficiencyMatrix.insight;
  document.getElementById('insightPeakDelay').textContent = DATA.peakDelayVsAvailability.insight;

  const animOff = { animation: false, responsive: true, maintainAspectRatio: false };

  // 1. Patient Load — Line
  new Chart(document.getElementById('chartPatientLoad'), {
    type: 'line',
    data: {
      labels: DATA.patientLoadOverTime.labels,
      datasets: [{
        label: 'Patients',
        data: DATA.patientLoadOverTime.data,
        borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.12)',
        fill: true, tension: .3, pointRadius: 3,
      }]
    },
    options: { ...animOff, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Patients' } } } }
  });

  // 2. Consultation Time — Bar
  new Chart(document.getElementById('chartConsultation'), {
    type: 'bar',
    data: {
      labels: DATA.consultationTimeAnalysis.labels,
      datasets: [
        { label: 'Avg (min)', data: DATA.consultationTimeAnalysis.avgTimes, backgroundColor: '#4F46E5' },
        { label: 'Min', data: DATA.consultationTimeAnalysis.minTimes, backgroundColor: '#22c55e' },
        { label: 'Max', data: DATA.consultationTimeAnalysis.maxTimes, backgroundColor: '#ef4444' },
      ]
    },
    options: { ...animOff, scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } } }
  });

  // 3. Waiting Time — Bar
  new Chart(document.getElementById('chartWaiting'), {
    type: 'bar',
    data: {
      labels: DATA.waitingTimeAnalysis.labels,
      datasets: [
        { label: 'Avg Wait (min)', data: DATA.waitingTimeAnalysis.avgWaits, backgroundColor: '#d97706' },
        { label: 'Max Wait (min)', data: DATA.waitingTimeAnalysis.maxWaits, backgroundColor: '#ef4444' },
      ]
    },
    options: { ...animOff, scales: { y: { beginAtZero: true, title: { display: true, text: 'Minutes' } } } }
  });

  // 4. Age Distribution — Bar
  new Chart(document.getElementById('chartAge'), {
    type: 'bar',
    data: {
      labels: DATA.ageDistribution.labels,
      datasets: [{
        label: 'Patients',
        data: DATA.ageDistribution.data,
        backgroundColor: ['#7c3aed','#6366f1','#3b82f6','#0ea5e9','#0d9488','#059669'],
      }]
    },
    options: { ...animOff, plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } } }
  });

  // 5. Symptom Frequency — Doughnut
  new Chart(document.getElementById('chartSymptom'), {
    type: 'doughnut',
    data: {
      labels: DATA.symptomFrequency.labels,
      datasets: [{
        data: DATA.symptomFrequency.data,
        backgroundColor: COLORS.slice(0, DATA.symptomFrequency.labels.length),
      }]
    },
    options: { ...animOff, plugins: { legend: { position: 'right' } } }
  });

  // 6. Doctor Efficiency — Scatter
  const pts = DATA.doctorEfficiencyMatrix.points;
  new Chart(document.getElementById('chartEfficiency'), {
    type: 'scatter',
    data: {
      datasets: [{
        label: 'Doctors',
        data: pts.map(p => ({ x: p.patientsHandled, y: p.avgConsultationTime })),
        backgroundColor: pts.map((_, i) => COLORS[i % COLORS.length]),
        pointRadius: 8,
      }]
    },
    options: {
      ...animOff,
      scales: {
        x: { title: { display: true, text: 'Patients Handled' }, beginAtZero: true },
        y: { title: { display: true, text: 'Avg Consultation (min)' }, beginAtZero: true },
      },
      plugins: {
        tooltip: {
          callbacks: { label: ctx => pts[ctx.dataIndex] ? pts[ctx.dataIndex].name + ': ' + ctx.parsed.x + ' patients, ' + ctx.parsed.y + ' min' : '' }
        }
      }
    }
  });

  // 7. Peak Delay vs Availability — Mixed
  new Chart(document.getElementById('chartPeakDelay'), {
    type: 'bar',
    data: {
      labels: DATA.peakDelayVsAvailability.labels,
      datasets: [
        { type: 'bar', label: 'Patients', data: DATA.peakDelayVsAvailability.patientCounts, backgroundColor: '#6366f1', yAxisID: 'y' },
        { type: 'line', label: 'Avg Delay (min)', data: DATA.peakDelayVsAvailability.avgDelays, borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,.1)', fill: true, yAxisID: 'y1', tension: .3, pointRadius: 4 },
      ]
    },
    options: {
      ...animOff,
      scales: {
        y:  { beginAtZero: true, position: 'left',  title: { display: true, text: 'Patients' } },
        y1: { beginAtZero: true, position: 'right', title: { display: true, text: 'Delay (min)' }, grid: { drawOnChartArea: false } },
      }
    }
  });

  // Signal ready
  window.__chartsReady = true;
})();
</script>
</body>
</html>`;
}
