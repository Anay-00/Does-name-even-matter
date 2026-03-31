import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";
import { env } from "../config/env.js";

const seedHospitals = [
  {
    code: "IND-AITR-01",
    name: "AitriCare Hospital",
    address: "Near Acropolis Institute of Technology & Research, Manglia, Indore",
    latitude: 22.8239,
    longitude: 75.9426,
    current_load: 0.32
  },
  {
    code: "IND-ACRO-02",
    name: "AcroLife Hospital",
    address: "Service Road, AB Bypass near Acropolis Campus, Indore",
    latitude: 22.8217,
    longitude: 75.9395,
    current_load: 0.37
  },
  {
    code: "IND-VIJAY-03",
    name: "VijayCare Hospital",
    address: "Scheme 54, Vijay Nagar, Indore",
    latitude: 22.7532,
    longitude: 75.8937,
    current_load: 0.35
  },
  {
    code: "IND-PALASIA-04",
    name: "PalasiaCare Hospital",
    address: "New Palasia, Indore",
    latitude: 22.7255,
    longitude: 75.8826,
    current_load: 0.31
  },
  {
    code: "IND-BHAWAR-05",
    name: "BhawarLife Hospital",
    address: "Bhawarkuan Square, Indore",
    latitude: 22.7009,
    longitude: 75.8655,
    current_load: 0.29
  }
];

const seedInventory = {
  "IND-AITR-01": { icu_bed: 18, normal_bed: 68, ventilator: 10, ambulance: 6, emergency_doctor: 8 },
  "IND-ACRO-02": { icu_bed: 14, normal_bed: 58, ventilator: 8, ambulance: 5, emergency_doctor: 6 },
  "IND-VIJAY-03": { icu_bed: 16, normal_bed: 62, ventilator: 9, ambulance: 5, emergency_doctor: 7 },
  "IND-PALASIA-04": { icu_bed: 15, normal_bed: 60, ventilator: 8, ambulance: 5, emergency_doctor: 6 },
  "IND-BHAWAR-05": { icu_bed: 13, normal_bed: 54, ventilator: 7, ambulance: 4, emergency_doctor: 5 }
};

let bootstrapPromise = null;
let bootstrapCompleted = false;

function toPoint(longitude, latitude) {
  return `SRID=4326;POINT(${longitude} ${latitude})`;
}

function mapHospital(base, inventoryRows = []) {
  const resources = {};
  const blockedResources = [];
  for (const row of inventoryRows) {
    resources[row.resource_type] = Number(row.available_count || 0);
    if (Number(row.blocked_count || 0) > 0 || Number(row.in_maintenance_count || 0) > 0) {
      blockedResources.push(row.resource_type);
    }
  }

  return {
    id: base.id,
    code: base.code,
    name: base.name,
    city: base.cityName,
    latitude: Number(base.latitude || 0),
    longitude: Number(base.longitude || 0),
    active: Boolean(base.is_active),
    loadFactor: Number(base.current_load || 0),
    resources,
    blockedResources
  };
}

export async function getOrCreateCityId(cityName) {
  const resolvedCityName = cityName || env.CITY_DEFAULT || "Indore";
  const { data: existing, error: findError } = await supabaseAdmin
    .from("cities")
    .select("id,name")
    .eq("name", resolvedCityName)
    .maybeSingle();

  if (findError) {
    throw new HttpError(500, findError.message, "DB_CITY_LOOKUP_FAILED");
  }

  if (existing?.id) {
    return existing.id;
  }

  const { data: inserted, error: insertError } = await supabaseAdmin
    .from("cities")
    .insert({ name: resolvedCityName, state: "Madhya Pradesh", country: "India" })
    .select("id")
    .single();

  if (insertError) {
    throw new HttpError(500, insertError.message, "DB_CITY_CREATE_FAILED");
  }

  return inserted.id;
}

