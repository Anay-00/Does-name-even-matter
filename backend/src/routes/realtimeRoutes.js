import { Router } from "express";
import { subscribeRealtime } from "../realtime/eventBus.js";
import { verifyAccessToken } from "../services/tokenService.js";
import { env } from "../config/env.js";

export const realtimeRouter = Router();

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PUBLIC_STREAM_IDS = 10;
const HEARTBEAT_MS = 20_000;

function resolveToken(req) {
  const header = req.headers.authorization || "";
  if (header.startsWith("Bearer ")) {
    return header.slice(7);
  }
  const queryToken = typeof req.query.token === "string" ? req.query.token : null;
  return queryToken;
}

function isAllowedRole(role) {
  return ["super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "doctor", "nurse"].includes(role);
}

function initSSE(res) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();
}

function startHeartbeat(res) {
  return setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: "heartbeat", payload: { ts: Date.now() } })}\n\n`);
  }, HEARTBEAT_MS);
}

// ── Hospital-scoped SSE (authenticated) ──────────────────────────────
realtimeRouter.get("/events", (req, res) => {
    const token = resolveToken(req);
    const user = token ? verifyAccessToken(token) : null;
    if (!user || !isAllowedRole(user.role)) {
      res.status(401).json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } });
      return;
    }

    initSSE(res);

    const hospitalId = user.hospitalId || null;
    const hospitalCode = user.hospitalCode || null;
    const isGlobalObserver = ["super_admin", "admin"].includes(user.role) || env.GLOBAL_OBSERVER_HOSPITAL_CODES.includes(hospitalCode);

    const send = (event) => {
      const scopedHospitalId = event?.payload?.assignedHospitalId || event?.payload?.hospitalId || null;
      if (!isGlobalObserver && hospitalId && scopedHospitalId && scopedHospitalId !== hospitalId) {
        return;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = subscribeRealtime(send);
    const heartbeat = startHeartbeat(res);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }
);

// ── Public request-scoped SSE (no auth — patients track by requestId) ─
realtimeRouter.get("/events/stream", (req, res) => {
    const raw = typeof req.query.requestIds === "string" ? req.query.requestIds : "";
    const requestIds = raw.split(",").map((s) => s.trim()).filter(Boolean).slice(0, MAX_PUBLIC_STREAM_IDS);

    if (requestIds.length === 0) {
      res.status(400).json({ error: { message: "requestIds query parameter required", code: "MISSING_REQUEST_IDS" } });
      return;
    }

    if (!requestIds.every((id) => UUID_RE.test(id))) {
      res.status(400).json({ error: { message: "Invalid requestId format", code: "INVALID_REQUEST_ID" } });
      return;
    }

    initSSE(res);

    const allowedIds = new Set(requestIds);

    const send = (event) => {
      const eventRequestId = event?.payload?.requestId;
      if (!eventRequestId || !allowedIds.has(eventRequestId)) {
        return;
      }
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };

    const unsubscribe = subscribeRealtime(send);
    const heartbeat = startHeartbeat(res);

    req.on("close", () => {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    });
  }
);
