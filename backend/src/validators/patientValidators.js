import { z } from "zod";

export const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  bloodGroup: z.string().optional(),
  emergencyContact: z.string().min(10).max(15).optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  medicalConditions: z.string().optional(),
  allergies: z.string().optional()
});

export const createPatientRequestSchema = z.object({
  resourceType: z.enum(["icu_bed", "normal_bed", "ambulance", "ventilator", "emergency_doctor"]),
  patientCondition: z.string().min(3),
  priorityLevel: z.enum(["low", "medium", "high", "critical"]),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().min(3)
  }),
  additionalNotes: z.string().optional()
});