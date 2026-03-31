import {
  cancelEmergencyWorkflow,
  createEmergencyMediaForPublic,
  createEmergencyWorkflow,
  getEmergencyById,
  listEmergencyMediaForScope
} from "../services/emergencyService.js";

export function createEmergencyRequest(req, res, next) {
  try {
    createEmergencyWorkflow(req.validatedBody)
      .then((request) => res.status(201).json(request))
      .catch(next);
  } catch (error) {
    next(error);
  }
}

export function getEmergencyRequest(req, res, next) {
  try {
    getEmergencyById(req.params.id)
      .then((request) => {
        if (!request) {
          res.status(404).json({ error: { message: "Request not found", code: "REQUEST_NOT_FOUND" } });
          return;
        }
        res.json(request);
      })
      .catch(next);
  } catch (error) {
    next(error);
  }
}

export function cancelEmergencyRequest(req, res, next) {
  try {
    cancelEmergencyWorkflow({
      requestId: req.params.id,
      reason: req.validatedBody.reason
    })
      .then((request) => res.json(request))
      .catch(next);
  } catch (error) {
    next(error);
  }
}

export function uploadEmergencyMedia(req, res, next) {
  try {
    const mediaFile = req.file || req.files?.media?.[0] || null;
    const frameFile = req.files?.frame?.[0] || null;
    createEmergencyMediaForPublic({
      requestId: req.params.id,
      callerPhone: req.body?.callerPhone,
      file: mediaFile,
      frameFile,
      note: req.body?.note || ""
    })
      .then((media) => res.status(201).json(media))
      .catch(next);
  } catch (error) {
    next(error);
  }
}

export function listEmergencyMedia(req, res, next) {
  try {
    listEmergencyMediaForScope({
      requestId: req.params.id,
      role: req.user?.role,
      hospitalId: req.user?.hospitalId || null
    })
      .then((items) => res.json({ items }))
      .catch(next);
  } catch (error) {
    next(error);
  }
}
