import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";
import { getOrCreateCityId } from "./hospitalRepository.js";
import { env } from "../config/env.js";
import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

let hasAssignedDoctorColumn = true;
let hasAssignedAmbulanceColumn = true;
let hasEmergencyRequestMediaTable = true;

const mediaFallbackFilePath = path.resolve(process.cwd(), "uploads", "emergency-media", "media-index.json");

function isMissingAssignedDoctorSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("assigned_doctor_id") &&
    (message.includes("schema cache") || message.includes("column"))
  );
}

function isMissingAssignedAmbulanceSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("assigned_ambulance_id") &&
    (message.includes("schema cache") || message.includes("column"))
  );
}

function isMissingAmbulanceMobileSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("ambulances.mobile_number") || (message.includes("mobile_number") && message.includes("ambulances"));
}

function isMissingAmbulanceCoordinateSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("ambulances.latitude") ||
    message.includes("ambulances.longitude") ||
    (message.includes("ambulances") && (message.includes("latitude") || message.includes("longitude")))
  );
}

function isMissingEmergencyMediaSchema(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("emergency_request_media") &&
    (message.includes("schema cache") || message.includes("relation") || message.includes("table"))
  );
}

function ensureMediaFallbackFile() {
  const directory = path.dirname(mediaFallbackFilePath);
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }

  if (!fs.existsSync(mediaFallbackFilePath)) {
    fs.writeFileSync(mediaFallbackFilePath, "[]", "utf8");
  }
}

