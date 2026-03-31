import { nanoid } from "nanoid";
import { env } from "../config/env.js";
import {
  closeAttemptByHospital,
  createEmergencyRequestMedia,
  createRequestAttempt,
  createEmergencyRequest,
  getEmergencyRequestCoreById,
  findOpenDuplicateRequest,
  getEmergencyRequestById,
  listEmergencyRequestsLite,
  listEmergencyRequestMedia,
  listPendingAttempts,
  listEmergencyRequests,
  updateEmergencyRequest
} from "../repositories/emergencyRepository.js";
import {
  clearDecisionTimer,
  findBestHospitalCandidates,
  releaseHospitalReservation,
  startDecisionWindow,
  tryReserveHospitalResources
} from "./allocationService.js";
import { derivePriority, enforcePriorityFloor } from "./triageService.js";
import { HttpError } from "../utils/httpError.js";
import { publishRealtimeEvent } from "../realtime/eventBus.js";
import { autoAssignWardForEmergency, findAssignableDoctor, markDoctorAvailability } from "../repositories/operationsRepository.js";
import { getHospitalById } from "../repositories/hospitalRepository.js";
import { buildSafeImmediateGuidance } from "./firstAidService.js";
import { findAssignableAmbulanceForHospital, updateAmbulanceTripStatus } from "../repositories/networkRepository.js";
import { buildAIGuidanceFromFrame } from "./aiGuidanceService.js";
import fs from "fs/promises";

export function isGlobalObserverScope({ role, hospitalCode }) {
  if (["super_admin", "admin"].includes(role)) {
    return true;
  }
  if (!hospitalCode) {
    return false;
  }
  return env.GLOBAL_OBSERVER_HOSPITAL_CODES.includes(hospitalCode);
}

function normalizeResources(resources) {
  const map = {
    icu: "icu_bed",
    icu_bed: "icu_bed",
    normal_bed: "normal_bed",
    general_bed: "normal_bed",
    general_ward: "normal_bed",
    ward_general: "normal_bed",
    bed: "normal_bed",
    ventilator: "ventilator",
    ambulance: "ambulance",
    emergency_doctor: "emergency_doctor",
    doctor: "emergency_doctor"
  };
  return resources.map((resource) => map[resource] || resource);
}

function resolveSeverityFromEmergencyType(emergencyType) {
  const map = {
    cardiac_arrest: "critical",
    stroke_alert: "critical",
    trauma_injury: "moderate",
    respiratory_distress: "moderate",
    fever_illness: "low",
    minor_injury: "low"
  };
  return map[emergencyType] || "moderate";
}

function resolveResourcesBySeverity(severity) {
  if (severity === "critical") {
    return ["ambulance", "icu_bed", "emergency_doctor"];
  }
  if (severity === "low") {
    return ["ambulance", "normal_bed"];
  }
  return ["ambulance", "normal_bed", "emergency_doctor"];
}

function canRetryStatus(status) {
  return ["failed_no_match", "rejected_retrying", "pending_hospital_response"].includes(status);
}

