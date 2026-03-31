import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";
import { env } from "../config/env.js";
import { getOrCreateCityId, listActiveHospitalsByCity } from "./hospitalRepository.js";

function toPoint(longitude, latitude) {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

function isMissingAmbulanceCoordinateColumn(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    message.includes("ambulances.latitude") ||
    (message.includes("ambulances") && (message.includes("'latitude'") || message.includes("'longitude'")))
  );
}

function isMissingAmbulanceMobileColumn(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  return message.includes("mobile_number") && message.includes("ambulances");
}

function fallbackAmbulanceMobile(vehicleNumber) {
  const digits = String(vehicleNumber || "").replace(/\D/g, "");
  return digits.slice(-10).padStart(10, "9");
}

let networkSeedPromise = null;
let networkSeedCompleted = false;

const TARGET_AMBULANCES_PER_HOSPITAL = 5;

function buildSeedVehicleNumber(hospitalCode, serial) {
  return `${hospitalCode}-EMS-${String(serial).padStart(2, "0")}`;
}

async function ensureNetworkSeed(cityName) {
  if (networkSeedCompleted) {
    return;
  }

  if (networkSeedPromise) {
    return networkSeedPromise;
  }

  networkSeedPromise = (async () => {
    const resolvedCityName = cityName || env.CITY_DEFAULT;
    const cityId = await getOrCreateCityId(resolvedCityName);
    const hospitals = await listActiveHospitalsByCity(resolvedCityName);

    const { data: existingProviders, error: providerListError } = await supabaseAdmin
      .from("ambulance_providers")
      .select("id")
      .eq("city_id", cityId)
      .limit(1);

    if (providerListError) {
      throw new HttpError(500, providerListError.message, "DB_PROVIDER_SEED_LOOKUP_FAILED");
    }

    if (!existingProviders || existingProviders.length === 0) {
      const { error: providerSeedError } = await supabaseAdmin.from("ambulance_providers").insert({
        city_id: cityId,
        name: "MediSync Rapid Response Partner",
        is_active: true
      });

      if (providerSeedError) {
        throw new HttpError(500, providerSeedError.message, "DB_PROVIDER_SEED_FAILED");
      }
    }

    const { data: fleetRows, error: fleetCountError } = await supabaseAdmin
      .from("ambulances")
      .select("id,hospital_id,provider_id,vehicle_number")
      .eq("city_id", cityId);

    if (fleetCountError) {
      throw new HttpError(500, fleetCountError.message, "DB_AMBULANCE_SEED_LOOKUP_FAILED");
    }

    const { data: providers, error: providerFetchError } = await supabaseAdmin
      .from("ambulance_providers")
      .select("id")
      .eq("city_id", cityId)
      .order("created_at", { ascending: true });

    if (providerFetchError) {
      throw new HttpError(500, providerFetchError.message, "DB_PROVIDER_SEED_FETCH_FAILED");
    }

    const providerId = providers?.[0]?.id || null;
    const existingFleet = fleetRows || [];
    const existingVehicles = new Set(existingFleet.map((item) => item.vehicle_number));
    const fleetByHospital = new Map();
    for (const row of existingFleet) {
      if (!row.hospital_id) {
        continue;
      }
      fleetByHospital.set(row.hospital_id, (fleetByHospital.get(row.hospital_id) || 0) + 1);
    }

    for (const hospital of hospitals || []) {
      const existingCount = fleetByHospital.get(hospital.id) || 0;
      for (let serial = existingCount + 1; serial <= TARGET_AMBULANCES_PER_HOSPITAL; serial += 1) {
        const vehicleNumber = buildSeedVehicleNumber(hospital.code, serial);
        if (existingVehicles.has(vehicleNumber)) {
          continue;
        }

        await createAmbulanceUnit({
          cityName: resolvedCityName,
          hospitalId: hospital.id,
          providerId: null,
          ownerType: "hospital",
          vehicleNumber,
          ambulanceType: serial <= 2 ? "ALS" : serial <= 4 ? "BLS" : "ICU",
          latitude: Number(hospital.latitude || 22.72),
          longitude: Number(hospital.longitude || 75.86)
        });

        existingVehicles.add(vehicleNumber);
      }
    }

    const hasProviderOwned = existingFleet.some((item) => item.provider_id);
    if (providerId && !hasProviderOwned) {
      const providerVehicle = `CITY-PROVIDER-EMS-01`;
      if (!existingVehicles.has(providerVehicle)) {
        await createAmbulanceUnit({
          cityName: resolvedCityName,
          hospitalId: null,
          providerId,
          ownerType: "provider",
          vehicleNumber: providerVehicle,
          ambulanceType: "ICU",
          latitude: 22.8292,
          longitude: 75.9498
        });
      }
    }
  })();

  try {
    await networkSeedPromise;
    networkSeedCompleted = true;
  } finally {
    networkSeedPromise = null;
  }
}