function readMediaFallbackRecords() {
  ensureMediaFallbackFile();
  try {
    const raw = fs.readFileSync(mediaFallbackFilePath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeMediaFallbackRecords(records) {
  ensureMediaFallbackFile();
  fs.writeFileSync(mediaFallbackFilePath, JSON.stringify(records, null, 2), "utf8");
}

function toMediaDto(item) {
  return {
    id: item.id,
    requestId: item.emergency_request_id,
    uploadedByRole: item.uploaded_by_role,
    uploadedByHospitalId: item.uploaded_by_hospital_id,
    mediaType: item.media_type,
    mimeType: item.mime_type,
    filePath: item.file_path,
    originalFileName: item.original_file_name,
    note: item.note || "",
    aiGuidance: item.ai_guidance || "",
    createdAt: item.created_at
  };
}

function createMediaInFallbackStore({ requestId, uploadedByRole, uploadedByHospitalId, mediaType, mimeType, filePath, originalFileName, note, aiGuidance }) {
  const records = readMediaFallbackRecords();
  const created = {
    id: randomUUID(),
    emergency_request_id: requestId,
    uploaded_by_role: uploadedByRole || "public_requester",
    uploaded_by_hospital_id: uploadedByHospitalId || null,
    media_type: mediaType,
    mime_type: mimeType,
    file_path: filePath,
    original_file_name: originalFileName,
    note: note || null,
    ai_guidance: aiGuidance || null,
    created_at: new Date().toISOString()
  };

  records.push(created);
  writeMediaFallbackRecords(records);
  return toMediaDto(created);
}

function listMediaFromFallbackStore(requestId) {
  const records = readMediaFallbackRecords();
  return records
    .filter((item) => item.emergency_request_id === requestId)
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .map(toMediaDto);
}

function toPoint(longitude, latitude) {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

function fallbackAmbulanceMobile(vehicleNumber) {
  const digits = String(vehicleNumber || "").replace(/\D/g, "");
  if (!digits) {
    return null;
  }
  return digits.slice(-10).padStart(10, "9");
}

function mapEmergency(record, attempts = [], assignedHospitalName = null, assignedDoctorName = null, assignedAmbulance = null, assignedRoomNumber = null, previousRecords = null) {
  return {
    id: record.id,
    status: record.status,
    city: env.CITY_DEFAULT,
    cityId: record.city_id,
    callerName: record.caller_name,
    callerPhone: record.caller_phone,
    patientName: record.patient_name,
    patientAge: record.patient_age,
    patientGender: record.patient_gender,
    emergencyType: record.emergency_type,
    symptoms: record.symptoms || [],
    requestedResources: record.requested_resources || [],
    priority: record.priority,
    location: {
      latitude: Number(record.patient_latitude || 0),
      longitude: Number(record.patient_longitude || 0),
      address: record.address,
      landmark: record.landmark || ""
    },
    assignedHospitalId: record.assigned_hospital_id,
    assignedHospitalName,
    assignedDoctorId: record.assigned_doctor_id || null,
    assignedDoctorName,
    assignedAmbulanceId: record.assigned_ambulance_id || null,
    assignedAmbulanceVehicleNumber: assignedAmbulance?.vehicleNumber || null,
    assignedAmbulanceMobileNumber: assignedAmbulance?.mobileNumber || null,
    assignedAmbulanceType: assignedAmbulance?.ambulanceType || null,
    assignedAmbulanceLocation: assignedAmbulance?.location || null,
    assignedRoomNumber,
    previousRecords,
    cancellationReason: record.cancellation_reason,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
    attempts
  };
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

export async function findOpenDuplicateRequest({ callerPhone, patientName }) {
  const normalizedName = normalizeName(patientName);
  const { data, error } = await supabaseAdmin
    .from("emergency_requests")
    .select("id,status,caller_phone,patient_name,created_at")
    .eq("caller_phone", String(callerPhone || ""))
    .in("status", ["created", "pending_hospital_response", "rejected_retrying"])
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_DUPLICATE_LOOKUP_FAILED");
  }

  return (data || []).find((item) => normalizeName(item.patient_name) === normalizedName) || null;
}

async function buildPreviousRecordsSummary({ requestId, callerPhone, patientName }) {
  const normalizedName = normalizeName(patientName);
  const { data, error } = await supabaseAdmin
    .from("emergency_requests")
    .select("id,status,emergency_type,patient_name,created_at")
    .eq("caller_phone", String(callerPhone || ""))
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_HISTORY_LOOKUP_FAILED");
  }

  const history = (data || [])
    .filter((item) => item.id !== requestId)
    .slice(0, 5)
    .map((item) => ({
      id: item.id,
      status: item.status,
      emergencyType: item.emergency_type,
      createdAt: item.created_at
    }));

  const matchingNameCount = (data || [])
    .filter((item) => item.id !== requestId)
    .filter((item) => normalizeName(item.patient_name) === normalizedName).length;

  return {
    totalPreviousRequests: history.length,
    matchingNameCount,
    lastRequestAt: history[0]?.createdAt || null,
    recentHistory: history
  };
}

function buildPreviousRecordsSummaryMap(rows) {
  const summaryByRequestId = new Map();
  const groupedByPhone = new Map();

  for (const row of rows) {
    const callerPhone = String(row.caller_phone || "");
    if (!groupedByPhone.has(callerPhone)) {
      groupedByPhone.set(callerPhone, []);
    }
    groupedByPhone.get(callerPhone).push(row);
  }

  for (const groupRows of groupedByPhone.values()) {
    const sorted = [...groupRows].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    );

    for (const row of sorted) {
      const normalizedName = normalizeName(row.patient_name);
      const history = sorted
        .filter((item) => item.id !== row.id)
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          status: item.status,
          emergencyType: item.emergency_type,
          createdAt: item.created_at
        }));

      const matchingNameCount = sorted
        .filter((item) => item.id !== row.id)
        .filter((item) => normalizeName(item.patient_name) === normalizedName).length;

      summaryByRequestId.set(row.id, {
        totalPreviousRequests: history.length,
        matchingNameCount,
        lastRequestAt: history[0]?.createdAt || null,
        recentHistory: history
      });
    }
  }

  return summaryByRequestId;
}

