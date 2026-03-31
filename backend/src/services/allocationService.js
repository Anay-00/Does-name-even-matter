import { env } from "../config/env.js";
import {
  getHospitalById,
  hasResources,
  listActiveHospitalsByCity,
  releaseResources,
  reserveResources
} from "../repositories/hospitalRepository.js";
import { listEmergencyWardCapacityByHospitalIds } from "../repositories/operationsRepository.js";
import { distanceKm } from "./distanceService.js";

const activeDecisionTimers = new Map();

export function clearDecisionTimer(requestId) {
  const timer = activeDecisionTimers.get(requestId);
  if (timer) {
    clearTimeout(timer);
    activeDecisionTimers.delete(requestId);
  }
}

export function scoreHospital({ hospital, patientLocation, resources }) {
  const km = distanceKm(patientLocation, {
    latitude: hospital.latitude,
    longitude: hospital.longitude
  });

  const distanceScore = Math.max(0, 100 - km * 3);
  const availabilityScore = resources.reduce((total, resource) => {
    const count = Number(hospital.resources[resource] || 0);
    return total + Math.min(20, count * 4);
  }, 0);
  const loadScore = Math.max(0, 100 - Math.round(hospital.loadFactor * 100));

  const score = distanceScore * 0.55 + availabilityScore * 0.3 + loadScore * 0.15;
  return { score, distanceKm: km };
}

export async function findBestHospitalCandidates({ city, patientLocation, requestedResources, radiusKm, emergencyType }) {
  const hospitals = await listActiveHospitalsByCity(city);
  const needsBed = requestedResources.includes("icu_bed") || requestedResources.includes("normal_bed");

  const scored = hospitals
    .filter((hospital) => hasResources(hospital, requestedResources))
    .map((hospital) => {
      const scoring = scoreHospital({ hospital, patientLocation, resources: requestedResources });
      return {
        hospital,
        distanceKm: scoring.distanceKm,
        score: scoring.score
      };
    });

  let candidates = scored;
  if (needsBed) {
    const capacityMap = await listEmergencyWardCapacityByHospitalIds({
      hospitalIds: scored.map((candidate) => candidate.hospital.id),
      emergencyType
    });

    candidates = scored.filter((candidate) => Boolean(capacityMap.get(candidate.hospital.id)));
  }

  return candidates
    .filter((candidate) => candidate.distanceKm <= radiusKm)
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm);
}

export async function tryReserveHospitalResources({ hospitalId, requestedResources }) {
  return reserveResources(hospitalId, requestedResources);
}

export async function releaseHospitalReservation({ hospitalId, requestedResources }) {
  await releaseResources(hospitalId, requestedResources);
}

export function startDecisionWindow({ requestId, onTimeout }) {
  clearDecisionTimer(requestId);
  const timeoutMs = env.ALLOCATION_DECISION_WINDOW_SECONDS * 1000;
  const timer = setTimeout(() => {
    activeDecisionTimers.delete(requestId);
    Promise.resolve(onTimeout()).catch(() => {
      // ignore timer callback failures to avoid process crash
    });
  }, timeoutMs);
  activeDecisionTimers.set(requestId, timer);
}

export async function getHospitalSnapshot(hospitalId) {
  return getHospitalById(hospitalId);
}
