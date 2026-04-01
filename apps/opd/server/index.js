import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config.js";
import { router } from "./opdRoutes.js";
import { analyticsRouter } from "./analyticsRoutes.js";
import { initSocket } from "./socketManager.js";

const app = express();
const server = http.createServer(app);

// Initialize Socket.IO on the same HTTP server
initSocket(server);

app.use(helmet());
app.use(cors({
  origin: env.CORS_ORIGIN.length > 0 ? env.CORS_ORIGIN : true,
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ service: "MediSync OPD Queue API v2", status: "ok" });
});

app.use("/api", router);
app.use("/api/analytics", analyticsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

server.listen(env.PORT, () => {
  console.log(`OPD server running on port ${env.PORT} (HTTP + WebSocket)`);
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use.`);
    process.exit(1);
  }
  console.error("Server failed to start", error);
  process.exit(1);
});
