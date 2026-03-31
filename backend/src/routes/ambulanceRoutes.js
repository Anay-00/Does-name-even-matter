import { Router } from "express";
import {
  dispatchAmbulance,
  listAmbulanceFleet,
  patchAmbulanceLocation,
  registerAmbulance
} from "../controllers/ambulanceController.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createAmbulanceSchema,
  dispatchAmbulanceSchema,
  updateAmbulanceLocationSchema
} from "../validators/networkValidators.js";

export const ambulanceRouter = Router();

ambulanceRouter.use(requireAuth);
ambulanceRouter.use(requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "ambulance_provider_operator"));

ambulanceRouter.get("/fleet", listAmbulanceFleet);
ambulanceRouter.post("/fleet", validateBody(createAmbulanceSchema), registerAmbulance);
ambulanceRouter.patch("/:id/location", validateBody(updateAmbulanceLocationSchema), patchAmbulanceLocation);
ambulanceRouter.post("/:id/dispatch", validateBody(dispatchAmbulanceSchema), dispatchAmbulance);
