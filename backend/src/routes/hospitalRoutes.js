import { Router } from "express";
import {
  createManualEmergencyRequest,
  getCommandCenter,
  getHospitalRequestDetails,
  listHospitalRequests,
  retryEmergencyAllocation,
  respondToEmergencyRequest
} from "../controllers/hospitalController.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import {
  createEmergencySchema,
  hospitalResponseSchema,
  retryAllocationSchema
} from "../validators/emergencyValidators.js";

export const hospitalRouter = Router();

hospitalRouter.get(
  "/command-center",
  requireAuth,
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "doctor", "nurse"),
  getCommandCenter
);

hospitalRouter.get(
  "/requests",
  requireAuth,
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "doctor", "nurse"),
  listHospitalRequests
);

hospitalRouter.get(
  "/requests/:id",
  requireAuth,
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "doctor", "nurse"),
  getHospitalRequestDetails
);

hospitalRouter.post(
  "/requests/manual",
  requireAuth,
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator"),
  validateBody(createEmergencySchema),
  createManualEmergencyRequest
);

hospitalRouter.post(
  "/requests/:id/retry",
  requireAuth,
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator"),
  validateBody(retryAllocationSchema),
  retryEmergencyAllocation
);

hospitalRouter.post(
  "/requests/:id/respond",
  requireAuth,
  requireRoles("hospital_admin_staff", "dispatch_operator", "doctor", "nurse"),
  validateBody(hospitalResponseSchema),
  respondToEmergencyRequest
);