async function listRequestAttempts(requestId) {
  const { data, error } = await supabaseAdmin
    .from("request_attempts")
    .select("id,hospital_id,radius_km,score,distance_km,decision,decision_at,reason,created_at")
    .eq("emergency_request_id", requestId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new HttpError(500, error.message, "DB_ATTEMPT_LIST_FAILED");
  }

  const hospitalIds = [...new Set((data || []).map((row) => row.hospital_id).filter(Boolean))];
  let hospitalNames = new Map();

  if (hospitalIds.length > 0) {
    const { data: hospitals, error: hospitalsError } = await supabaseAdmin
      .from("hospitals")
      .select("id,name")
      .in("id", hospitalIds);

    if (hospitalsError) {
      throw new HttpError(500, hospitalsError.message, "DB_ATTEMPT_HOSPITAL_LIST_FAILED");
    }

    hospitalNames = new Map((hospitals || []).map((hospital) => [hospital.id, hospital.name]));
  }

  return (data || []).map((row) => ({
    id: row.id,
    hospitalId: row.hospital_id,
    hospitalName: hospitalNames.get(row.hospital_id) || null,
    radiusKm: row.radius_km,
    score: Number(row.score || 0),
    distanceKm: Number(row.distance_km || 0),
    status: row.decision,
    reservedAt: row.created_at,
    rejectedAt: row.decision === "rejected" ? row.decision_at : null,
    rejectionReason: row.reason || null
  }));
}

export async function createEmergencyRequest(record) {
  const cityId = await getOrCreateCityId(record.city);
  const insertPayload = {
    city_id: cityId,
    caller_name: record.callerName,
    caller_phone: record.callerPhone,
    patient_name: record.patientName,
    patient_age: record.patientAge,
    patient_gender: record.patientGender,
    emergency_type: record.emergencyType,
    symptoms: record.symptoms,
    requested_resources: record.requestedResources,
    priority: record.priority,
    status: record.status,
    address: record.location.address,
    landmark: record.location.landmark || null,
    patient_latitude: record.location.latitude,
    patient_longitude: record.location.longitude,
    location: toPoint(record.location.longitude, record.location.latitude)
  };

  const { data, error } = await supabaseAdmin
    .from("emergency_requests")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_CREATE_FAILED");
  }

  const previousRecords = await buildPreviousRecordsSummary({
    requestId: data.id,
    callerPhone: data.caller_phone,
    patientName: data.patient_name
  });

  return mapEmergency(data, [], null, null, null, null, previousRecords);
}

export async function getEmergencyRequestById(requestId) {
  const { data, error } = await supabaseAdmin
    .from("emergency_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_GET_FAILED");
  }

  if (!data) {
    return null;
  }

  const attempts = await listRequestAttempts(requestId);
  let assignedHospitalName = null;
  let assignedDoctorName = null;
  let assignedAmbulance = null;
  let assignedRoomNumber = null;
  if (data.assigned_hospital_id) {
    const { data: hospital, error: hospitalError } = await supabaseAdmin
      .from("hospitals")
      .select("name")
      .eq("id", data.assigned_hospital_id)
      .maybeSingle();

    if (hospitalError) {
      throw new HttpError(500, hospitalError.message, "DB_EMERGENCY_ASSIGNED_HOSPITAL_GET_FAILED");
    }
    assignedHospitalName = hospital?.name || null;
  }

  if (data.assigned_doctor_id) {
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from("doctors")
      .select("full_name")
      .eq("id", data.assigned_doctor_id)
      .maybeSingle();

    if (doctorError) {
      throw new HttpError(500, doctorError.message, "DB_EMERGENCY_ASSIGNED_DOCTOR_GET_FAILED");
    }

    assignedDoctorName = doctor?.full_name || null;
  }

  if (data.assigned_ambulance_id) {
    let { data: ambulance, error: ambulanceError } = await supabaseAdmin
      .from("ambulances")
      .select("vehicle_number,mobile_number,ambulance_type,latitude,longitude")
      .eq("id", data.assigned_ambulance_id)
      .maybeSingle();

    if (ambulanceError && (isMissingAmbulanceMobileSchema(ambulanceError) || isMissingAmbulanceCoordinateSchema(ambulanceError))) {
      const fallback = await supabaseAdmin
        .from("ambulances")
        .select("vehicle_number,ambulance_type,latitude,longitude")
        .eq("id", data.assigned_ambulance_id)
        .maybeSingle();

      ambulance = fallback.data;
      ambulanceError = fallback.error;

      if (ambulanceError && isMissingAmbulanceCoordinateSchema(ambulanceError)) {
        const noCoordinateFallback = await supabaseAdmin
          .from("ambulances")
          .select("vehicle_number,ambulance_type")
          .eq("id", data.assigned_ambulance_id)
          .maybeSingle();

        ambulance = noCoordinateFallback.data;
        ambulanceError = noCoordinateFallback.error;
      }
    }

    if (ambulanceError) {
      throw new HttpError(500, ambulanceError.message, "DB_EMERGENCY_ASSIGNED_AMBULANCE_GET_FAILED");
    }

    assignedAmbulance = {
      vehicleNumber: ambulance?.vehicle_number || null,
      mobileNumber: ambulance?.mobile_number || fallbackAmbulanceMobile(ambulance?.vehicle_number) || null,
      ambulanceType: ambulance?.ambulance_type || null,
      location: {
        latitude: Number(ambulance?.latitude || 0),
        longitude: Number(ambulance?.longitude || 0)
      }
    };
  }

  const { data: roomRow, error: roomError } = await supabaseAdmin
    .from("room_allotments")
    .select("room_number")
    .eq("patient_id", requestId)
    .order("allotted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roomError) {
    throw new HttpError(500, roomError.message, "DB_EMERGENCY_ASSIGNED_ROOM_GET_FAILED");
  }

  assignedRoomNumber = roomRow?.room_number || null;

  const previousRecords = await buildPreviousRecordsSummary({
    requestId: data.id,
    callerPhone: data.caller_phone,
    patientName: data.patient_name
  });

  return mapEmergency(data, attempts, assignedHospitalName, assignedDoctorName, assignedAmbulance, assignedRoomNumber, previousRecords);
}

