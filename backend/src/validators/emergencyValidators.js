import { z } from "zod";

const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3),
  landmark: z.string().optional()
});

export const createEmergencySchema = z.object({
  callerName: z.string().min(2),
  callerPhone: z.string().min(10).max(15),
  patientName: z.string().min(2),
  patientAge: z.number().int().min(0).max(120),
  patientGender: z.enum(["male", "female", "other"]),
  emergencyType: z.enum([
    "cardiac_arrest",
    "stroke_alert",
    "trauma_injury",
    "respiratory_distress",
    "fever_illness",
    "minor_injury"
  ]),
  symptoms: z.array(z.string()).min(1),
  requestedResources: z.array(z.string()).min(1),
  location: locationSchema,
  requestedForSelf: z.boolean().default(true)
});

export const cancelEmergencySchema = z.object({
  reason: z.string().min(3).max(200).optional()
});

export const hospitalResponseSchema = z.object({
  hospitalId: z.string().min(1).optional(),
  action: z.enum(["accept", "reject"])
});

export const retryAllocationSchema = z.object({
  reason: z.string().min(3).max(200).optional()
});
