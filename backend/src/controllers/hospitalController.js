import {
  canHospitalAccessRequest,
  createEmergencyWorkflowForHospitalStaff,
  getCommandCenterSnapshot,
  getEmergencyById,
  handleHospitalResponse,
  isGlobalObserverScope,
  listEmergencyRequestsForScope,
  retryEmergencyAllocationForScope
} from "../services/emergencyService.js";

function isUuidLike(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function respondToEmergencyRequest(req, res, next) {
  try {
    const { action, hospitalId } = req.validatedBody;
    const tokenHospitalId = req.user?.hospitalId;
    const effectiveHospitalId = isUuidLike(tokenHospitalId) ? tokenHospitalId : hospitalId;
    if (!effectiveHospitalId) {
      res.status(400).json({ error: { message: "hospitalId is required", code: "HOSPITAL_ID_REQUIRED" } });
      return;
    }
    handleHospitalResponse({
      requestId: req.params.id,
      hospitalId: effectiveHospitalId,
      action
    })
      .then((request) => res.json(request))
      .catch(next);
  } catch (error) {
    next(error);
  }
}

export async function listHospitalRequests(req, res, next) {
  try {
    const status = typeof req.query.status === "string" ? req.query.status : undefined;
    const limit = Number(req.query.limit || 25);
    const fast = String(req.query.mode || "").toLowerCase() === "fast";
    const requests = await listEmergencyRequestsForScope({
      role: req.user?.role,
      hospitalId: req.user?.hospitalId || null,
      hospitalCode: req.user?.hospitalCode || null,
      status,
      limit,
      fast
    });
    res.json({ items: requests });
  } catch (error) {
    next(error);
  }
}

export async function getHospitalRequestDetails(req, res, next) {
  try {
    const request = await getEmergencyById(req.params.id);
    if (!request) {
      res.status(404).json({ error: { message: "Request not found", code: "REQUEST_NOT_FOUND" } });
      return;
    }

    const isAdminScope = isGlobalObserverScope({
      role: req.user?.role,
      hospitalCode: req.user?.hospitalCode || null
    });
    if (!isAdminScope && req.user?.hospitalId) {
      const allowed = await canHospitalAccessRequest({
        requestId: req.params.id,
        hospitalId: req.user.hospitalId
      });
      if (!allowed) {
        res.status(403).json({ error: { message: "Forbidden", code: "FORBIDDEN" } });
        return;
      }
    }

    if (!isAdminScope && req.user?.hospitalId && request.assignedHospitalId && request.assignedHospitalId !== req.user.hospitalId) {
      res.status(403).json({ error: { message: "Forbidden", code: "FORBIDDEN" } });
      return;
    }

    res.json(request);
  } catch (error) {
    next(error);
  }
}

export async function createManualEmergencyRequest(req, res, next) {
  try {
    const created = await createEmergencyWorkflowForHospitalStaff({
      payload: req.validatedBody,
      actorRole: req.user?.role,
      actorHospitalId: req.user?.hospitalId || null
    });
    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function retryEmergencyAllocation(req, res, next) {
  try {
    const retried = await retryEmergencyAllocationForScope({
      requestId: req.params.id,
      actorRole: req.user?.role,
      actorHospitalId: req.user?.hospitalId || null
    });
    res.json(retried);
  } catch (error) {
    next(error);
  }
}

export async function getCommandCenter(req, res, next) {
  try {
    const snapshot = await getCommandCenterSnapshot({
      role: req.user?.role,
      hospitalId: req.user?.hospitalId || null,
      hospitalCode: req.user?.hospitalCode || null
    });
    res.json(snapshot);
  } catch (error) {
    next(error);
  }
}
