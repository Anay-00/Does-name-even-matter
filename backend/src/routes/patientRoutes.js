import { Router } from "express";
import { getProfile, listNotifications, updateProfile } from "../controllers/patientController.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { updateProfileSchema } from "../validators/patientValidators.js";

export const patientRouter = Router();

patientRouter.get("/profile", requireAuth, requireRoles("patient"), getProfile);
patientRouter.put("/profile", requireAuth, requireRoles("patient"), validateBody(updateProfileSchema), updateProfile);
patientRouter.get("/notifications", requireAuth, requireRoles("patient"), listNotifications);