export async function getEmergencyRequestCoreById(requestId) {
  const { data, error } = await supabaseAdmin
    .from("emergency_requests")
    .select("id,status,caller_name,caller_phone,patient_name,patient_age,patient_gender,emergency_type,requested_resources,address,landmark,patient_latitude,patient_longitude,assigned_hospital_id")
    .eq("id", requestId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_CORE_GET_FAILED");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    status: data.status,
    callerName: data.caller_name,
    callerPhone: data.caller_phone,
    patientName: data.patient_name,
    patientAge: data.patient_age,
    patientGender: data.patient_gender,
    emergencyType: data.emergency_type,
    requestedResources: data.requested_resources || [],
    location: {
      latitude: Number(data.patient_latitude || 0),
      longitude: Number(data.patient_longitude || 0),
      address: data.address,
      landmark: data.landmark || ""
    },
    assignedHospitalId: data.assigned_hospital_id || null
  };
}

export async function updateEmergencyRequest(requestId, patch, options = {}) {
  const { hydrate = true } = options;
  const updatePayload = {};
  if (patch.status !== undefined) {
    updatePayload.status = patch.status;
  }
  if (patch.assignedHospitalId !== undefined) {
    updatePayload.assigned_hospital_id = patch.assignedHospitalId;
  }
  if (patch.assignedDoctorId !== undefined && hasAssignedDoctorColumn) {
    updatePayload.assigned_doctor_id = patch.assignedDoctorId;
  }
  if (patch.assignedAmbulanceId !== undefined && hasAssignedAmbulanceColumn) {
    updatePayload.assigned_ambulance_id = patch.assignedAmbulanceId;
  }
  if (patch.cancellationReason !== undefined) {
    updatePayload.cancellation_reason = patch.cancellationReason;
  }

  if (Object.keys(updatePayload).length === 0) {
    return getEmergencyRequestById(requestId);
  }

  let { error } = await supabaseAdmin
    .from("emergency_requests")
    .update(updatePayload)
    .eq("id", requestId);

  if (error && "assigned_doctor_id" in updatePayload && isMissingAssignedDoctorSchema(error)) {
    hasAssignedDoctorColumn = false;
    delete updatePayload.assigned_doctor_id;

    if (Object.keys(updatePayload).length === 0) {
      return getEmergencyRequestById(requestId);
    }

    ({ error } = await supabaseAdmin
      .from("emergency_requests")
      .update(updatePayload)
      .eq("id", requestId));
  }

  if (error && "assigned_ambulance_id" in updatePayload && isMissingAssignedAmbulanceSchema(error)) {
    hasAssignedAmbulanceColumn = false;
    delete updatePayload.assigned_ambulance_id;

    if (Object.keys(updatePayload).length === 0) {
      return getEmergencyRequestById(requestId);
    }

    ({ error } = await supabaseAdmin
      .from("emergency_requests")
      .update(updatePayload)
      .eq("id", requestId));
  }

  if (!error && patch.assignedDoctorId !== undefined) {
    hasAssignedDoctorColumn = true;
  }
  if (!error && patch.assignedAmbulanceId !== undefined) {
    hasAssignedAmbulanceColumn = true;
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_UPDATE_FAILED");
  }

  if (!hydrate) {
    return {
      id: requestId,
      status: patch.status,
      assignedHospitalId: patch.assignedHospitalId,
      assignedDoctorId: patch.assignedDoctorId,
      assignedAmbulanceId: patch.assignedAmbulanceId,
      cancellationReason: patch.cancellationReason
    };
  }

  return getEmergencyRequestById(requestId);
}

