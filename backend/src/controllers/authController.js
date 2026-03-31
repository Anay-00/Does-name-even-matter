import { loginWithEmailPassword } from "../services/authService.js";
import { sendMockOtp, verifyMockOtp } from "../services/otpService.js";
import { signAccessToken } from "../services/tokenService.js";
import { HttpError } from "../utils/httpError.js";
import { registerPatient } from "../services/patientService.js";

export async function login(req, res, next) {
  try {
    const user = await loginWithEmailPassword(req.validatedBody);
    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      hospitalId: user.hospitalId,
      email: user.email,
      hospitalCode: user.hospitalCode
    });

    res.json({ accessToken, user });
  } catch (error) {
    next(error);
  }
}

export async function register(req, res, next) {
  try {
    const patient = registerPatient(req.validatedBody);
    const accessToken = signAccessToken({
      sub: patient.id,
      role: "patient",
      email: patient.email,
      phoneNumber: patient.phoneNumber,
      fullName: patient.fullName
    });

    res.status(201).json({
      accessToken,
      user: {
        id: patient.id,
        role: "patient",
        email: patient.email,
        phoneNumber: patient.phoneNumber,
        fullName: patient.fullName
      }
    });
  } catch (error) {
    next(error);
  }
}

export function getCurrentUser(req, res) {
  res.json({
    user: {
      id: req.user.sub,
      role: req.user.role,
      email: req.user.email,
      hospitalId: req.user.hospitalId || null,
      hospitalCode: req.user.hospitalCode || null
    }
  });
}

export function sendOtp(req, res, next) {
  try {
    const result = sendMockOtp(req.validatedBody.phone);
    res.json({
      phone: result.phone,
      otp: result.otp,
      expiresAt: result.expiresAt,
      mode: "mock"
    });
  } catch (error) {
    next(error);
  }
}

export function verifyOtp(req, res, next) {
  try {
    const { phone, otp } = req.validatedBody;
    const valid = verifyMockOtp(phone, otp);
    if (!valid) {
      throw new HttpError(400, "Invalid or expired OTP", "INVALID_OTP");
    }
    res.json({ verified: true });
  } catch (error) {
    next(error);
  }
}
