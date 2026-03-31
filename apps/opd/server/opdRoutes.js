import { Router } from "express";
import { requireAuth, requireRoles, login, verifyToken } from "./auth.js";
import * as service from "./opdService.js";
import * as repo from "./opdRepository.js";
import { subscribeHospital } from "./eventBus.js";

export const router = Router();

const HEARTBEAT_MS = 20_000;

/* ── Auth ────────────────────────────────────────────────────────── */

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      res.status(400).json({ error: "email, password, and role are required" });
      return;
    }
    const result = await login(email, password, role);
    if (!result) { res.status(401).json({ error: "Invalid credentials" }); return; }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Lookup (auth) ──────────────────────────────────────────────── */

router.get("/hospitals", async (_req, res) => {
  try {
    res.json(await repo.getHospitals());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/departments", requireAuth, async (req, res) => {
  try {
    res.json(await repo.getDepartments(req.user.hospitalId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/doctors", requireAuth, async (req, res) => {
  try {
    res.json(await repo.getDoctors(req.user.hospitalId, req.query.department || null));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Token operations ────────────────────────────────────────────── */

router.post("/tokens", requireAuth, requireRoles("opd_receptionist"), async (req, res) => {
  try {
    const token = await service.issueToken({
      hospitalId: req.user.hospitalId,
      departmentId: req.body.departmentId,
      doctorId: req.body.doctorId,
      patientName: req.body.patientName,
      patientAge: req.body.patientAge,
      patientGender: req.body.patientGender,
      patientPhone: req.body.patientPhone,
      priority: req.body.priority,
    });
    res.status(201).json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get("/tokens", requireAuth, async (req, res) => {
  try {
    const tokens = await repo.getTokensByHospital(req.user.hospitalId, {
      status: req.query.status,
      departmentId: req.query.departmentId,
      doctorId: req.query.doctorId,
      date: req.query.date,
    });
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tokens/call-next", requireAuth, requireRoles("doctor"), async (req, res) => {
  try {
    const { departmentId, doctorId } = req.body;
    if (!departmentId) { res.status(400).json({ error: "departmentId required" }); return; }
    const token = await service.callNextToken(req.user.hospitalId, departmentId, doctorId || null);
    if (!token) { res.status(404).json({ error: "No waiting tokens in this department" }); return; }
    res.json(token);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/tokens/:id/call", requireAuth, requireRoles("doctor"), async (req, res) => {
  try {
    res.json(await service.callToken(req.params.id, req.body.doctorId || null));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/tokens/:id/complete", requireAuth, requireRoles("doctor"), async (req, res) => {
  try {
    res.json(await service.completeToken(req.params.id, req.body.notes));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/tokens/:id/skip", requireAuth, requireRoles("doctor", "opd_receptionist"), async (req, res) => {
  try {
    res.json(await service.skipToken(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/tokens/:id/cancel", requireAuth, requireRoles("opd_receptionist"), async (req, res) => {
  try {
    res.json(await service.cancelToken(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ── Stats (auth) ────────────────────────────────────────────────── */

router.get("/stats", requireAuth, async (req, res) => {
  try {
    res.json(await repo.getQueueStats(req.user.hospitalId, req.query.date));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Public display ──────────────────────────────────────────────── */

router.get("/display/:hospitalId", async (req, res) => {
  try {
    const [tokens, stats] = await Promise.all([
      repo.getDisplayData(req.params.hospitalId),
      repo.getQueueStats(req.params.hospitalId),
    ]);
    res.json({ tokens, stats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── SSE: public display stream ──────────────────────────────────── */

function initSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

router.get("/display/:hospitalId/stream", (req, res) => {
  initSSE(res);

  const send = (event) => { res.write(`data: ${JSON.stringify(event)}\n\n`); };
  const unsubscribe = subscribeHospital(req.params.hospitalId, send);
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", ts: Date.now() })}\n\n`);
  }, HEARTBEAT_MS);

  req.on("close", () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
});

/* ── SSE: authenticated stream (reception / doctor panels) ───────── */
// EventSource can't set headers, so accept ?token= query param too

router.get("/events", (req, res) => {
  const header = req.headers.authorization || "";
  const bearerToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  const rawToken = bearerToken || queryToken;

  const user = rawToken ? verifyToken(rawToken) : null;
  if (!user) { res.status(401).json({ error: "Unauthorized" }); return; }
  req.user = user;

  initSSE(res);

  const send = (event) => { res.write(`data: ${JSON.stringify(event)}\n\n`); };
  const unsubscribe = subscribeHospital(req.user.hospitalId, send);
  const heartbeat = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", ts: Date.now() })}\n\n`);
  }, HEARTBEAT_MS);

  req.on("close", () => { clearInterval(heartbeat); unsubscribe(); res.end(); });
});
