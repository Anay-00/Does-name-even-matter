import {
  createAmbulanceUnit,
  getAmbulanceById,
  listAmbulancesByCity,
  updateAmbulanceGps,
  updateAmbulanceTripStatus
} from "../repositories/networkRepository.js";
import { estimateEtaMinutes, buildNavigationLink, notifyDriverNavigation } from "../services/ambulanceService.js";
import { publishRealtimeEvent } from "../realtime/eventBus.js";
import { HttpError } from "../utils/httpError.js";

export async function listAmbulanceFleet(req, res, next) {
  try {
    const city = typeof req.query.city === "string" ? req.query.city : undefined;
    const items = await listAmbulancesByCity(city);
    const scoped = req.user?.role === "hospital_admin_staff"
      ? items.filter((item) => !req.user.hospitalId || item.hospitalId === req.user.hospitalId)
      : items;
    res.json({ items: scoped });
  } catch (error) {
    next(error);
  }
}

export async function registerAmbulance(req, res, next) {
  try {
    const payload = req.validatedBody;
    const created = await createAmbulanceUnit({
      cityName: payload.city,
      ownerType: payload.ownerType,
      hospitalId: payload.ownerType === "hospital" ? (payload.hospitalId || req.user?.hospitalId || null) : null,
      providerId: payload.ownerType === "provider" ? payload.providerId || null : null,
      vehicleNumber: payload.vehicleNumber,
      ambulanceType: payload.ambulanceType || "Standard",
      mobileNumber: payload.mobileNumber,
      latitude: payload.latitude,
      longitude: payload.longitude
    });

    publishRealtimeEvent("ambulance.registered", {
      ambulanceId: created.id,
      hospitalId: created.hospitalId || null,
      requestId: null,
      ownerType: created.ownerType
    });

    res.status(201).json(created);
  } catch (error) {
    next(error);
  }
}

export async function patchAmbulanceLocation(req, res, next) {
  try {
    const updated = await updateAmbulanceGps(req.params.id, req.validatedBody);

    publishRealtimeEvent("ambulance.location_updated", {
      requestId: null,
      ambulanceId: updated.id,
      latitude: updated.latitude,
      longitude: updated.longitude,
      tripStatus: updated.tripStatus
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
}

export async function dispatchAmbulance(req, res, next) {
  try {
    const ambulance = await getAmbulanceById(req.params.id);
    if (!ambulance) {
      throw new HttpError(404, "Ambulance not found", "AMBULANCE_NOT_FOUND");
    }

    const patientLocation = {
      latitude: req.validatedBody.patientLatitude,
      longitude: req.validatedBody.patientLongitude
    };

    const etaMinutes = estimateEtaMinutes({
      ambulanceLocation: { latitude: ambulance.latitude, longitude: ambulance.longitude },
      patientLocation
    });

    const navigationLink = buildNavigationLink(patientLocation);

    if (req.validatedBody.patientPhone) {
      await notifyDriverNavigation({
        phone: req.validatedBody.patientPhone,
        navigationLink,
        etaMinutes: etaMinutes ?? 0
      });
    }

    await updateAmbulanceTripStatus(ambulance.id, "dispatched");

    publishRealtimeEvent("ambulance.dispatched", {
      requestId: req.validatedBody.requestId || null,
      ambulanceId: ambulance.id,
      etaMinutes,
      navigationLink
    });

    res.json({
      ambulanceId: ambulance.id,
      requestId: req.validatedBody.requestId || null,
      etaMinutes,
      navigationLink,
      status: "dispatched"
    });
  } catch (error) {
    next(error);
  }
}
