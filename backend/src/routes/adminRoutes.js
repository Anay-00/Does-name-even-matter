import { Router } from "express";
import {
  approveHospital,
  createHospital,
  createProvider,
  getCityOverview,
  listHospitals,
  listProviders
} from "../controllers/adminController.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import { onboardHospitalSchema, onboardProviderSchema } from "../validators/networkValidators.js";

export const adminRouter = Router();

adminRouter.use(requireAuth);
adminRouter.use(requireRoles("super_admin", "admin"));

adminRouter.get("/overview", getCityOverview);
adminRouter.get("/hospitals", listHospitals);
adminRouter.post("/hospitals", validateBody(onboardHospitalSchema), createHospital);
adminRouter.post("/hospitals/:id/approve", approveHospital);

adminRouter.get("/ambulance-providers", listProviders);
adminRouter.post("/ambulance-providers", validateBody(onboardProviderSchema), createProvider);
