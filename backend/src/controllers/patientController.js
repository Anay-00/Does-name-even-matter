import {
  getActivePatientRequests,
  getPatientNotifications,
  getPatientProfile,
  getPatientRequestHistory,
  submitPatientRequest,
  updatePatientProfileDetails
} from "../services/patientService.js";

export function getProfile(req, res, next) {
  try {
    const profile = getPatientProfile(req.user.sub);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

export function updateProfile(req, res, next) {
  try {
    const profile = updatePatientProfileDetails(req.user.sub, req.validatedBody);
    res.json({ profile });
  } catch (error) {
    next(error);
  }
}

export function createRequest(req, res, next) {
  try {
    const item = submitPatientRequest(req.user.sub, req.validatedBody);
    res.status(201).json({ item, message: "Emergency request submitted successfully" });
  } catch (error) {
    next(error);
  }
}

export function listActive(req, res, next) {
  try {
    const items = getActivePatientRequests(req.user.sub);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export function listHistory(req, res, next) {
  try {
    const items = getPatientRequestHistory(req.user.sub);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}

export function listNotifications(req, res, next) {
  try {
    const items = getPatientNotifications(req.user.sub);
    res.json({ items });
  } catch (error) {
    next(error);
  }
}