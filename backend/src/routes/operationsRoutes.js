import { Router } from "express";
import {
  addDoctorShift,
  addBillingService,
  addBloodBankIssue,
  addBloodBankUnit,
  addDoctor,
  addInsuranceClaim,
  addLabSample,
  addOtConsumable,
  addOtSchedule,
  addPharmacyInventory,
  addPharmacyIssue,
  addRoomAllotment,
  closeRoomAllotment,
  getBillingInvoices,
  getBloodBankIssues,
  getBloodBankUnits,
  getDoctorShifts,
  getBilling,
  getDoctors,
  getInsuranceClaims,
  getLabSamples,
  getOtConsumables,
  getOtSchedules,
  getPharmacyInventory,
  getPharmacyIssues,
  getRoomAllotments,
  updateBillingTax
} from "../controllers/operationsController.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import { validateBody } from "../middlewares/validate.js";
import {
  bloodBankIssueSchema,
  bloodBankUnitSchema,
  billingServiceSchema,
  createDoctorShiftSchema,
  createDoctorSchema,
  dischargeRoomSchema,
  createRoomAllotmentSchema,
  insuranceClaimSchema,
  labSampleSchema,
  otConsumableSchema,
  otScheduleSchema,
  pharmacyInventorySchema,
  pharmacyIssueSchema,
  updateTaxSchema
} from "../validators/operationsValidators.js";

export const operationsRouter = Router();

operationsRouter.use(requireAuth);
operationsRouter.use(
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "doctor", "nurse")
);

operationsRouter.get("/doctors", getDoctors);
operationsRouter.post("/doctors", validateBody(createDoctorSchema), addDoctor);
operationsRouter.get("/doctor-shifts", getDoctorShifts);
operationsRouter.post("/doctor-shifts", validateBody(createDoctorShiftSchema), addDoctorShift);

operationsRouter.get("/room-allotments", getRoomAllotments);
operationsRouter.post("/room-allotments", validateBody(createRoomAllotmentSchema), addRoomAllotment);
operationsRouter.patch("/room-allotments/:id/discharge", validateBody(dischargeRoomSchema), closeRoomAllotment);

operationsRouter.get("/lab-samples", getLabSamples);
operationsRouter.post("/lab-samples", validateBody(labSampleSchema), addLabSample);

operationsRouter.get("/ot-schedules", getOtSchedules);
operationsRouter.post("/ot-schedules", validateBody(otScheduleSchema), addOtSchedule);
operationsRouter.get("/ot-consumables", getOtConsumables);
operationsRouter.post("/ot-consumables", validateBody(otConsumableSchema), addOtConsumable);

operationsRouter.get("/pharmacy-inventory", getPharmacyInventory);
operationsRouter.post("/pharmacy-inventory", validateBody(pharmacyInventorySchema), addPharmacyInventory);
operationsRouter.get("/pharmacy-issues", getPharmacyIssues);
operationsRouter.post("/pharmacy-issues", validateBody(pharmacyIssueSchema), addPharmacyIssue);

operationsRouter.get("/insurance-claims", getInsuranceClaims);
operationsRouter.post("/insurance-claims", validateBody(insuranceClaimSchema), addInsuranceClaim);

operationsRouter.get("/billing", getBilling);
operationsRouter.get("/billing/invoices", getBillingInvoices);
operationsRouter.post("/billing/services", validateBody(billingServiceSchema), addBillingService);
operationsRouter.put("/billing/tax", validateBody(updateTaxSchema), updateBillingTax);

operationsRouter.get("/blood-bank/units", getBloodBankUnits);
operationsRouter.post("/blood-bank/units", validateBody(bloodBankUnitSchema), addBloodBankUnit);
operationsRouter.get("/blood-bank/issues", getBloodBankIssues);
operationsRouter.post("/blood-bank/issues", validateBody(bloodBankIssueSchema), addBloodBankIssue);
