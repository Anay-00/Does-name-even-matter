import { z } from "zod";

const departmentEnum = z.enum([
  "General Medicine",
  "Emergency",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "Gynecology",
  "Radiology",
  "Surgery"
]);

const specializationEnum = z.enum([
  "General Physician",
  "Emergency Medicine",
  "Cardiologist",
  "Neurologist",
  "Orthopedic Surgeon",
  "Pediatrician",
  "Gynecologist",
  "Radiologist",
  "Anesthesiologist"
]);

const roomNumberEnum = z.enum([
  "ER-01",
  "ER-02",
  "ICU-01",
  "ICU-02",
  "GW-101",
  "GW-102",
  "GW-103",
  "PW-201",
  "PW-202",
  "PW-203"
]);

export const createDoctorSchema = z.object({
  firstName: z.string().min(2),
  middleName: z.string().optional().default(""),
  lastName: z.string().min(1),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(4),
  bloodGroup: z.string().optional().default(""),
  email: z.string().email(),
  mobile: z.string().min(10).max(15),
  alternateContact: z.string().optional().default(""),
  address: z.string().optional().default(""),
  department: departmentEnum,
  specialization: specializationEnum
});

export const createRoomAllotmentSchema = z.object({
  patientName: z.string().min(2),
  patientId: z.string().min(2),
  age: z.number().int().min(0).max(120),
  gender: z.enum(["male", "female", "other"]),
  mobile: z.string().min(10).max(15),
  emergencyContact: z.string().optional().default(""),
  medicalHistory: z.string().optional().default(""),
  allergies: z.string().optional().default(""),
  roomNumber: roomNumberEnum
});

export const dischargeRoomSchema = z.object({
  billAmount: z.number().positive(),
  notes: z.string().optional().default("")
});

export const billingServiceSchema = z.object({
  serviceName: z.string().min(2),
  amount: z.number().nonnegative()
});

export const updateTaxSchema = z.object({
  taxPercentage: z.number().min(0).max(100)
});

export const createDoctorShiftSchema = z.object({
  doctorId: z.string().uuid().optional(),
  name: z.string().min(2),
  shiftStart: z.string().min(5),
  shiftEnd: z.string().min(5)
});

export const labSampleSchema = z.object({
  sampleId: z.string().min(4),
  patient: z.string().min(2),
  test: z.string().min(2),
  status: z.enum(["in_process", "report_ready", "dispatched"]).optional()
});

export const otScheduleSchema = z.object({
  ot: z.string().min(2),
  procedure: z.string().min(2),
  surgeon: z.string().min(2),
  time: z.string().min(2),
  status: z.string().min(2).optional()
});

export const otConsumableSchema = z.object({
  name: z.string().min(2),
  quantity: z.number().int().min(0),
  status: z.string().min(2).optional()
});

export const pharmacyInventorySchema = z.object({
  medicine: z.string().min(2),
  units: z.number().int().min(0)
});

export const pharmacyIssueSchema = z.object({
  patient: z.string().min(2),
  medicine: z.string().min(2)
});

export const insuranceClaimSchema = z.object({
  patient: z.string().min(2),
  provider: z.string().min(2),
  amount: z.number().nonnegative(),
  status: z.string().min(2).optional()
});

export const bloodBankUnitSchema = z.object({
  bloodGroup: z.string().min(2),
  component: z.string().min(2),
  unitsAvailable: z.number().int().min(0),
  reorderLevel: z.number().int().min(0).optional().default(5)
});

export const bloodBankIssueSchema = z.object({
  patient: z.string().min(2),
  bloodGroup: z.string().min(2),
  component: z.string().min(2),
  unitsIssued: z.number().int().positive(),
  status: z.string().min(2).optional().default("Issued")
});