export async function listHospitalsForAdmin(cityName) {
  await listActiveHospitalsByCity(cityName || env.CITY_DEFAULT);
  const cityId = await getOrCreateCityId(cityName);

  const { data: hospitals, error } = await supabaseAdmin
    .from("hospitals")
    .select("id,code,name,address,landmark,is_active,current_load,reliability_score,latitude,longitude,city_id")
    .eq("city_id", cityId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_ADMIN_HOSPITAL_LIST_FAILED");
  }

  const hospitalIds = (hospitals || []).map((h) => h.id);
  const resourcesByHospital = new Map();

  if (hospitalIds.length) {
    const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
      .from("resource_inventory")
      .select("hospital_id,resource_type,available_count,total_count,blocked_count")
      .in("hospital_id", hospitalIds)
      .is("department_id", null);

    if (inventoryError) {
      throw new HttpError(500, inventoryError.message, "DB_ADMIN_INVENTORY_LIST_FAILED");
    }

    for (const row of inventoryRows || []) {
      if (!resourcesByHospital.has(row.hospital_id)) {
        resourcesByHospital.set(row.hospital_id, {});
      }
      resourcesByHospital.get(row.hospital_id)[row.resource_type] = {
        available: Number(row.available_count || 0),
        total: Number(row.total_count || 0),
        blocked: Number(row.blocked_count || 0)
      };
    }
  }

  return (hospitals || []).map((hospital) => ({
    id: hospital.id,
    code: hospital.code,
    name: hospital.name,
    address: hospital.address,
    landmark: hospital.landmark,
    isActive: Boolean(hospital.is_active),
    loadFactor: Number(hospital.current_load || 0),
    reliabilityScore: Number(hospital.reliability_score || 0),
    latitude: Number(hospital.latitude || 0),
    longitude: Number(hospital.longitude || 0),
    resources: resourcesByHospital.get(hospital.id) || {}
  }));
}

export async function onboardHospital({ cityName, code, name, address, landmark, latitude, longitude }) {
  const cityId = await getOrCreateCityId(cityName);
  const payload = {
    city_id: cityId,
    code,
    name,
    address,
    landmark: landmark || null,
    location: toPoint(longitude, latitude),
    latitude,
    longitude,
    is_active: false,
    current_load: 0,
    reliability_score: 50
  };

  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .insert(payload)
    .select("id,code,name,is_active,latitude,longitude")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_HOSPITAL_ONBOARD_FAILED");
  }

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    isActive: Boolean(data.is_active),
    latitude: Number(data.latitude || 0),
    longitude: Number(data.longitude || 0)
  };
}

export async function approveHospitalOnboarding(hospitalId) {
  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .update({ is_active: true })
    .eq("id", hospitalId)
    .select("id,code,name,is_active")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_HOSPITAL_APPROVE_FAILED");
  }

  return {
    id: data.id,
    code: data.code,
    name: data.name,
    isActive: Boolean(data.is_active)
  };
}

