import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(3),
  password: z.string().min(1),
  role: z.enum([
    "patient",
    "super_admin",
    "admin",
    "hospital_admin_staff",
    "dispatch_operator",
    "doctor",
    "nurse",
    "ambulance_provider_operator"
  ])
});

export const registerSchema = z.object({
  fullName: z.string().min(2),
  phoneNumber: z.string().min(10).max(15),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(8),
  confirmPassword: z.string().min(8)
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

export const sendOtpSchema = z.object({
  phone: z.string().min(10).max(15)
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10).max(15),
  otp: z.string().length(6)
});
