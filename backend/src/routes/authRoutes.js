import { Router } from "express";
import { getCurrentUser, login, register, sendOtp, verifyOtp } from "../controllers/authController.js";
import { validateBody } from "../middlewares/validate.js";
import { loginSchema, registerSchema, sendOtpSchema, verifyOtpSchema } from "../validators/authValidators.js";
import { requireAuth } from "../middlewares/authMiddleware.js";

export const authRouter = Router();

authRouter.post("/login", validateBody(loginSchema), login);
authRouter.post("/register", validateBody(registerSchema), register);
authRouter.post("/otp/send", validateBody(sendOtpSchema), sendOtp);
authRouter.post("/otp/verify", validateBody(verifyOtpSchema), verifyOtp);
authRouter.get("/me", requireAuth, getCurrentUser);