export async function createRequestAttempt(requestId, attempt) {
  const { error } = await supabaseAdmin.from("request_attempts").insert({
    emergency_request_id: requestId,
    hospital_id: attempt.hospitalId,
    radius_km: attempt.radiusKm,
    score: attempt.score,
    distance_km: attempt.distanceKm,
    decision: "pending"
  });

  if (error) {
    throw new HttpError(500, error.message, "DB_ATTEMPT_CREATE_FAILED");
  }
}

export async function closeLatestAttempt(requestId, decision, reason = null) {
  const { data: latestAttempt, error: latestError } = await supabaseAdmin
    .from("request_attempts")
    .select("id")
    .eq("emergency_request_id", requestId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestError) {
    throw new HttpError(500, latestError.message, "DB_ATTEMPT_FETCH_LATEST_FAILED");
  }

  if (!latestAttempt?.id) {
    return;
  }

  const { error: updateError } = await supabaseAdmin
    .from("request_attempts")
    .update({ decision, decision_at: new Date().toISOString(), reason })
    .eq("id", latestAttempt.id);

  if (updateError) {
    throw new HttpError(500, updateError.message, "DB_ATTEMPT_CLOSE_FAILED");
  }
}

export async function listPendingAttempts(requestId) {
  const { data, error } = await supabaseAdmin
    .from("request_attempts")
    .select("id,hospital_id,radius_km,score,distance_km,created_at")
    .eq("emergency_request_id", requestId)
    .eq("decision", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new HttpError(500, error.message, "DB_ATTEMPT_PENDING_LIST_FAILED");
  }

  return (data || []).map((row) => ({
    id: row.id,
    hospitalId: row.hospital_id,
    radiusKm: row.radius_km,
    score: Number(row.score || 0),
    distanceKm: Number(row.distance_km || 0),
    reservedAt: row.created_at
  }));
}

