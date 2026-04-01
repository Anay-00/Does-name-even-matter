import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Bar, Doughnut, Scatter } from "react-chartjs-2";
import "./DashboardPage.css";

// Register Chart.js modules
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Title, Tooltip, Legend, Filler);

const COLORS = ["#4F46E5", "#0D9488", "#D97706", "#DC2626", "#7C3AED", "#2563EB", "#059669", "#EA580C", "#BE185D", "#4338CA"];

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalId, setHospitalId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [downloading, setDownloading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const intervalRef = useRef(null);

  // Fetch hospital list on mount
  useEffect(() => {
    fetch("/api/hospitals")
      .then((r) => r.json())
      .then((list) => {
        setHospitals(list || []);
        if (list?.length > 0) setHospitalId(list[0].id);
      })
      .catch(() => {});
  }, []);

  // Fetch analytics data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (hospitalId) params.set("hospitalId", hospitalId);
      const res = await fetch(`/api/analytics/dashboard-data?${params}`);
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date, hospitalId]);

  useEffect(() => {
    if (hospitalId) fetchData();
  }, [fetchData, hospitalId]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(fetchData, 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchData]);

  // Download PDF
  async function handleDownloadPdf() {
    try {
      setDownloading(true);
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (hospitalId) params.set("hospitalId", hospitalId);
      const res = await fetch(`/api/analytics/generate-pdf?${params}`);
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `opd-analytics-${date}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("PDF download failed: " + err.message);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="analytics-dashboard">
      {/* ─── Header ─── */}
      <div className="dashboard-header">
        <h1>OPD Analytics Dashboard</h1>
        <div className="dashboard-controls">
          <select value={hospitalId} onChange={(e) => setHospitalId(e.target.value)}>
            {hospitals.map((h) => (
              <option key={h.id} value={h.id}>{h.name} ({h.code})</option>
            ))}
          </select>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <button className="btn-refresh" onClick={fetchData} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button className="btn-download" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? "Generating..." : "Download PDF"}
          </button>
          <label className="auto-toggle">
            <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
            Auto (30s)
          </label>
        </div>
      </div>

      <div className="dashboard-body">
        {error && <div className="error-banner">Error: {error}</div>}

        {loading && !data ? (
          <div className="loading-overlay">
            <div className="spinner" />
            <div className="loading-text">Fetching analytics...</div>
          </div>
        ) : data ? (
          <>
            {/* ─── Summary Cards ─── */}
            <div className="summary-cards">
              <div className="summary-card blue">
                <h3>Total Patients</h3>
                <div className="value">{data.summary.totalPatients}</div>
              </div>
              <div className="summary-card teal">
                <h3>Avg Waiting Time</h3>
                <div className="value">{data.summary.avgWaitingTime} <span style={{ fontSize: 14, fontWeight: 400 }}>min</span></div>
              </div>
              <div className="summary-card amber">
                <h3>Peak Hour</h3>
                <div className="value">{data.summary.peakHour}</div>
                <div className="sub">{data.summary.peakHourCount} patients</div>
              </div>
              <div className="summary-card pink">
                <h3>Top Symptom</h3>
                <div className="value">{data.summary.mostCommonSymptom}</div>
                <div className="sub">{data.summary.mostCommonSymptomLabel} — {data.summary.mostCommonSymptomCount} cases</div>
              </div>
            </div>

            {/* ─── Status Row ─── */}
            <div className="status-row">
              <div className="status-pill"><span className="dot yellow" /> Waiting: <strong>{data.summary.waiting}</strong></div>
              <div className="status-pill"><span className="dot blue" /> In Consultation: <strong>{data.summary.inConsultation}</strong></div>
              <div className="status-pill"><span className="dot green" /> Completed: <strong>{data.summary.completed}</strong></div>
              <div className="status-pill"><span className="dot red" /> Cancelled: <strong>{data.summary.cancelled}</strong></div>
            </div>

            {/* ─── Charts ─── */}
            <div className="charts-grid">
              <PatientLoadChart d={data.patientLoadOverTime} />
              <ConsultationTimeChart d={data.consultationTimeAnalysis} />
              <WaitingTimeChart d={data.waitingTimeAnalysis} />
              <AgeDistributionChart d={data.ageDistribution} />
              <SymptomFrequencyChart d={data.symptomFrequency} />
              <DoctorEfficiencyChart d={data.doctorEfficiencyMatrix} />
              <PeakDelayChart d={data.peakDelayVsAvailability} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   Chart Components
   ══════════════════════════════════════════════════════════════════ */

function ChartCard({ title, children, insight, fullWidth }) {
  return (
    <div className={`chart-card${fullWidth ? " full-width" : ""}`}>
      <h2>{title}</h2>
      <div className="chart-container">{children}</div>
      <div className="insight-box">{insight}</div>
    </div>
  );
}

function PatientLoadChart({ d }) {
  return (
    <ChartCard title="1. Patient Load Over Time" insight={d.insight}>
      <Line
        data={{
          labels: d.labels,
          datasets: [{
            label: "Patients",
            data: d.data,
            borderColor: "#2563eb",
            backgroundColor: "rgba(37,99,235,.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 3,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, title: { display: true, text: "Patients" } } },
        }}
      />
    </ChartCard>
  );
}

function ConsultationTimeChart({ d }) {
  return (
    <ChartCard title="2. Consultation Time (Doctor-wise)" insight={d.insight}>
      <Bar
        data={{
          labels: d.labels,
          datasets: [
            { label: "Avg (min)", data: d.avgTimes, backgroundColor: "#4F46E5" },
            { label: "Min", data: d.minTimes, backgroundColor: "#22c55e" },
            { label: "Max", data: d.maxTimes, backgroundColor: "#ef4444" },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, title: { display: true, text: "Minutes" } } },
        }}
      />
    </ChartCard>
  );
}

function WaitingTimeChart({ d }) {
  return (
    <ChartCard title="3. Waiting Time Analysis" insight={d.insight}>
      <Bar
        data={{
          labels: d.labels,
          datasets: [
            { label: "Avg Wait (min)", data: d.avgWaits, backgroundColor: "#d97706" },
            { label: "Max Wait (min)", data: d.maxWaits, backgroundColor: "#ef4444" },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: { y: { beginAtZero: true, title: { display: true, text: "Minutes" } } },
        }}
      />
    </ChartCard>
  );
}

function AgeDistributionChart({ d }) {
  return (
    <ChartCard title="4. Age Distribution" insight={d.insight}>
      <Bar
        data={{
          labels: d.labels,
          datasets: [{
            label: "Patients",
            data: d.data,
            backgroundColor: ["#7c3aed", "#6366f1", "#3b82f6", "#0ea5e9", "#0d9488", "#059669"],
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: { y: { beginAtZero: true, title: { display: true, text: "Count" } } },
        }}
      />
    </ChartCard>
  );
}

function SymptomFrequencyChart({ d }) {
  return (
    <ChartCard title="5. Symptom Frequency" insight={d.insight}>
      <Doughnut
        data={{
          labels: d.labels,
          datasets: [{
            data: d.data,
            backgroundColor: COLORS.slice(0, d.labels.length),
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "right" } },
        }}
      />
    </ChartCard>
  );
}

function DoctorEfficiencyChart({ d }) {
  const pts = d.points;
  return (
    <ChartCard title="6. Doctor Efficiency Matrix" insight={d.insight}>
      <Scatter
        data={{
          datasets: [{
            label: "Doctors",
            data: pts.map((p) => ({ x: p.patientsHandled, y: p.avgConsultationTime })),
            backgroundColor: pts.map((_, i) => COLORS[i % COLORS.length]),
            pointRadius: 8,
          }],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: { title: { display: true, text: "Patients Handled" }, beginAtZero: true },
            y: { title: { display: true, text: "Avg Consultation (min)" }, beginAtZero: true },
          },
          plugins: {
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const p = pts[ctx.dataIndex];
                  return p ? `${p.name}: ${ctx.parsed.x} patients, ${ctx.parsed.y} min` : "";
                },
              },
            },
          },
        }}
      />
    </ChartCard>
  );
}

function PeakDelayChart({ d }) {
  return (
    <ChartCard title="7. Peak Delay vs Doctor Availability" insight={d.insight} fullWidth>
      <Bar
        data={{
          labels: d.labels,
          datasets: [
            {
              type: "bar",
              label: "Patients",
              data: d.patientCounts,
              backgroundColor: "#6366f1",
              yAxisID: "y",
            },
            {
              type: "line",
              label: "Avg Delay (min)",
              data: d.avgDelays,
              borderColor: "#ef4444",
              backgroundColor: "rgba(239,68,68,.08)",
              fill: true,
              tension: 0.3,
              pointRadius: 4,
              yAxisID: "y1",
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: { beginAtZero: true, position: "left", title: { display: true, text: "Patients" } },
            y1: {
              beginAtZero: true,
              position: "right",
              title: { display: true, text: "Delay (min)" },
              grid: { drawOnChartArea: false },
            },
          },
        }}
      />
    </ChartCard>
  );
}
