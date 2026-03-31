import { Router } from "express";
import { createRequest, listActive, listHistory } from "../controllers/patientController.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { createPatientRequestSchema } from "../validators/patientValidators.js";

export const requestRouter = Router();

requestRouter.post("/", requireAuth, requireRoles("patient"), validateBody(createPatientRequestSchema), createRequest);
requestRouter.get("/active", requireAuth, requireRoles("patient"), listActive);
requestRouter.get("/history", requireAuth, requireRoles("patient"), listHistory);