export async function closeAttemptByHospital(requestId, hospitalId, decision, reason = null) {
  const { data: target, error: targetError } = await supabaseAdmin
    .from("request_attempts")
    .select("id")
    .eq("emergency_request_id", requestId)
    .eq("hospital_id", hospitalId)
    .eq("decision", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (targetError) {
    throw new HttpError(500, targetError.message, "DB_ATTEMPT_TARGET_LOOKUP_FAILED");
  }

  if (!target?.id) {
    return false;
  }

  const { error: updateError } = await supabaseAdmin
    .from("request_attempts")
    .update({ decision, decision_at: new Date().toISOString(), reason })
    .eq("id", target.id);

  if (updateError) {
    throw new HttpError(500, updateError.message, "DB_ATTEMPT_TARGET_CLOSE_FAILED");
  }

  return true;
}

export async function closePendingAttemptsExcept(requestId, excludeHospitalId, decision, reason = null) {
  const { error } = await supabaseAdmin
    .from("request_attempts")
    .update({ decision, decision_at: new Date().toISOString(), reason })
    .eq("emergency_request_id", requestId)
    .eq("decision", "pending")
    .neq("hospital_id", excludeHospitalId);

  if (error) {
    throw new HttpError(500, error.message, "DB_ATTEMPT_BULK_CLOSE_FAILED");
  }
}

export async function listEmergencyRequests({ status, assignedHospitalId, offeredHospitalId, limit = 25, includePreviousRecords = true, includeAttempts = true } = {}) {
  let scopedRequestIds = null;

  if (offeredHospitalId) {
    const { data: attemptRows, error: attemptError } = await supabaseAdmin
      .from("request_attempts")
      .select("emergency_request_id")
      .eq("hospital_id", offeredHospitalId);

    if (attemptError) {
      throw new HttpError(500, attemptError.message, "DB_EMERGENCY_OFFER_SCOPE_FAILED");
    }

    const { data: acceptedRows, error: acceptedError } = await supabaseAdmin
      .from("emergency_requests")
      .select("id")
      .eq("assigned_hospital_id", offeredHospitalId);

    if (acceptedError) {
      throw new HttpError(500, acceptedError.message, "DB_EMERGENCY_ASSIGNED_SCOPE_FAILED");
    }

    const unionIds = new Set([
      ...(attemptRows || []).map((row) => row.emergency_request_id),
      ...(acceptedRows || []).map((row) => row.id)
    ]);

    if (unionIds.size === 0) {
      return [];
    }

    scopedRequestIds = [...unionIds];
  }

  let query = supabaseAdmin
    .from("emergency_requests")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(100, Number(limit) || 25)));

  if (status) {
    query = query.eq("status", status);
  }

  if (assignedHospitalId) {
    query = query.eq("assigned_hospital_id", assignedHospitalId);
  }

  if (scopedRequestIds) {
    query = query.in("id", scopedRequestIds);
  }

  const { data, error } = await query;

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_LIST_FAILED");
  }

  const rows = data || [];
  if (rows.length === 0) {
    return [];
  }

  let previousRecordsMap = new Map();
  if (includePreviousRecords) {
    const callerPhones = [...new Set(rows.map((row) => String(row.caller_phone || "")).filter(Boolean))];
    if (callerPhones.length > 0) {
      const { data: historyRows, error: historyError } = await supabaseAdmin
        .from("emergency_requests")
        .select("id,status,emergency_type,patient_name,caller_phone,created_at")
        .in("caller_phone", callerPhones)
        .order("created_at", { ascending: false });

      if (historyError) {
        throw new HttpError(500, historyError.message, "DB_EMERGENCY_HISTORY_BATCH_LOOKUP_FAILED");
      }

      previousRecordsMap = buildPreviousRecordsSummaryMap(historyRows || []);
    }
  }

  const requestIds = rows.map((row) => row.id);
  let attemptRows = [];
  if (includeAttempts) {
    const attemptsResult = await supabaseAdmin
      .from("request_attempts")
      .select("emergency_request_id,id,hospital_id,radius_km,score,distance_km,decision,decision_at,reason,created_at")
      .in("emergency_request_id", requestIds)
      .order("created_at", { ascending: true });

    if (attemptsResult.error) {
      throw new HttpError(500, attemptsResult.error.message, "DB_ATTEMPT_LIST_FAILED");
    }

    attemptRows = attemptsResult.data || [];
  }

  const hospitalIds = new Set();
  for (const row of rows) {
    if (row.assigned_hospital_id) {
      hospitalIds.add(row.assigned_hospital_id);
    }
  }
  for (const attempt of attemptRows) {
    if (attempt.hospital_id) {
      hospitalIds.add(attempt.hospital_id);
    }
  }

  let hospitalNameMap = new Map();
  if (hospitalIds.size > 0) {
    const { data: hospitals, error: hospitalsError } = await supabaseAdmin
      .from("hospitals")
      .select("id,name")
      .in("id", [...hospitalIds]);

    if (hospitalsError) {
      throw new HttpError(500, hospitalsError.message, "DB_EMERGENCY_HOSPITAL_LOOKUP_FAILED");
    }

    hospitalNameMap = new Map((hospitals || []).map((hospital) => [hospital.id, hospital.name]));
  }

  const doctorIds = [...new Set(rows.map((row) => row.assigned_doctor_id).filter(Boolean))];
  let doctorNameMap = new Map();
  if (doctorIds.length > 0) {
    const { data: doctors, error: doctorsError } = await supabaseAdmin
      .from("doctors")
      .select("id,full_name")
      .in("id", doctorIds);

    if (doctorsError) {
      throw new HttpError(500, doctorsError.message, "DB_EMERGENCY_DOCTOR_LOOKUP_FAILED");
    }

    doctorNameMap = new Map((doctors || []).map((doctor) => [doctor.id, doctor.full_name]));
  }

  const ambulanceIds = [...new Set(rows.map((row) => row.assigned_ambulance_id).filter(Boolean))];
  let ambulanceMap = new Map();
  if (ambulanceIds.length > 0) {
    let { data: ambulances, error: ambulancesError } = await supabaseAdmin
      .from("ambulances")
      .select("id,vehicle_number,mobile_number,ambulance_type,latitude,longitude")
      .in("id", ambulanceIds);

    if (ambulancesError && (isMissingAmbulanceMobileSchema(ambulancesError) || isMissingAmbulanceCoordinateSchema(ambulancesError))) {
      const fallback = await supabaseAdmin
        .from("ambulances")
        .select("id,vehicle_number,ambulance_type,latitude,longitude")
        .in("id", ambulanceIds);

      ambulances = fallback.data;
      ambulancesError = fallback.error;

      if (ambulancesError && isMissingAmbulanceCoordinateSchema(ambulancesError)) {
        const noCoordinateFallback = await supabaseAdmin
          .from("ambulances")
          .select("id,vehicle_number,ambulance_type")
          .in("id", ambulanceIds);

        ambulances = noCoordinateFallback.data;
        ambulancesError = noCoordinateFallback.error;
      }
    }

    if (ambulancesError) {
      throw new HttpError(500, ambulancesError.message, "DB_EMERGENCY_AMBULANCE_LOOKUP_FAILED");
    }

    ambulanceMap = new Map((ambulances || []).map((ambulance) => [
      ambulance.id,
      {
        vehicleNumber: ambulance.vehicle_number,
        mobileNumber: ambulance.mobile_number || fallbackAmbulanceMobile(ambulance.vehicle_number) || null,
        ambulanceType: ambulance.ambulance_type,
        location: {
          latitude: Number(ambulance.latitude || 0),
          longitude: Number(ambulance.longitude || 0)
        }
      }
    ]));
  }

  const { data: roomRows, error: roomRowsError } = await supabaseAdmin
    .from("room_allotments")
    .select("patient_id,room_number,allotted_at")
    .in("patient_id", requestIds)
    .order("allotted_at", { ascending: false });

  if (roomRowsError) {
    throw new HttpError(500, roomRowsError.message, "DB_EMERGENCY_ROOM_LOOKUP_FAILED");
  }

  const roomMap = new Map();
  for (const room of roomRows || []) {
    if (!roomMap.has(room.patient_id)) {
      roomMap.set(room.patient_id, room.room_number);
    }
  }

  const attemptsByRequest = new Map();
  for (const attempt of attemptRows) {
    if (!attemptsByRequest.has(attempt.emergency_request_id)) {
      attemptsByRequest.set(attempt.emergency_request_id, []);
    }
    attemptsByRequest.get(attempt.emergency_request_id).push({
      id: attempt.id,
      hospitalId: attempt.hospital_id,
      hospitalName: hospitalNameMap.get(attempt.hospital_id) || null,
      radiusKm: attempt.radius_km,
      score: Number(attempt.score || 0),
      distanceKm: Number(attempt.distance_km || 0),
      status: attempt.decision,
      reservedAt: attempt.created_at,
      rejectedAt: attempt.decision === "rejected" ? attempt.decision_at : null,
      rejectionReason: attempt.reason || null
    });
  }

  const mapped = [];
  for (const row of rows) {
    const previousRecords = includePreviousRecords
      ? (previousRecordsMap.get(row.id) || {
          totalPreviousRequests: 0,
          matchingNameCount: 0,
          lastRequestAt: null,
          recentHistory: []
        })
      : null;

    mapped.push(
      mapEmergency(
        row,
        attemptsByRequest.get(row.id) || [],
        hospitalNameMap.get(row.assigned_hospital_id) || null,
        doctorNameMap.get(row.assigned_doctor_id) || null,
        ambulanceMap.get(row.assigned_ambulance_id) || null,
        roomMap.get(row.id) || null,
        previousRecords
      )
    );
  }

  return mapped;
}

