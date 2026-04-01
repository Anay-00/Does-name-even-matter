import { Router } from "express";
import { requireAuth, requireRoles, login, getLoginOptions } from "./auth.js";
import * as service from "./opdService.js";
import * as repo from "./opdRepository.js";
import { broadcastQueueUpdate } from "./socketManager.js";

export const router = Router();

/* ── Auth ────────────────────────────────────────────────────────── */

router.get("/auth/options", (_req, res) => {
  res.json(getLoginOptions());
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password are required" });
    const result = await login(email, password);
    if (!result) return res.status(401).json({ error: "Invalid credentials" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Lookup ──────────────────────────────────────────────────────── */

router.get("/hospitals", async (_req, res) => {
  try {
    res.json(await repo.getActiveHospitals());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/symptoms", (_req, res) => {
  res.json(service.getSymptomOptions());
});

router.get("/departments", requireAuth, async (req, res) => {
  try {
    res.json(await repo.getDepartmentsByHospital(req.user.hospitalId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/doctors", requireAuth, async (req, res) => {
  try {
    res.json(await repo.getDoctorsByHospital(req.user.hospitalId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Token: issue (receptionist) ─────────────────────────────────── */

router.post("/tokens", requireAuth, requireRoles("receptionist"), async (req, res) => {
  try {
    const result = await service.issueToken({
      hospitalId: req.user.hospitalId,
      patientName: req.body.patientName,
      patientMobile: req.body.patientMobile,
      symptomCategory: req.body.symptomCategory,
      priorityReason: req.body.priorityReason || null,
    });

    // Broadcast to all relevant Socket.IO rooms
    broadcastQueueUpdate(req.user.hospitalId, result.doctor.id, "token_issued", {
      token: result.token,
      doctor: result.doctor,
      department: result.department,
    });

    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ── Token: start consultation (doctor) ──────────────────────────── */

router.patch("/tokens/:id/start", requireAuth, requireRoles("doctor"), async (req, res) => {
  try {
    const updated = await service.startConsultation(req.params.id, req.user.doctorId);

    broadcastQueueUpdate(req.user.hospitalId, req.user.doctorId, "consultation_started", {
      token: updated,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ── Token: complete consultation (doctor) ───────────────────────── */

router.patch("/tokens/:id/complete", requireAuth, requireRoles("doctor"), async (req, res) => {
  try {
    const result = await service.completeConsultation(req.params.id, req.user.doctorId);

    broadcastQueueUpdate(req.user.hospitalId, req.user.doctorId, "consultation_completed", {
      completed: result.completed,
      nextPatient: result.nextPatient,
    });

    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ── Token: cancel (receptionist) ────────────────────────────────── */

router.patch("/tokens/:id/cancel", requireAuth, requireRoles("receptionist"), async (req, res) => {
  try {
    const updated = await service.cancelToken(req.params.id);

    broadcastQueueUpdate(req.user.hospitalId, updated.doctor_id, "token_cancelled", {
      token: updated,
    });

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/* ── Doctor panel state ──────────────────────────────────────────── */

router.get("/doctor/panel", requireAuth, requireRoles("doctor"), async (req, res) => {
  try {
    res.json(await service.getDoctorPanelState(req.user.doctorId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Reception panel state ───────────────────────────────────────── */

router.get("/reception/panel", requireAuth, requireRoles("receptionist"), async (req, res) => {
  try {
    res.json(await service.getReceptionState(req.user.hospitalId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ── Public display (no auth) ────────────────────────────────────── */

router.get("/display/:hospitalId", async (req, res) => {
  try {
    res.json(await service.getDisplayState(req.params.hospitalId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
