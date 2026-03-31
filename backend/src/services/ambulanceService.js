import { env } from "../config/env.js";
import { distanceKm } from "./distanceService.js";
import { sendSms } from "./smsService.js";

export function estimateEtaMinutes({ ambulanceLocation, patientLocation }) {
  if (!ambulanceLocation || !patientLocation) {
    return null;
  }

  const ambulanceLat = Number(ambulanceLocation.latitude);
  const ambulanceLng = Number(ambulanceLocation.longitude);
  if (!Number.isFinite(ambulanceLat) || !Number.isFinite(ambulanceLng)) {
    return null;
  }

  // In pre-migration fallback mode, coordinate columns can be unavailable and default to 0.
  // Avoid returning misleading multi-hour ETAs from an invalid origin.
  if (Math.abs(ambulanceLat) < 0.000001 && Math.abs(ambulanceLng) < 0.000001) {
    return null;
  }

  const distance = distanceKm(
    { latitude: ambulanceLat, longitude: ambulanceLng },
    { latitude: Number(patientLocation.latitude), longitude: Number(patientLocation.longitude) }
  );

  const speedKmph = Math.max(10, Number(env.AMBULANCE_AVG_SPEED_KMPH || 35));
  const hours = distance / speedKmph;
  return Math.max(1, Math.round(hours * 60));
}

export function buildNavigationLink(patientLocation) {
  const lat = Number(patientLocation.latitude);
  const lng = Number(patientLocation.longitude);
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export async function notifyDriverNavigation({ phone, navigationLink, etaMinutes }) {
  const message = `MediSync Dispatch: Proceed to patient location. ETA ${etaMinutes} min. Route: ${navigationLink}`;
  return sendSms({ to: phone, message });
}