export async function listEmergencyRequestsLite({ status, offeredHospitalId, limit = 120 } = {}) {
  let scopedRequestIds = null;

  if (offeredHospitalId) {
    const { data: attemptRows, error: attemptError } = await supabaseAdmin
      .from("request_attempts")
      .select("emergency_request_id")
      .eq("hospital_id", offeredHospitalId);

    if (attemptError) {
      throw new HttpError(500, attemptError.message, "DB_EMERGENCY_OFFER_SCOPE_FAILED");
    }

    const { data: acceptedRows, error: acceptedError } = await supabaseAdmin
      .from("emergency_requests")
      .select("id")
      .eq("assigned_hospital_id", offeredHospitalId);

    if (acceptedError) {
      throw new HttpError(500, acceptedError.message, "DB_EMERGENCY_ASSIGNED_SCOPE_FAILED");
    }

    const unionIds = new Set([
      ...(attemptRows || []).map((row) => row.emergency_request_id),
      ...(acceptedRows || []).map((row) => row.id)
    ]);

    if (unionIds.size === 0) {
      return [];
    }

    scopedRequestIds = [...unionIds];
  }

  let query = supabaseAdmin
    .from("emergency_requests")
    .select("id,status,patient_name,created_at")
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(250, Number(limit) || 120)));

  if (status) {
    query = query.eq("status", status);
  }

  if (scopedRequestIds) {
    query = query.in("id", scopedRequestIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_LITE_LIST_FAILED");
  }

  return (data || []).map((row) => ({
    id: row.id,
    status: row.status,
    patientName: row.patient_name,
    createdAt: row.created_at
  }));
}