export async function listAmbulanceProviders(cityName) {
  await ensureNetworkSeed(cityName || env.CITY_DEFAULT);
  const cityId = await getOrCreateCityId(cityName);
  const { data, error } = await supabaseAdmin
    .from("ambulance_providers")
    .select("id,name,is_active,created_at")
    .eq("city_id", cityId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_PROVIDER_LIST_FAILED");
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    isActive: Boolean(item.is_active),
    createdAt: item.created_at
  }));
}

export async function onboardAmbulanceProvider({ cityName, name }) {
  const cityId = await getOrCreateCityId(cityName);
  const { data, error } = await supabaseAdmin
    .from("ambulance_providers")
    .insert({ city_id: cityId, name, is_active: true })
    .select("id,name,is_active,created_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_PROVIDER_ONBOARD_FAILED");
  }

  return {
    id: data.id,
    name: data.name,
    isActive: Boolean(data.is_active),
    createdAt: data.created_at
  };
}

export async function listAmbulancesByCity(cityName) {
  await ensureNetworkSeed(cityName || env.CITY_DEFAULT);
  const cityId = await getOrCreateCityId(cityName);
  let { data, error } = await supabaseAdmin
    .from("ambulances")
    .select("id,city_id,hospital_id,provider_id,owner_type,vehicle_number,ambulance_type,mobile_number,trip_status,is_active,latitude,longitude,gps_updated_at")
    .eq("city_id", cityId)
    .order("created_at", { ascending: false });

  if (error && (isMissingAmbulanceCoordinateColumn(error) || isMissingAmbulanceMobileColumn(error))) {
    const fallback = await supabaseAdmin
      .from("ambulances")
      .select("id,city_id,hospital_id,provider_id,owner_type,vehicle_number,ambulance_type,trip_status,is_active,latitude,longitude,gps_updated_at")
      .eq("city_id", cityId)
      .order("created_at", { ascending: false });

    data = fallback.data;
    error = fallback.error;

    if (error && isMissingAmbulanceCoordinateColumn(error)) {
      const noCoordinateFallback = await supabaseAdmin
        .from("ambulances")
        .select("id,city_id,hospital_id,provider_id,owner_type,vehicle_number,ambulance_type,trip_status,is_active,gps_updated_at")
        .eq("city_id", cityId)
        .order("created_at", { ascending: false });

      data = noCoordinateFallback.data;
      error = noCoordinateFallback.error;
    }
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_AMBULANCE_LIST_FAILED");
  }

  return (data || []).map((item) => ({
    id: item.id,
    cityId: item.city_id,
    hospitalId: item.hospital_id,
    providerId: item.provider_id,
    ownerType: item.owner_type,
    vehicleNumber: item.vehicle_number,
    ambulanceType: item.ambulance_type,
    mobileNumber: item.mobile_number || fallbackAmbulanceMobile(item.vehicle_number),
    tripStatus: item.trip_status,
    isActive: Boolean(item.is_active),
    latitude: Number(item.latitude || 0),
    longitude: Number(item.longitude || 0),
    gpsUpdatedAt: item.gps_updated_at
  }));
}

