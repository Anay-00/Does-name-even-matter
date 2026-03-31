import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: Number(process.env.PORT || 8080),
  NODE_ENV: process.env.NODE_ENV || "development",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  JWT_SECRET: process.env.JWT_SECRET || "change-this-secret",
  ALLOCATION_DECISION_WINDOW_SECONDS: Number(process.env.ALLOCATION_DECISION_WINDOW_SECONDS || 30),
  ALLOCATION_RESERVATION_TTL_SECONDS: Number(process.env.ALLOCATION_RESERVATION_TTL_SECONDS || 90),
  ALLOCATION_RADIUS_STEPS_KM: (process.env.ALLOCATION_RADIUS_STEPS_KM || "5,10,20,35")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value) && value > 0),
  ALLOCATION_BATCH_SIZE: Number(process.env.ALLOCATION_BATCH_SIZE || 5),
  ALLOCATION_MAX_RETRIES: Number(process.env.ALLOCATION_MAX_RETRIES || 3),
  GLOBAL_OBSERVER_HOSPITAL_CODES: (process.env.GLOBAL_OBSERVER_HOSPITAL_CODES || "IND-AITR-01")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  CITY_DEFAULT: process.env.CITY_DEFAULT || "Indore",
  AMBULANCE_AVG_SPEED_KMPH: Number(process.env.AMBULANCE_AVG_SPEED_KMPH || 35),
  SMS_WEBHOOK_URL: process.env.SMS_WEBHOOK_URL || "",
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || ""
};
