import { Server } from "socket.io";
import { verifyToken } from "./auth.js";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: { origin: true, credentials: true },
    path: "/socket.io",
  });

  // Auth middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        socket.user = payload;
      }
    }
    // Allow unauthenticated connections (display board)
    next();
  });

  io.on("connection", (socket) => {
    const user = socket.user;
    const label = user ? `${user.role}/${user.email}` : "anonymous";
    console.log(`[Socket] connected: ${label} (${socket.id})`);

    // Join hospital room (for display board and general updates)
    socket.on("join:hospital", (hospitalId) => {
      if (hospitalId) {
        socket.join(`hospital:${hospitalId}`);
        console.log(`[Socket] ${label} joined hospital:${hospitalId}`);
      }
    });

    // Join doctor room (doctor panel)
    socket.on("join:doctor", (doctorId) => {
      if (doctorId && user?.role === "doctor") {
        socket.join(`doctor:${doctorId}`);
        console.log(`[Socket] ${label} joined doctor:${doctorId}`);
      }
    });

    // Join reception room
    socket.on("join:reception", (hospitalId) => {
      if (hospitalId && user?.role === "receptionist") {
        socket.join(`reception:${hospitalId}`);
        console.log(`[Socket] ${label} joined reception:${hospitalId}`);
      }
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] disconnected: ${label}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/* ── Emit helpers ───────────────────────────────────────────────── */

export function emitToHospital(hospitalId, event, data) {
  if (!io) return;
  io.to(`hospital:${hospitalId}`).emit(event, data);
}

export function emitToDoctor(doctorId, event, data) {
  if (!io) return;
  io.to(`doctor:${doctorId}`).emit(event, data);
}

export function emitToReception(hospitalId, event, data) {
  if (!io) return;
  io.to(`reception:${hospitalId}`).emit(event, data);
}

/**
 * Broadcast a queue update to all relevant rooms.
 */
export function broadcastQueueUpdate(hospitalId, doctorId, eventType, payload) {
  emitToHospital(hospitalId, "queue:update", { type: eventType, ...payload });
  emitToDoctor(doctorId, "queue:update", { type: eventType, ...payload });
  emitToReception(hospitalId, "queue:update", { type: eventType, ...payload });
}