function chunkArray(items, size) {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

async function offerWave({ requestId, request, candidates, radiusKm }) {
  const offered = [];

  for (const candidate of candidates) {
    const reserved = await tryReserveHospitalResources({
      hospitalId: candidate.hospital.id,
      requestedResources: request.requestedResources
    });

    if (!reserved) {
      continue;
    }

    const attempt = {
      hospitalId: candidate.hospital.id,
      hospitalName: candidate.hospital.name,
      radiusKm,
      score: candidate.score,
      distanceKm: candidate.distanceKm,
      reservedAt: new Date().toISOString(),
      status: "pending_hospital_response"
    };

    await createRequestAttempt(requestId, attempt);
    offered.push(attempt);

    publishRealtimeEvent("allocation.attempted", {
      requestId,
      hospitalId: attempt.hospitalId,
      hospitalName: attempt.hospitalName,
      radiusKm: attempt.radiusKm,
      distanceKm: attempt.distanceKm,
      score: attempt.score
    });
  }

  return offered;
}

async function handleWaveTimeout(requestId) {
  const request = await getEmergencyRequestById(requestId);
  if (!request || request.status !== "pending_hospital_response") {
    return;
  }

  const pendingAttempts = await listPendingAttempts(requestId);
  if (pendingAttempts.length === 0) {
    return;
  }

  for (const attempt of pendingAttempts) {
    await closeAttemptByHospital(requestId, attempt.hospitalId, "rejected", "timeout");
    await releaseHospitalReservation({
      hospitalId: attempt.hospitalId,
      requestedResources: request.requestedResources
    });
  }

  await updateEmergencyRequest(requestId, {
    status: "rejected_retrying",
    assignedHospitalId: null
  });

  publishRealtimeEvent("request.status_changed", {
    requestId,
    status: "rejected_retrying",
    assignedHospitalId: null
  });

  await startOrRetryAllocation(requestId);
}

async function ensureNoDuplicateOpenRequest({ callerPhone, patientName }) {
  const duplicate = await findOpenDuplicateRequest({ callerPhone, patientName });

  if (duplicate) {
    throw new HttpError(409, "A similar active request already exists", "DUPLICATE_ACTIVE_REQUEST");
  }
}

export async function createEmergencyWorkflow(payload) {
  await ensureNoDuplicateOpenRequest({
    callerPhone: payload.callerPhone,
    patientName: payload.patientName
  });

  const requestId = `er_${nanoid(10)}`;
  const derivedPriority = derivePriority(payload.symptoms, payload.emergencyType);
  const priority = enforcePriorityFloor(derivedPriority, payload.priority);
  const severity = resolveSeverityFromEmergencyType(payload.emergencyType);
  const requestedResources = resolveResourcesBySeverity(severity);

  const request = await createEmergencyRequest({
    id: requestId,
    status: "created",
    city: env.CITY_DEFAULT,
    callerName: payload.callerName,
    callerPhone: payload.callerPhone,
    patientName: payload.patientName,
    patientAge: payload.patientAge,
    patientGender: payload.patientGender,
    emergencyType: payload.emergencyType,
    requestedForSelf: payload.requestedForSelf,
    location: payload.location,
    symptoms: payload.symptoms,
    requestedResources: normalizeResources(requestedResources),
    priority,
    derivedPriority,
    attempts: [],
    assignedHospitalId: null,
    assignedHospitalName: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  publishRealtimeEvent("request.created", {
    requestId: request.id,
    status: request.status,
    city: request.city,
    priority: request.priority
  });

  // Trigger allocation asynchronously so SOS API returns immediately.
  setTimeout(() => {
    startOrRetryAllocation(request.id).catch(() => {
      // Keep request created even if async allocation start fails transiently.
    });
  }, 0);

  return request;
}

const allocationRetryCounters = new Map();

export async function startOrRetryAllocation(requestId) {
  const request = await getEmergencyRequestById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found", "REQUEST_NOT_FOUND");
  }

  if (request.status === "cancelled" || request.status === "completed") {
    allocationRetryCounters.delete(requestId);
    return request;
  }

  const retryCount = (allocationRetryCounters.get(requestId) || 0) + 1;
  allocationRetryCounters.set(requestId, retryCount);

  if (retryCount > env.ALLOCATION_MAX_RETRIES) {
    allocationRetryCounters.delete(requestId);
    clearDecisionTimer(requestId);

    const failed = await updateEmergencyRequest(requestId, {
      status: "failed_no_match",
      assignedHospitalId: null
    });

    publishRealtimeEvent("request.status_changed", {
      requestId,
      status: failed.status,
      assignedHospitalId: null
    });

    return failed;
  }

  clearDecisionTimer(requestId);

  const batchSize = Math.max(1, Number(env.ALLOCATION_BATCH_SIZE || 5));

  for (const radiusKm of env.ALLOCATION_RADIUS_STEPS_KM) {
    const candidates = await findBestHospitalCandidates({
      city: request.city,
      patientLocation: request.location,
      requestedResources: request.requestedResources,
      radiusKm,
      emergencyType: request.emergencyType
    });

    if (candidates.length === 0) {
      continue;
    }

    const waves = chunkArray(candidates, batchSize);
    for (const wave of waves) {
      const offered = await offerWave({
        requestId,
        request,
        candidates: wave,
        radiusKm
      });

      if (offered.length === 0) {
        continue;
      }

      const updated = await updateEmergencyRequest(requestId, {
        status: "pending_hospital_response",
        assignedHospitalId: null,
        assignedHospitalName: null
      });

      publishRealtimeEvent("request.status_changed", {
        requestId,
        status: updated.status,
        assignedHospitalId: null,
        offeredHospitalIds: offered.map((item) => item.hospitalId)
      });

      startDecisionWindow({
        requestId,
        onTimeout: async () => {
          await handleWaveTimeout(requestId);
        }
      });

      return updated;
    }
  }

  const failed = await updateEmergencyRequest(requestId, {
    status: "failed_no_match",
    assignedHospitalId: null
  });

  publishRealtimeEvent("request.status_changed", {
    requestId,
    status: failed.status,
    assignedHospitalId: null
  });

  return failed;
}

export async function handleHospitalResponse({ requestId, hospitalId, action, reason = null }) {
  const request = await getEmergencyRequestCoreById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found", "REQUEST_NOT_FOUND");
  }

  if (request.status !== "pending_hospital_response") {
    throw new HttpError(409, "Request is not awaiting hospital response", "INVALID_REQUEST_STATE");
  }

  const pendingAttempts = await listPendingAttempts(requestId);
  const matchingAttempt = pendingAttempts.find((attempt) => attempt.hospitalId === hospitalId);
  if (!matchingAttempt) {
    throw new HttpError(403, "Hospital is not part of current approval wave", "HOSPITAL_MISMATCH");
  }

  if (action === "accept") {
    const room = await autoAssignWardForEmergency({
      hospitalId,
      request
    });

    if (!room) {
      await closeAttemptByHospital(requestId, hospitalId, "rejected", "no_room_capacity");
      await releaseHospitalReservation({
        hospitalId,
        requestedResources: request.requestedResources
      });

      const remainingPending = (await listPendingAttempts(requestId)).length;
      if (remainingPending > 0) {
        return getEmergencyRequestById(requestId);
      }

      clearDecisionTimer(requestId);

      await updateEmergencyRequest(requestId, {
        status: "rejected_retrying",
        assignedHospitalId: null
      });

      publishRealtimeEvent("request.status_changed", {
        requestId,
        status: "rejected_retrying",
        assignedHospitalId: null
      });

      return startOrRetryAllocation(requestId);
    }

    clearDecisionTimer(requestId);
    allocationRetryCounters.delete(requestId);
    await closeAttemptByHospital(requestId, hospitalId, "accepted", null);

    const competingAttempts = pendingAttempts.filter((item) => item.hospitalId !== hospitalId);

    const [assignableDoctor, assignableAmbulance, acceptingHospital] = await Promise.all([
      findAssignableDoctor(hospitalId),
      findAssignableAmbulanceForHospital(hospitalId),
      getHospitalById(hospitalId)
    ]);

    await updateEmergencyRequest(requestId, {
      status: "accepted",
      assignedHospitalId: hospitalId,
      assignedDoctorId: assignableDoctor?.id || null,
      assignedAmbulanceId: assignableAmbulance?.id || null
    }, {
      hydrate: false
    });

    const accepted = {
      id: requestId,
      status: "accepted",
      assignedHospitalId: hospitalId,
      assignedHospitalName: acceptingHospital?.name || null,
      assignedDoctorId: assignableDoctor?.id || null,
      assignedDoctorName: assignableDoctor?.fullName || null,
      assignedAmbulanceId: assignableAmbulance?.id || null,
      assignedAmbulanceVehicleNumber: assignableAmbulance?.vehicleNumber || null,
      assignedAmbulanceMobileNumber: assignableAmbulance?.mobileNumber || null,
      assignedAmbulanceType: assignableAmbulance?.ambulanceType || null,
      assignedAmbulanceLocation: assignableAmbulance
        ? {
            latitude: Number(assignableAmbulance.latitude || 0),
            longitude: Number(assignableAmbulance.longitude || 0)
          }
        : null,
      assignedRoomNumber: room?.roomNumber || null
    };

    publishRealtimeEvent("request.status_changed", {
      requestId,
      status: accepted.status,
      assignedHospitalId: accepted.assignedHospitalId,
      assignedHospitalName: accepted.assignedHospitalName,
      assignedDoctorId: accepted.assignedDoctorId,
      assignedDoctorName: accepted.assignedDoctorName,
      assignedAmbulanceId: accepted.assignedAmbulanceId,
      assignedAmbulanceVehicleNumber: accepted.assignedAmbulanceVehicleNumber,
      assignedAmbulanceMobileNumber: accepted.assignedAmbulanceMobileNumber,
      assignedAmbulanceLocation: accepted.assignedAmbulanceLocation,
      assignedRoomNumber: room?.roomNumber || accepted.assignedRoomNumber || null
    });

    // Run non-critical side effects in background to keep accept latency low.
    void Promise.all([
      ...competingAttempts.map(async (attempt) => {
        await closeAttemptByHospital(requestId, attempt.hospitalId, "rejected", "accepted_by_other_hospital");
        await releaseHospitalReservation({
          hospitalId: attempt.hospitalId,
          requestedResources: request.requestedResources
        });
      }),
      assignableDoctor?.id ? markDoctorAvailability(assignableDoctor.id, false) : Promise.resolve(),
      assignableAmbulance?.id ? updateAmbulanceTripStatus(assignableAmbulance.id, "dispatched") : Promise.resolve()
    ]).catch(() => {
      // Keep accepted state stable even if eventual consistency updates fail.
    });

    return accepted;
  }

  await closeAttemptByHospital(requestId, hospitalId, "rejected", reason || "manual");

  await releaseHospitalReservation({
    hospitalId,
    requestedResources: request.requestedResources
  });

  const remainingPending = (await listPendingAttempts(requestId)).length;
  if (remainingPending > 0) {
    return getEmergencyRequestById(requestId);
  }

  clearDecisionTimer(requestId);

  await updateEmergencyRequest(requestId, {
    status: "rejected_retrying",
    assignedHospitalId: null
  });

  publishRealtimeEvent("request.status_changed", {
    requestId,
    status: "rejected_retrying",
    assignedHospitalId: null
  });

  return startOrRetryAllocation(requestId);
}

export async function cancelEmergencyWorkflow({ requestId, reason }) {
  const request = await getEmergencyRequestById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found", "REQUEST_NOT_FOUND");
  }

  if (["accepted", "completed", "failed_no_match"].includes(request.status)) {
    throw new HttpError(409, "Request cannot be cancelled in current state", "CANCEL_NOT_ALLOWED");
  }

  clearDecisionTimer(requestId);
  allocationRetryCounters.delete(requestId);

  if (request.assignedHospitalId) {
    await releaseHospitalReservation({
      hospitalId: request.assignedHospitalId,
      requestedResources: request.requestedResources
    });
  }

  const cancelled = await updateEmergencyRequest(requestId, {
    status: "cancelled",
    cancellationReason: reason || "user_cancelled",
    assignedHospitalId: null
  });

  publishRealtimeEvent("request.status_changed", {
    requestId,
    status: cancelled.status,
    assignedHospitalId: null,
    cancellationReason: cancelled.cancellationReason
  });

  return cancelled;
}