async function ensureBootstrapData(cityName) {
  if (bootstrapCompleted) {
    return;
  }

  if (bootstrapPromise) {
    return bootstrapPromise;
  }

  bootstrapPromise = (async () => {
    const cityId = await getOrCreateCityId(cityName);

    const { data: existingHospitals, error: existingHospitalsError } = await supabaseAdmin
      .from("hospitals")
      .select("id")
      .eq("city_id", cityId);

    if (existingHospitalsError) {
      throw new HttpError(500, existingHospitalsError.message, "DB_HOSPITAL_EXISTING_LOOKUP_FAILED");
    }

    if ((existingHospitals || []).length > 0) {
      const { error: deactivateError } = await supabaseAdmin
        .from("hospitals")
        .update({ is_active: false })
        .eq("city_id", cityId);

      if (deactivateError) {
        throw new HttpError(500, deactivateError.message, "DB_HOSPITAL_DEACTIVATE_FAILED");
      }
    }

    const hospitalPayload = seedHospitals.map((hospital) => ({
      city_id: cityId,
      code: hospital.code,
      name: hospital.name,
      address: hospital.address,
      landmark: hospital.address,
      location: toPoint(hospital.longitude, hospital.latitude),
      latitude: hospital.latitude,
      longitude: hospital.longitude,
      current_load: hospital.current_load,
      is_active: true
    }));

    const { data: upsertedHospitals, error: hospitalInsertError } = await supabaseAdmin
      .from("hospitals")
      .upsert(hospitalPayload, { onConflict: "code" })
      .select("id,code");

    if (hospitalInsertError) {
      throw new HttpError(500, hospitalInsertError.message, "DB_HOSPITAL_SEED_FAILED");
    }

    const { data: seededHospitals, error: seededHospitalsError } = await supabaseAdmin
      .from("hospitals")
      .select("id,code")
      .in("code", seedHospitals.map((item) => item.code));

    if (seededHospitalsError) {
      throw new HttpError(500, seededHospitalsError.message, "DB_HOSPITAL_SEED_LOOKUP_FAILED");
    }

    if ((seededHospitals || []).length > 0) {
      await supabaseAdmin
        .from("resource_inventory")
        .delete()
        .in("hospital_id", seededHospitals.map((item) => item.id))
        .is("department_id", null);
    }

    const inventoryPayload = [];
    for (const hospital of seededHospitals || upsertedHospitals || []) {
      const resources = seedInventory[hospital.code] || {};
      for (const [resourceType, countValue] of Object.entries(resources)) {
        inventoryPayload.push({
          hospital_id: hospital.id,
          department_id: null,
          resource_type: resourceType,
          total_count: countValue,
          available_count: countValue,
          blocked_count: 0,
          in_maintenance_count: 0
        });
      }
    }

    if (inventoryPayload.length > 0) {
      const hospitalIds = [...new Set(inventoryPayload.map((item) => item.hospital_id))];
      const { data: existingRows, error: existingInventoryError } = await supabaseAdmin
        .from("resource_inventory")
        .select("hospital_id,resource_type")
        .in("hospital_id", hospitalIds)
        .is("department_id", null);

      if (existingInventoryError) {
        throw new HttpError(500, existingInventoryError.message, "DB_INVENTORY_SEED_LOOKUP_FAILED");
      }

      const existingKey = new Set((existingRows || []).map((row) => `${row.hospital_id}:${row.resource_type}`));
      const missingRows = inventoryPayload.filter((item) => !existingKey.has(`${item.hospital_id}:${item.resource_type}`));

      if (missingRows.length > 0) {
        const { error: inventoryError } = await supabaseAdmin
          .from("resource_inventory")
          .insert(missingRows);
        if (inventoryError) {
          throw new HttpError(500, inventoryError.message, "DB_INVENTORY_SEED_FAILED");
        }
      }
    }
  })();

  try {
    await bootstrapPromise;
    bootstrapCompleted = true;
  } finally {
    bootstrapPromise = null;
  }
}