export async function createAmbulanceUnit({
  cityName,
  hospitalId,
  providerId,
  ownerType,
  vehicleNumber,
  ambulanceType,
  mobileNumber,
  latitude,
  longitude
}) {
  const cityId = await getOrCreateCityId(cityName);
  const payload = {
    city_id: cityId,
    hospital_id: hospitalId || null,
    provider_id: providerId || null,
    owner_type: ownerType,
    vehicle_number: vehicleNumber,
    ambulance_type: ambulanceType,
    mobile_number: mobileNumber,
    current_location: toPoint(longitude, latitude),
    latitude,
    longitude,
    gps_updated_at: new Date().toISOString(),
    trip_status: "idle",
    is_active: true
  };

  let { data, error } = await supabaseAdmin
    .from("ambulances")
    .insert(payload)
    .select("id,city_id,hospital_id,provider_id,vehicle_number,owner_type,ambulance_type,mobile_number,trip_status,latitude,longitude")
    .single();

  if (error && isMissingAmbulanceMobileColumn(error)) {
    const fallbackWithoutMobile = await supabaseAdmin
      .from("ambulances")
      .insert({
        ...payload,
        mobile_number: undefined
      })
      .select("id,city_id,hospital_id,provider_id,vehicle_number,owner_type,ambulance_type,trip_status,latitude,longitude")
      .single();

    data = fallbackWithoutMobile.data;
    error = fallbackWithoutMobile.error;
  }

  if (error && isMissingAmbulanceCoordinateColumn(error)) {
    const fallback = await supabaseAdmin
      .from("ambulances")
      .insert({
        ...payload,
        latitude: undefined,
        longitude: undefined
      })
      .select("id,city_id,hospital_id,provider_id,vehicle_number,owner_type,ambulance_type,trip_status")
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_AMBULANCE_CREATE_FAILED");
  }

  return {
    id: data.id,
    cityId: data.city_id,
    hospitalId: data.hospital_id,
    providerId: data.provider_id,
    vehicleNumber: data.vehicle_number,
    ownerType: data.owner_type,
    ambulanceType: data.ambulance_type,
    mobileNumber: data.mobile_number || mobileNumber || fallbackAmbulanceMobile(data.vehicle_number),
    tripStatus: data.trip_status,
    latitude: Number(data.latitude || 0),
    longitude: Number(data.longitude || 0)
  };
}

export async function updateAmbulanceGps(ambulanceId, { latitude, longitude }) {
  let { data, error } = await supabaseAdmin
    .from("ambulances")
    .update({
      current_location: toPoint(longitude, latitude),
      latitude,
      longitude,
      gps_updated_at: new Date().toISOString()
    })
    .eq("id", ambulanceId)
    .select("id,vehicle_number,trip_status,latitude,longitude,gps_updated_at")
    .single();

  if (error && isMissingAmbulanceCoordinateColumn(error)) {
    const fallback = await supabaseAdmin
      .from("ambulances")
      .update({
        current_location: toPoint(longitude, latitude),
        gps_updated_at: new Date().toISOString()
      })
      .eq("id", ambulanceId)
      .select("id,vehicle_number,trip_status,gps_updated_at")
      .single();

    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_AMBULANCE_LOCATION_UPDATE_FAILED");
  }

  return {
    id: data.id,
    vehicleNumber: data.vehicle_number,
    tripStatus: data.trip_status,
    latitude: Number(data.latitude || 0),
    longitude: Number(data.longitude || 0),
    gpsUpdatedAt: data.gps_updated_at
  };
}

export async function getAmbulanceById(ambulanceId) {
  let { data, error } = await supabaseAdmin
    .from("ambulances")
    .select("id,city_id,hospital_id,provider_id,owner_type,vehicle_number,ambulance_type,mobile_number,trip_status,is_active,latitude,longitude,gps_updated_at")
    .eq("id", ambulanceId)
    .maybeSingle();

  if (error && (isMissingAmbulanceCoordinateColumn(error) || isMissingAmbulanceMobileColumn(error))) {
    const fallback = await supabaseAdmin
      .from("ambulances")
      .select("id,city_id,hospital_id,provider_id,owner_type,vehicle_number,ambulance_type,trip_status,is_active,latitude,longitude,gps_updated_at")
      .eq("id", ambulanceId)
      .maybeSingle();

    data = fallback.data;
    error = fallback.error;

    if (error && isMissingAmbulanceCoordinateColumn(error)) {
      const noCoordinateFallback = await supabaseAdmin
        .from("ambulances")
        .select("id,city_id,hospital_id,provider_id,owner_type,vehicle_number,ambulance_type,trip_status,is_active,gps_updated_at")
        .eq("id", ambulanceId)
        .maybeSingle();

      data = noCoordinateFallback.data;
      error = noCoordinateFallback.error;
    }
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_AMBULANCE_GET_FAILED");
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    cityId: data.city_id,
    hospitalId: data.hospital_id,
    providerId: data.provider_id,
    ownerType: data.owner_type,
    vehicleNumber: data.vehicle_number,
    ambulanceType: data.ambulance_type,
    mobileNumber: data.mobile_number || fallbackAmbulanceMobile(data.vehicle_number),
    tripStatus: data.trip_status,
    isActive: Boolean(data.is_active),
    latitude: Number(data.latitude || 0),
    longitude: Number(data.longitude || 0),
    gpsUpdatedAt: data.gps_updated_at
  };
}

