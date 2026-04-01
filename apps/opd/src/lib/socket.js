import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  return socket;
}

export function connectSocket(token) {
  if (socket?.connected) return socket;

  socket = io("/", {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on("connect", () => {
    console.log("[Socket] connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("[Socket] disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] connect error:", err.message);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinHospital(hospitalId) {
  if (socket) socket.emit("join:hospital", hospitalId);
}

export function joinDoctor(doctorId) {
  if (socket) socket.emit("join:doctor", doctorId);
}

export function joinReception(hospitalId) {
  if (socket) socket.emit("join:reception", hospitalId);
}
