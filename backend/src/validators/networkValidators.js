import { z } from "zod";

export const onboardHospitalSchema = z.object({
  city: z.string().min(2),
  code: z.string().min(3),
  name: z.string().min(3),
  address: z.string().min(3),
  landmark: z.string().optional(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const onboardProviderSchema = z.object({
  city: z.string().min(2),
  name: z.string().min(2)
});

export const createAmbulanceSchema = z.object({
  city: z.string().min(2),
  ownerType: z.enum(["hospital", "provider"]),
  hospitalId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  vehicleNumber: z.string().min(3),
  ambulanceType: z.string().min(2).optional().default("Standard"),
  mobileNumber: z.string().min(10).max(15),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const updateAmbulanceLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180)
});

export const dispatchAmbulanceSchema = z.object({
  requestId: z.string().uuid().optional(),
  patientLatitude: z.number().min(-90).max(90),
  patientLongitude: z.number().min(-180).max(180),
  patientPhone: z.string().min(10).max(15).optional()
});