export async function updateAmbulanceTripStatus(ambulanceId, tripStatus) {
  const { data, error } = await supabaseAdmin
    .from("ambulances")
    .update({ trip_status: tripStatus })
    .eq("id", ambulanceId)
    .select("id,vehicle_number,trip_status")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_AMBULANCE_TRIP_UPDATE_FAILED");
  }

  return {
    id: data.id,
    vehicleNumber: data.vehicle_number,
    tripStatus: data.trip_status
  };
}

export async function findAssignableAmbulanceForHospital(hospitalId) {
  await ensureNetworkSeed(env.CITY_DEFAULT);

  let { data, error } = await supabaseAdmin
    .from("ambulances")
    .select("id,hospital_id,vehicle_number,ambulance_type,mobile_number,trip_status,latitude,longitude")
    .eq("hospital_id", hospitalId)
    .eq("is_active", true)
    .eq("trip_status", "idle")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error && (isMissingAmbulanceCoordinateColumn(error) || isMissingAmbulanceMobileColumn(error))) {
    const fallback = await supabaseAdmin
      .from("ambulances")
      .select("id,hospital_id,vehicle_number,ambulance_type,trip_status,latitude,longitude")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .eq("trip_status", "idle")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    data = fallback.data;
    error = fallback.error;

    if (error && isMissingAmbulanceCoordinateColumn(error)) {
      const noCoordinateFallback = await supabaseAdmin
        .from("ambulances")
        .select("id,hospital_id,vehicle_number,ambulance_type,trip_status")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .eq("trip_status", "idle")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      data = noCoordinateFallback.data;
      error = noCoordinateFallback.error;
    }
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_AMBULANCE_ASSIGNABLE_LOOKUP_FAILED");
  }

  if (!data?.id) {
    let fallback = await supabaseAdmin
      .from("ambulances")
      .select("id,hospital_id,vehicle_number,ambulance_type,trip_status,latitude,longitude")
      .eq("hospital_id", hospitalId)
      .eq("is_active", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallback.error && isMissingAmbulanceCoordinateColumn(fallback.error)) {
      fallback = await supabaseAdmin
        .from("ambulances")
        .select("id,hospital_id,vehicle_number,ambulance_type,trip_status")
        .eq("hospital_id", hospitalId)
        .eq("is_active", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
    }

    if (fallback.error) {
      throw new HttpError(500, fallback.error.message, "DB_AMBULANCE_ASSIGNABLE_FALLBACK_FAILED");
    }

    data = fallback.data;
  }

  if (!data?.id) {
    return null;
  }

  return {
    id: data.id,
    hospitalId: data.hospital_id,
    vehicleNumber: data.vehicle_number,
    ambulanceType: data.ambulance_type,
    mobileNumber: data.mobile_number || fallbackAmbulanceMobile(data.vehicle_number),
    tripStatus: data.trip_status,
    latitude: Number(data.latitude || 0),
    longitude: Number(data.longitude || 0)
  };
}