export async function getEmergencyById(requestId) {
  return getEmergencyRequestById(requestId);
}

export async function listEmergencyRequestsForScope({ role, hospitalId, hospitalCode, status, limit, fast = false }) {
  const isAdminScope = isGlobalObserverScope({ role, hospitalCode });
  const assignedHospitalId = isAdminScope ? undefined : null;
  return listEmergencyRequests({
    status,
    assignedHospitalId,
    offeredHospitalId: isAdminScope ? undefined : hospitalId,
    limit,
    includePreviousRecords: !fast,
    includeAttempts: !fast
  });
}

export async function canHospitalAccessRequest({ requestId, hospitalId }) {
  const request = await getEmergencyRequestById(requestId);
  if (!request) {
    return false;
  }

  if (request.assignedHospitalId && request.assignedHospitalId === hospitalId) {
    return true;
  }

  const pendingAttempts = await listPendingAttempts(requestId);
  return pendingAttempts.some((attempt) => attempt.hospitalId === hospitalId);
}

export async function createEmergencyWorkflowForHospitalStaff({ payload, actorRole, actorHospitalId }) {
  if (!["dispatch_operator", "hospital_admin_staff", "admin", "super_admin"].includes(actorRole)) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }

  const created = await createEmergencyWorkflow(payload);

  if (actorHospitalId && ["dispatch_operator", "hospital_admin_staff"].includes(actorRole)) {
    const readBack = await getEmergencyRequestById(created.id);
    if (readBack?.assignedHospitalId && readBack.assignedHospitalId !== actorHospitalId) {
      throw new HttpError(403, "Request not linked to your hospital scope", "HOSPITAL_SCOPE_MISMATCH");
    }
  }

  return created;
}

