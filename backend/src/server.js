import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import compression from "compression";
import path from "path";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/errorHandler.js";
import { requestIdMiddleware } from "./middlewares/requestIdMiddleware.js";
import { apiRouter } from "./routes/index.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));
app.use(requestIdMiddleware);
app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

app.get("/", (_req, res) => {
  res.json({
    service: "MediSync API",
    status: "ok",
    version: "v1"
  });
});

app.use("/api/v1", apiRouter);
app.use(errorHandler);

const server = app.listen(env.PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`MediSync backend running on port ${env.PORT}`);
});

server.on("error", (error) => {
  if (error && error.code === "EADDRINUSE") {
    // eslint-disable-next-line no-console
    console.error(`Port ${env.PORT} is already in use. Stop the existing process or set PORT to a free value.`);
    process.exit(1);
  }

  // eslint-disable-next-line no-console
  console.error("Server failed to start", error);
  process.exit(1);
});