export async function createEmergencyRequestMedia({ requestId, uploadedByRole, uploadedByHospitalId, mediaType, mimeType, filePath, originalFileName, note, aiGuidance }) {
  if (!hasEmergencyRequestMediaTable) {
    return createMediaInFallbackStore({
      requestId,
      uploadedByRole,
      uploadedByHospitalId,
      mediaType,
      mimeType,
      filePath,
      originalFileName,
      note,
      aiGuidance
    });
  }

  const { data, error } = await supabaseAdmin
    .from("emergency_request_media")
    .insert({
      emergency_request_id: requestId,
      uploaded_by_role: uploadedByRole || "public_requester",
      uploaded_by_hospital_id: uploadedByHospitalId || null,
      media_type: mediaType,
      mime_type: mimeType,
      file_path: filePath,
      original_file_name: originalFileName,
      note: note || null,
      ai_guidance: aiGuidance || null
    })
    .select("id,emergency_request_id,uploaded_by_role,uploaded_by_hospital_id,media_type,mime_type,file_path,original_file_name,note,ai_guidance,created_at")
    .single();

  if (error && isMissingEmergencyMediaSchema(error)) {
    hasEmergencyRequestMediaTable = false;
    return createMediaInFallbackStore({
      requestId,
      uploadedByRole,
      uploadedByHospitalId,
      mediaType,
      mimeType,
      filePath,
      originalFileName,
      note,
      aiGuidance
    });
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_MEDIA_CREATE_FAILED");
  }

  hasEmergencyRequestMediaTable = true;
  return toMediaDto(data);
}

export async function listEmergencyRequestMedia(requestId) {
  if (!hasEmergencyRequestMediaTable) {
    return listMediaFromFallbackStore(requestId);
  }

  const { data, error } = await supabaseAdmin
    .from("emergency_request_media")
    .select("id,emergency_request_id,uploaded_by_role,uploaded_by_hospital_id,media_type,mime_type,file_path,original_file_name,note,ai_guidance,created_at")
    .eq("emergency_request_id", requestId)
    .order("created_at", { ascending: false });

  if (error && isMissingEmergencyMediaSchema(error)) {
    hasEmergencyRequestMediaTable = false;
    return listMediaFromFallbackStore(requestId);
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_MEDIA_LIST_FAILED");
  }

  hasEmergencyRequestMediaTable = true;
  return (data || []).map(toMediaDto);
}