export async function retryEmergencyAllocationForScope({ requestId, actorRole, actorHospitalId }) {
  const request = await getEmergencyRequestById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found", "REQUEST_NOT_FOUND");
  }

  const isAdminScope = ["super_admin", "admin"].includes(actorRole);
  if (!isAdminScope && actorHospitalId && request.assignedHospitalId && request.assignedHospitalId !== actorHospitalId) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }

  if (!canRetryStatus(request.status)) {
    throw new HttpError(409, "Request cannot be retried in current state", "RETRY_NOT_ALLOWED");
  }

  if (request.assignedHospitalId) {
    await releaseHospitalReservation({
      hospitalId: request.assignedHospitalId,
      requestedResources: request.requestedResources
    });
  }

  await updateEmergencyRequest(requestId, {
    status: "rejected_retrying",
    assignedHospitalId: null
  });

  publishRealtimeEvent("request.retry_triggered", {
    requestId,
    actorRole
  });

  return startOrRetryAllocation(requestId);
}

export async function getCommandCenterSnapshot({ role, hospitalId, hospitalCode }) {
  const isAdminScope = isGlobalObserverScope({ role, hospitalCode });
  const items = await listEmergencyRequestsLite({
    offeredHospitalId: isAdminScope ? undefined : hospitalId,
    limit: 120
  });

  const counters = {
    total: items.length,
    pending_hospital_response: 0,
    accepted: 0,
    rejected_retrying: 0,
    failed_no_match: 0,
    cancelled: 0,
    created: 0,
    completed: 0
  };

  for (const item of items) {
    if (counters[item.status] !== undefined) {
      counters[item.status] += 1;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    counters,
    recent: items.slice(0, 25)
  };
}

export async function createEmergencyMediaForPublic({ requestId, callerPhone, file, frameFile, note }) {
  const request = await getEmergencyRequestById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found", "REQUEST_NOT_FOUND");
  }

  if (!callerPhone || String(callerPhone) !== String(request.callerPhone)) {
    throw new HttpError(403, "Caller phone does not match request", "CALLER_PHONE_MISMATCH");
  }

  const mimeType = file?.mimetype || "";
  const mediaType = mimeType.startsWith("video/") ? "video" : mimeType.startsWith("audio/") ? "audio" : null;
  if (!mediaType) {
    throw new HttpError(400, "Only audio/video files are accepted", "INVALID_MEDIA_TYPE");
  }

  const aiFromFrame = await buildAIGuidanceFromFrame({
    emergencyType: request.emergencyType,
    note,
    frameFilePath: frameFile?.path,
    frameMimeType: frameFile?.mimetype
  });

  if (frameFile?.path) {
    void fs.unlink(frameFile.path).catch(() => {
      // Ignore cleanup failure for temporary frame files.
    });
  }

  const aiGuidance = aiFromFrame || buildSafeImmediateGuidance({
    emergencyType: request.emergencyType,
    note
  });

  const saved = await createEmergencyRequestMedia({
    requestId,
    uploadedByRole: "public_requester",
    uploadedByHospitalId: null,
    mediaType,
    mimeType,
    filePath: `/uploads/emergency-media/${file.filename}`,
    originalFileName: file.originalname,
    note,
    aiGuidance
  });

  publishRealtimeEvent("request.media_uploaded", {
    requestId,
    mediaId: saved.id,
    mediaType: saved.mediaType,
    assignedHospitalId: request.assignedHospitalId,
    assignedDoctorId: request.assignedDoctorId || null
  });

  return saved;
}

export async function listEmergencyMediaForScope({ requestId, role, hospitalId }) {
  const request = await getEmergencyRequestById(requestId);
  if (!request) {
    throw new HttpError(404, "Request not found", "REQUEST_NOT_FOUND");
  }

  if (["super_admin", "admin"].includes(role)) {
    return listEmergencyRequestMedia(requestId);
  }

  if (!hospitalId) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }

  const canAccess = await canHospitalAccessRequest({ requestId, hospitalId });
  if (!canAccess) {
    throw new HttpError(403, "Forbidden", "FORBIDDEN");
  }

  return listEmergencyRequestMedia(requestId);
}
