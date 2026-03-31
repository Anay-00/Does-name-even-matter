import { EventEmitter } from "events";
import { supabaseAdmin } from "../config/supabase.js";

const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(200);

const RECENT_EVENT_TTL_MS = 30_000;
const recentEventKeys = new Map();

let bridgeInitialized = false;

function cleanupRecentEventKeys(now = Date.now()) {
  for (const [eventKey, expiresAt] of recentEventKeys.entries()) {
    if (expiresAt <= now) {
      recentEventKeys.delete(eventKey);
    }
  }
}

function markEventSeen(eventKey, now = Date.now()) {
  if (!eventKey) {
    return;
  }
  cleanupRecentEventKeys(now);
  recentEventKeys.set(eventKey, now + RECENT_EVENT_TTL_MS);
}

function hasSeenEvent(eventKey, now = Date.now()) {
  if (!eventKey) {
    return false;
  }
  cleanupRecentEventKeys(now);
  const expiresAt = recentEventKeys.get(eventKey);
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function mapAllocationEventRow(row) {
  const payload = row.event_payload || {};
  return {
    id: row.id,
    type: row.event_type,
    payload,
    eventKey: payload?.eventKey || null,
    createdAt: row.created_at
  };
}

function ensureRealtimeBridge() {
  if (bridgeInitialized) {
    return;
  }

  bridgeInitialized = true;
  supabaseAdmin
    .channel("allocation-events-bridge")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "allocation_events"
      },
      (payload) => {
        if (!payload?.new) {
          return;
        }
        const mapped = mapAllocationEventRow(payload.new);
        if (hasSeenEvent(mapped.eventKey)) {
          return;
        }
        markEventSeen(mapped.eventKey);
        eventEmitter.emit("event", mapped);
      }
    )
    .subscribe();
}

export function publishRealtimeEvent(type, payload = {}) {
  ensureRealtimeBridge();

  const eventKey = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const payloadWithEventKey = {
    ...payload,
    eventKey
  };

  const fallbackEvent = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    payload: payloadWithEventKey,
    eventKey,
    createdAt: new Date().toISOString()
  };

  // Emit immediately to avoid waiting for DB roundtrip/subscription latency.
  markEventSeen(eventKey);
  eventEmitter.emit("event", fallbackEvent);

  void (async () => {
    const requestId = typeof payloadWithEventKey?.requestId === "string" ? payloadWithEventKey.requestId : null;
    const { data, error } = await supabaseAdmin
      .from("allocation_events")
      .insert({
        emergency_request_id: requestId,
        event_type: type,
        event_payload: payloadWithEventKey
      })
      .select("id,event_type,event_payload,created_at")
      .single();

    // If DB write fails, retry immediate emit for safety in case the stream disconnected.
    if (error || !data) {
      markEventSeen(eventKey);
      eventEmitter.emit("event", fallbackEvent);
    }
  })();

  return fallbackEvent;
}

export function subscribeRealtime(listener) {
  ensureRealtimeBridge();
  eventEmitter.on("event", listener);
  return () => {
    eventEmitter.off("event", listener);
  };
}