export async function listActiveHospitalsByCity(city) {
  await ensureBootstrapData(city);
  const cityId = await getOrCreateCityId(city);

  const { data: hospitals, error: hospitalsError } = await supabaseAdmin
    .from("hospitals")
    .select("id,code,name,city_id,is_active,current_load,latitude,longitude")
    .eq("city_id", cityId)
    .eq("is_active", true);

  if (hospitalsError) {
    throw new HttpError(500, hospitalsError.message, "DB_HOSPITAL_LIST_FAILED");
  }

  const hospitalIds = (hospitals || []).map((hospital) => hospital.id);
  if (hospitalIds.length === 0) {
    return [];
  }

  const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
    .from("resource_inventory")
    .select("hospital_id,resource_type,available_count,blocked_count,in_maintenance_count")
    .in("hospital_id", hospitalIds)
    .is("department_id", null);

  if (inventoryError) {
    throw new HttpError(500, inventoryError.message, "DB_INVENTORY_LIST_FAILED");
  }

  const groupedInventory = new Map();
  for (const row of inventoryRows || []) {
    if (!groupedInventory.has(row.hospital_id)) {
      groupedInventory.set(row.hospital_id, []);
    }
    groupedInventory.get(row.hospital_id).push(row);
  }

  return (hospitals || []).map((hospital) =>
    mapHospital(
      { ...hospital, cityName: city },
      groupedInventory.get(hospital.id) || []
    )
  );
}

export async function getHospitalById(hospitalId) {
  const { data: hospital, error } = await supabaseAdmin
    .from("hospitals")
    .select("id,code,name,is_active,current_load,latitude,longitude")
    .eq("id", hospitalId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message, "DB_HOSPITAL_GET_FAILED");
  }

  if (!hospital) {
    return null;
  }

  const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
    .from("resource_inventory")
    .select("hospital_id,resource_type,available_count,blocked_count,in_maintenance_count")
    .eq("hospital_id", hospitalId)
    .is("department_id", null);

  if (inventoryError) {
    throw new HttpError(500, inventoryError.message, "DB_HOSPITAL_INVENTORY_GET_FAILED");
  }

  return mapHospital({ ...hospital, cityName: "Indore" }, inventoryRows || []);
}

export function hasResources(hospital, resources) {
  return resources.every((resource) => {
    if (hospital.blockedResources.includes(resource)) {
      return false;
    }
    return Number(hospital.resources[resource] || 0) > 0;
  });
}

export async function reserveResources(hospitalId, resources) {
  const uniqueResources = [...new Set(resources)];

  const { data: rows, error } = await supabaseAdmin
    .from("resource_inventory")
    .select("id,resource_type,available_count,blocked_count,in_maintenance_count")
    .eq("hospital_id", hospitalId)
    .is("department_id", null)
    .in("resource_type", uniqueResources);

  if (error) {
    throw new HttpError(500, error.message, "DB_RESERVE_LOOKUP_FAILED");
  }

  const rowByType = new Map((rows || []).map((row) => [row.resource_type, row]));
  for (const resource of uniqueResources) {
    const row = rowByType.get(resource);
    if (!row) {
      return false;
    }
    if (Number(row.available_count || 0) <= 0 || Number(row.blocked_count || 0) > 0 || Number(row.in_maintenance_count || 0) > 0) {
      return false;
    }
  }

  const updates = await Promise.all(
    uniqueResources.map(async (resource) => {
      const row = rowByType.get(resource);
      const nextAvailable = Number(row.available_count || 0) - 1;
      const { error: updateError } = await supabaseAdmin
        .from("resource_inventory")
        .update({ available_count: nextAvailable })
        .eq("id", row.id)
        .eq("available_count", row.available_count);

      return { row, updateError };
    })
  );

  const failed = updates.find((item) => item.updateError);
  if (failed) {
    const successfulRows = updates
      .filter((item) => !item.updateError)
      .map((item) => item.row);

    await Promise.all(
      successfulRows.map(async (updatedRow) => {
        await supabaseAdmin
          .from("resource_inventory")
          .update({ available_count: Number(updatedRow.available_count || 0) })
          .eq("id", updatedRow.id);
      })
    );

    return false;
  }

  return true;
}

export async function releaseResources(hospitalId, resources) {
  const uniqueResources = [...new Set(resources)];
  const { data: rows, error } = await supabaseAdmin
    .from("resource_inventory")
    .select("id,resource_type,available_count")
    .eq("hospital_id", hospitalId)
    .is("department_id", null)
    .in("resource_type", uniqueResources);

  if (error) {
    throw new HttpError(500, error.message, "DB_RELEASE_LOOKUP_FAILED");
  }

  await Promise.all(
    (rows || []).map(async (row) => {
      await supabaseAdmin
        .from("resource_inventory")
        .update({ available_count: Number(row.available_count || 0) + 1 })
        .eq("id", row.id);
    })
  );
}
