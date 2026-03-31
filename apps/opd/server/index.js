import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import { env } from "./config.js";
import { router } from "./opdRoutes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (_req, res) => {
  res.json({ service: "MediSync OPD Queue API", status: "ok" });
});

app.use("/api", router);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

const server = app.listen(env.PORT, () => {
  console.log(`OPD server running on port ${env.PORT}`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    console.error(`Port ${env.PORT} is already in use.`);
    process.exit(1);
  }
  console.error("Server failed to start", error);
  process.exit(1);
});
