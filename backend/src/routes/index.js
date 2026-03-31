import { Router } from "express";
import { healthRouter } from "./healthRoutes.js";
import { authRouter } from "./authRoutes.js";
import { emergencyRouter } from "./emergencyRoutes.js";
import { hospitalRouter } from "./hospitalRoutes.js";
import { realtimeRouter } from "./realtimeRoutes.js";
import { operationsRouter } from "./operationsRoutes.js";
import { adminRouter } from "./adminRoutes.js";
import { ambulanceRouter } from "./ambulanceRoutes.js";
import { patientRouter } from "./patientRoutes.js";
import { requestRouter } from "./requestRoutes.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use("/auth", authRouter);
apiRouter.use("/patient", patientRouter);
apiRouter.use("/requests", requestRouter);
apiRouter.use("/emergency", emergencyRouter);
apiRouter.use("/hospital", hospitalRouter);
apiRouter.use("/operations", operationsRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/ambulance", ambulanceRouter);
apiRouter.use(realtimeRouter);
