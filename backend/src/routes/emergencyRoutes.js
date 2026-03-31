import { Router } from "express";
import {
  cancelEmergencyRequest,
  createEmergencyRequest,
  getEmergencyRequest,
  listEmergencyMedia,
  uploadEmergencyMedia
} from "../controllers/emergencyController.js";
import { validateBody } from "../middlewares/validate.js";
import { cancelEmergencySchema, createEmergencySchema } from "../validators/emergencyValidators.js";
import { requireAuth, requireRoles } from "../middlewares/authMiddleware.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const mediaDirectory = path.resolve(process.cwd(), "uploads", "emergency-media");
if (!fs.existsSync(mediaDirectory)) {
  fs.mkdirSync(mediaDirectory, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, mediaDirectory),
    filename: (_req, file, cb) => {
      const suffix = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname || "").toLowerCase();
      cb(null, `${suffix}${ext}`);
    }
  }),
  limits: {
    fileSize: 25 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowed = file.mimetype.startsWith("audio/") || file.mimetype.startsWith("video/") || file.mimetype.startsWith("image/");
    cb(allowed ? null : new Error("Only audio/video/image uploads are allowed"), allowed);
  }
});

export const emergencyRouter = Router();

emergencyRouter.post("/requests", validateBody(createEmergencySchema), createEmergencyRequest);
emergencyRouter.get("/requests/:id", getEmergencyRequest);
emergencyRouter.post("/requests/:id/cancel", validateBody(cancelEmergencySchema), cancelEmergencyRequest);
emergencyRouter.post(
  "/requests/:id/media",
  upload.fields([
    { name: "media", maxCount: 1 },
    { name: "frame", maxCount: 1 }
  ]),
  uploadEmergencyMedia
);
emergencyRouter.get(
  "/requests/:id/media",
  requireAuth,
  requireRoles("super_admin", "admin", "hospital_admin_staff", "dispatch_operator", "doctor", "nurse"),
  listEmergencyMedia
);
