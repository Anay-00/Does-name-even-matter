import { supabaseAdmin } from "../config/supabase.js";
import { HttpError } from "../utils/httpError.js";

async function resolveHospitalScope(hospitalId, role) {
  if (hospitalId) {
    return hospitalId;
  }

  if (!["super_admin", "admin"].includes(role)) {
    throw new HttpError(403, "Hospital scope is required", "HOSPITAL_SCOPE_REQUIRED");
  }

  const { data, error } = await supabaseAdmin
    .from("hospitals")
    .select("id")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message, "DB_HOSPITAL_SCOPE_RESOLVE_FAILED");
  }

  if (!data?.id) {
    throw new HttpError(404, "No active hospital found for scope", "HOSPITAL_SCOPE_NOT_FOUND");
  }

  return data.id;
}

function splitNameParts(payload) {
  const fallback = `${payload.firstName || ""} ${payload.lastName || ""}`.trim();
  return {
    firstName: payload.firstName || "",
    middleName: payload.middleName || "",
    lastName: payload.lastName || "",
    fullName: fallback || "Doctor"
  };
}

function mapDoctor(item) {
  const parts = (item.full_name || "").trim().split(/\s+/).filter(Boolean);
  return {
    id: item.id,
    firstName: item.first_name || parts[0] || "",
    middleName: item.middle_name || (parts.length > 2 ? parts.slice(1, -1).join(" ") : ""),
    lastName: item.last_name || (parts.length > 1 ? parts[parts.length - 1] : ""),
    gender: item.gender || "other",
    dateOfBirth: item.date_of_birth || "",
    bloodGroup: item.blood_group || "",
    email: item.email || "",
    mobile: item.mobile || "",
    alternateContact: item.alternate_contact || "",
    address: item.address || "",
    department: item.department || "General",
    specialization: item.specialization || "General Medicine",
    hospitalId: item.hospital_id,
    createdAt: item.created_at
  };
}

function mapRoom(item) {
  return {
    id: item.id,
    patientName: item.patient_name,
    patientId: item.patient_id,
    age: Number(item.age || 0),
    gender: item.gender || "other",
    mobile: item.mobile || "",
    emergencyContact: item.emergency_contact || "",
    medicalHistory: item.medical_history || "",
    allergies: item.allergies || "",
    roomNumber: item.room_number,
    status: item.status,
    hospitalId: item.hospital_id,
    allottedAt: item.allotted_at
  };
}

const WARD_CATALOG = {
  critical: ["ICU-1", "ICU-2", "ICU-3", "ICU-4"],
  medium: ["NW-1", "NW-2", "NW-3", "NW-4", "NW-5", "NW-6"],
  low: ["GW-1", "GW-2", "GW-3", "GW-4", "GW-5", "GW-6", "GW-7", "GW-8"]
};

const SPECIALIZATION_SEED = [
  { firstName: "Aarav", lastName: "Sharma", department: "Emergency", specialization: "Emergency Medicine", gender: "male", bloodGroup: "O+" },
  { firstName: "Ishita", lastName: "Verma", department: "Cardiology", specialization: "Cardiologist", gender: "female", bloodGroup: "A+" },
  { firstName: "Rohan", lastName: "Joshi", department: "Orthopedics", specialization: "Orthopedic Surgeon", gender: "male", bloodGroup: "B+" },
  { firstName: "Meera", lastName: "Kulkarni", department: "Neurology", specialization: "Neurologist", gender: "female", bloodGroup: "AB+" },
  { firstName: "Kunal", lastName: "Patel", department: "Pulmonology", specialization: "Pulmonologist", gender: "male", bloodGroup: "A-" },
  { firstName: "Nisha", lastName: "Rao", department: "General Medicine", specialization: "General Physician", gender: "female", bloodGroup: "B-" }
];

function resolveWardPriorityFromEmergency(request) {
  const type = String(request?.emergencyType || "").toLowerCase();
  if (["cardiac_arrest", "stroke_alert"].includes(type)) {
    return "critical";
  }
  if (["fever_illness", "minor_injury"].includes(type)) {
    return "low";
  }
  return "medium";
}

async function getOccupiedRooms(hospitalId) {
  const { data, error } = await supabaseAdmin
    .from("room_allotments")
    .select("room_number,status")
    .eq("hospital_id", hospitalId);

  if (error) {
    throw new HttpError(500, error.message, "DB_ROOM_OCCUPANCY_LOOKUP_FAILED");
  }

  return new Set(
    (data || [])
      .filter((item) => item.status !== "discharged")
      .map((item) => item.room_number)
      .filter(Boolean)
  );
}

function mapService(item) {
  return {
    id: item.id,
    serviceName: item.service_name,
    amount: Number(item.amount || 0),
    createdAt: item.created_at
  };
}

function mapInvoice(item) {
  return {
    id: item.id,
    roomAllotmentId: item.room_allotment_id || null,
    invoiceNumber: item.invoice_number,
    patientName: item.patient_name,
    roomNumber: item.room_number,
    subtotal: Number(item.subtotal || 0),
    taxPercentage: Number(item.tax_percentage || 0),
    taxAmount: Number(item.tax_amount || 0),
    totalAmount: Number(item.total_amount || 0),
    notes: item.notes || "",
    billedAt: item.billed_at,
    status: item.status || "generated"
  };
}

function mapBloodUnit(item) {
  return {
    id: item.id,
    bloodGroup: item.blood_group,
    component: item.component,
    unitsAvailable: Number(item.units_available || 0),
    reorderLevel: Number(item.reorder_level || 0),
    updatedAt: item.updated_at
  };
}

function mapBloodIssue(item) {
  return {
    id: item.id,
    patient: item.patient_name,
    bloodGroup: item.blood_group,
    component: item.component,
    unitsIssued: Number(item.units_issued || 0),
    status: item.status || "Issued",
    issuedAt: item.issued_at
  };
}

function buildInvoiceNumber(roomAllotmentId) {
  const token = String(roomAllotmentId || "").replace(/-/g, "").slice(0, 8).toUpperCase();
  return `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${token || "MANUAL"}`;
}

function isMissingTable(error, tableName) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes(tableName.toLowerCase()) &&
    (
      message.includes("relation") ||
      message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("could not find the table")
    )
  );
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ""));
}

async function ensureBillingSeed(hospitalId) {
  const { count, error: countError } = await supabaseAdmin
    .from("billing_services")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId);

  if (countError) {
    throw new HttpError(500, countError.message, "DB_BILLING_SEED_COUNT_FAILED");
  }

  if ((count || 0) === 0) {
    const { error: seedError } = await supabaseAdmin.from("billing_services").insert([
      { hospital_id: hospitalId, service_name: "Consultation Fee", amount: 50 },
      { hospital_id: hospitalId, service_name: "Lab Test", amount: 75 },
      { hospital_id: hospitalId, service_name: "X-Ray", amount: 100 }
    ]);

    if (seedError) {
      throw new HttpError(500, seedError.message, "DB_BILLING_SEED_FAILED");
    }
  }

  const { data: taxRow, error: taxError } = await supabaseAdmin
    .from("billing_tax_settings")
    .select("hospital_id")
    .eq("hospital_id", hospitalId)
    .maybeSingle();

  if (taxError) {
    throw new HttpError(500, taxError.message, "DB_TAX_LOOKUP_FAILED");
  }

  if (!taxRow?.hospital_id) {
    const { error: insertTaxError } = await supabaseAdmin
      .from("billing_tax_settings")
      .insert({ hospital_id: hospitalId, tax_percentage: 5.0 });

    if (insertTaxError) {
      throw new HttpError(500, insertTaxError.message, "DB_TAX_SEED_FAILED");
    }
  }
}

async function ensureOperationsSeed(hospitalId) {
  const now = new Date();
  const plusHours = (h) => new Date(now.getTime() + h * 60 * 60 * 1000).toISOString();

  await ensureDoctorCoverage(hospitalId);

  const { data: doctorsForShift, error: doctorsLookupError } = await supabaseAdmin
    .from("doctors")
    .select("id")
    .eq("hospital_id", hospitalId)
    .limit(6);

  if (doctorsLookupError) {
    throw new HttpError(500, doctorsLookupError.message, "DB_SHIFT_SEED_DOCTOR_LOOKUP_FAILED");
  }

  const { count: shiftCount, error: shiftCountError } = await supabaseAdmin
    .from("doctor_shifts")
    .select("id", { count: "exact", head: true })
    .in("doctor_id", (doctorsForShift || []).map((item) => item.id));

  if (shiftCountError) {
    throw new HttpError(500, shiftCountError.message, "DB_SHIFT_SEED_COUNT_FAILED");
  }

  if ((shiftCount || 0) === 0 && (doctorsForShift || []).length > 0) {
    const shiftRows = doctorsForShift.map((doctor, index) => ({
      doctor_id: doctor.id,
      shift_start: plusHours(index * 2),
      shift_end: plusHours(index * 2 + 8)
    }));
    const { error: shiftSeedError } = await supabaseAdmin.from("doctor_shifts").insert(shiftRows);
    if (shiftSeedError) {
      throw new HttpError(500, shiftSeedError.message, "DB_SHIFT_SEED_FAILED");
    }
  }

  const { count: roomCount, error: roomCountError } = await supabaseAdmin
    .from("room_allotments")
    .select("id", { count: "exact", head: true })
    .eq("hospital_id", hospitalId);

  if (roomCountError) {
    throw new HttpError(500, roomCountError.message, "DB_ROOM_SEED_COUNT_FAILED");
  }

  if ((roomCount || 0) === 0) {
    const { error: roomSeedError } = await supabaseAdmin.from("room_allotments").insert([
      {
        hospital_id: hospitalId,
        patient_name: "Rahul Patidar",
        patient_id: "PID-1001",
        age: 37,
        gender: "male",
        mobile: "9893000001",
        emergency_contact: "9893000002",
        medical_history: "Hypertension",
        allergies: "None",
        room_number: "ICU-01",
        status: "admitted"
      },
      {
        hospital_id: hospitalId,
        patient_name: "Neha Kulkarni",
        patient_id: "PID-1002",
        age: 29,
        gender: "female",
        mobile: "9893000003",
        emergency_contact: "9893000004",
        medical_history: "Asthma",
        allergies: "Penicillin",
        room_number: "GW-101",
        status: "admitted"
      }
    ]);
    if (roomSeedError) {
      throw new HttpError(500, roomSeedError.message, "DB_ROOM_SEED_FAILED");
    }
  }

  const seedByCount = async (table, rowFactory, code) => {
    const { count, error } = await supabaseAdmin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("hospital_id", hospitalId);
    if (error) {
      throw new HttpError(500, error.message, `${code}_COUNT_FAILED`);
    }
    if ((count || 0) === 0) {
      const { error: seedError } = await supabaseAdmin.from(table).insert(rowFactory());
      if (seedError) {
        throw new HttpError(500, seedError.message, `${code}_SEED_FAILED`);
      }
    }
  };

  await seedByCount("lab_samples", () => ([
    { hospital_id: hospitalId, sample_code: "LAB-1001", patient_name: "Rahul Patidar", test_name: "CBC", status: "in_process" },
    { hospital_id: hospitalId, sample_code: "LAB-1002", patient_name: "Neha Kulkarni", test_name: "LFT", status: "report_ready" }
  ]), "DB_LAB_SAMPLE");

  await seedByCount("ot_schedules", () => ([
    { hospital_id: hospitalId, ot_room: "OT-1", procedure_name: "Appendectomy", surgeon_name: "Dr. Rohan Joshi", scheduled_time: plusHours(6), status: "Scheduled" },
    { hospital_id: hospitalId, ot_room: "OT-2", procedure_name: "Angioplasty", surgeon_name: "Dr. Ishita Verma", scheduled_time: plusHours(10), status: "Scheduled" }
  ]), "DB_OT_SCHEDULE");

  await seedByCount("ot_consumables", () => ([
    { hospital_id: hospitalId, item_name: "Surgical Gloves", quantity: 180, status: "Ready" },
    { hospital_id: hospitalId, item_name: "Sutures", quantity: 75, status: "Ready" }
  ]), "DB_CONSUMABLE");

  await seedByCount("pharmacy_inventory", () => ([
    { hospital_id: hospitalId, medicine_name: "Paracetamol 650", units: 340 },
    { hospital_id: hospitalId, medicine_name: "Amoxicillin 500", units: 120 }
  ]), "DB_PHARMACY");

  await seedByCount("pharmacy_issues", () => ([
    { hospital_id: hospitalId, patient_name: "Rahul Patidar", medicine_name: "Paracetamol 650", issued_at: now.toISOString() }
  ]), "DB_PHARMACY_ISSUE");

  await seedByCount("insurance_claims", () => ([
    { hospital_id: hospitalId, patient_name: "Neha Kulkarni", provider_name: "Star Health", amount: 25000, status: "Submitted" }
  ]), "DB_CLAIM");
}

function mapShift(item) {
  const doctor = item.doctors || {};
  return {
    id: item.id,
    doctorId: item.doctor_id,
    name: doctor.full_name || "Unknown",
    department: doctor.department || "General",
    window: `${new Date(item.shift_start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${new Date(item.shift_end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
    status: "Active",
    shiftStart: item.shift_start,
    shiftEnd: item.shift_end
  };
}

function mapLabSample(item) {
  return {
    id: item.id,
    sampleId: item.sample_code,
    patient: item.patient_name,
    test: item.test_name,
    status: item.status,
    createdAt: item.created_at
  };
}

function mapOtSchedule(item) {
  return {
    id: item.id,
    ot: item.ot_room,
    procedure: item.procedure_name,
    surgeon: item.surgeon_name,
    time: item.scheduled_time,
    status: item.status
  };
}

function mapConsumable(item) {
  return {
    id: item.id,
    name: item.item_name,
    quantity: Number(item.quantity || 0),
    status: item.status
  };
}

function mapInventory(item) {
  return {
    id: item.id,
    medicine: item.medicine_name,
    units: Number(item.units || 0)
  };
}

function mapIssue(item) {
  return {
    id: item.id,
    patient: item.patient_name,
    medicine: item.medicine_name,
    issuedAt: new Date(item.issued_at).toLocaleString()
  };
}

function mapClaim(item) {
  return {
    id: item.id,
    patient: item.patient_name,
    provider: item.provider_name,
    amount: Number(item.amount || 0),
    status: item.status,
    createdAt: item.created_at
  };
}

function isMissingDoctorProfileColumns(error) {
  const message = typeof error?.message === "string" ? error.message : "";
  return (
    /doctors\.(first_name|middle_name|last_name|gender|date_of_birth|blood_group|email|mobile|alternate_contact|address|department)/.test(message) ||
    /'?(first_name|middle_name|last_name|gender|date_of_birth|blood_group|email|mobile|alternate_contact|address|department)'? column of 'doctors'/.test(message)
  );
}

export async function listDoctorShifts({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  let { data, error } = await supabaseAdmin
    .from("doctor_shifts")
    .select("id,doctor_id,shift_start,shift_end,created_at,doctors:doctor_id(full_name,department,hospital_id)")
    .order("created_at", { ascending: false });

  if (error && typeof error?.message === "string" && error.message.includes("department")) {
    const fallback = await supabaseAdmin
      .from("doctor_shifts")
      .select("id,doctor_id,shift_start,shift_end,created_at,doctors:doctor_id(full_name,hospital_id)")
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_SHIFT_LIST_FAILED");
  }

  return (data || []).filter((item) => item.doctors?.hospital_id === scope).map(mapShift);
}

export async function createDoctorShift({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  let doctorId = payload.doctorId || null;

  if (!doctorId) {
    const { data: doctor, error: doctorError } = await supabaseAdmin
      .from("doctors")
      .select("id")
      .eq("hospital_id", scope)
      .ilike("full_name", payload.name)
      .limit(1)
      .maybeSingle();

    if (doctorError) {
      throw new HttpError(500, doctorError.message, "DB_SHIFT_DOCTOR_LOOKUP_FAILED");
    }

    doctorId = doctor?.id || null;
  }

  if (!doctorId) {
    throw new HttpError(400, "Doctor not found for shift assignment", "SHIFT_DOCTOR_NOT_FOUND");
  }

  const start = new Date(payload.shiftStart);
  const end = new Date(payload.shiftEnd);
  if (!(start instanceof Date) || Number.isNaN(start.getTime()) || !(end instanceof Date) || Number.isNaN(end.getTime())) {
    throw new HttpError(400, "Invalid shift window", "SHIFT_WINDOW_INVALID");
  }

  const { data, error } = await supabaseAdmin
    .from("doctor_shifts")
    .insert({
      doctor_id: doctorId,
      shift_start: start.toISOString(),
      shift_end: end.toISOString()
    })
    .select("id,doctor_id,shift_start,shift_end,created_at,doctors:doctor_id(full_name,department,hospital_id)")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_SHIFT_CREATE_FAILED");
  }

  if (data.doctors?.hospital_id !== scope) {
    throw new HttpError(403, "Doctor is not in your hospital scope", "SHIFT_SCOPE_MISMATCH");
  }

  return mapShift(data);
}

export async function listLabSamples({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("lab_samples")
    .select("id,sample_code,patient_name,test_name,status,created_at")
    .eq("hospital_id", scope)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_LAB_SAMPLE_LIST_FAILED");
  }

  return (data || []).map(mapLabSample);
}

export async function createLabSample({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("lab_samples")
    .insert({
      hospital_id: scope,
      sample_code: payload.sampleId,
      patient_name: payload.patient,
      test_name: payload.test,
      status: payload.status || "in_process"
    })
    .select("id,sample_code,patient_name,test_name,status,created_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_LAB_SAMPLE_CREATE_FAILED");
  }

  return mapLabSample(data);
}

export async function listOtSchedules({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("ot_schedules")
    .select("id,ot_room,procedure_name,surgeon_name,scheduled_time,status,created_at")
    .eq("hospital_id", scope)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_OT_SCHEDULE_LIST_FAILED");
  }

  return (data || []).map(mapOtSchedule);
}

export async function createOtSchedule({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("ot_schedules")
    .insert({
      hospital_id: scope,
      ot_room: payload.ot,
      procedure_name: payload.procedure,
      surgeon_name: payload.surgeon,
      scheduled_time: payload.time,
      status: payload.status || "Scheduled"
    })
    .select("id,ot_room,procedure_name,surgeon_name,scheduled_time,status,created_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_OT_SCHEDULE_CREATE_FAILED");
  }

  return mapOtSchedule(data);
}

export async function listOtConsumables({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("ot_consumables")
    .select("id,item_name,quantity,status,updated_at")
    .eq("hospital_id", scope)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_CONSUMABLE_LIST_FAILED");
  }

  return (data || []).map(mapConsumable);
}

export async function createOtConsumable({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("ot_consumables")
    .insert({
      hospital_id: scope,
      item_name: payload.name,
      quantity: payload.quantity,
      status: payload.status || "Ready"
    })
    .select("id,item_name,quantity,status,updated_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_CONSUMABLE_CREATE_FAILED");
  }

  return mapConsumable(data);
}

export async function listPharmacyInventory({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("pharmacy_inventory")
    .select("id,medicine_name,units,updated_at")
    .eq("hospital_id", scope)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_PHARMACY_LIST_FAILED");
  }

  return (data || []).map(mapInventory);
}

export async function createPharmacyInventoryItem({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("pharmacy_inventory")
    .insert({
      hospital_id: scope,
      medicine_name: payload.medicine,
      units: payload.units
    })
    .select("id,medicine_name,units,updated_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_PHARMACY_CREATE_FAILED");
  }

  return mapInventory(data);
}

export async function listPharmacyIssues({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("pharmacy_issues")
    .select("id,patient_name,medicine_name,issued_at")
    .eq("hospital_id", scope)
    .order("issued_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_PHARMACY_ISSUE_LIST_FAILED");
  }

  return (data || []).map(mapIssue);
}

export async function createPharmacyIssue({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);

  const { data, error } = await supabaseAdmin
    .from("pharmacy_issues")
    .insert({
      hospital_id: scope,
      patient_name: payload.patient,
      medicine_name: payload.medicine,
      issued_at: new Date().toISOString()
    })
    .select("id,patient_name,medicine_name,issued_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_PHARMACY_ISSUE_CREATE_FAILED");
  }

  const { data: inventoryRow } = await supabaseAdmin
    .from("pharmacy_inventory")
    .select("id,units")
    .eq("hospital_id", scope)
    .eq("medicine_name", payload.medicine)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inventoryRow?.id) {
    await supabaseAdmin
      .from("pharmacy_inventory")
      .update({ units: Math.max(Number(inventoryRow.units || 0) - 1, 0), updated_at: new Date().toISOString() })
      .eq("id", inventoryRow.id);
  }

  return mapIssue(data);
}

export async function listInsuranceClaims({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("insurance_claims")
    .select("id,patient_name,provider_name,amount,status,created_at")
    .eq("hospital_id", scope)
    .order("created_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_CLAIM_LIST_FAILED");
  }

  return (data || []).map(mapClaim);
}

export async function createInsuranceClaim({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("insurance_claims")
    .insert({
      hospital_id: scope,
      patient_name: payload.patient,
      provider_name: payload.provider,
      amount: payload.amount,
      status: payload.status || "Submitted"
    })
    .select("id,patient_name,provider_name,amount,status,created_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_CLAIM_CREATE_FAILED");
  }

  return mapClaim(data);
}

export async function listDoctors({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  let { data, error } = await supabaseAdmin
    .from("doctors")
    .select("id,hospital_id,full_name,specialization,first_name,middle_name,last_name,gender,date_of_birth,blood_group,email,mobile,alternate_contact,address,department,created_at")
    .eq("hospital_id", scope)
    .order("created_at", { ascending: false });

  if (error && isMissingDoctorProfileColumns(error)) {
    const fallback = await supabaseAdmin
      .from("doctors")
      .select("id,hospital_id,full_name,specialization,qualification,created_at")
      .eq("hospital_id", scope)
      .order("created_at", { ascending: false });
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_DOCTOR_LIST_FAILED");
  }

  return (data || []).map(mapDoctor);
}

export async function createDoctor({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const nameParts = splitNameParts(payload);

  let { data, error } = await supabaseAdmin
    .from("doctors")
    .insert({
      hospital_id: scope,
      full_name: nameParts.fullName,
      first_name: nameParts.firstName,
      middle_name: nameParts.middleName,
      last_name: nameParts.lastName,
      gender: payload.gender,
      date_of_birth: payload.dateOfBirth,
      blood_group: payload.bloodGroup,
      email: payload.email,
      mobile: payload.mobile,
      alternate_contact: payload.alternateContact,
      address: payload.address,
      department: payload.department,
      specialization: payload.specialization,
      qualification: payload.specialization,
      is_available: true
    })
    .select("id,hospital_id,full_name,specialization,first_name,middle_name,last_name,gender,date_of_birth,blood_group,email,mobile,alternate_contact,address,department,created_at")
    .single();

  if (error && isMissingDoctorProfileColumns(error)) {
    const fallback = await supabaseAdmin
      .from("doctors")
      .insert({
        hospital_id: scope,
        full_name: nameParts.fullName,
        specialization: payload.specialization,
        qualification: payload.specialization,
        is_available: true
      })
      .select("id,hospital_id,full_name,specialization,qualification,created_at")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    throw new HttpError(500, error.message, "DB_DOCTOR_CREATE_FAILED");
  }

  return mapDoctor(data);
}

export async function listRoomAllotments({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureOperationsSeed(scope);
  const { data, error } = await supabaseAdmin
    .from("room_allotments")
    .select("id,hospital_id,patient_name,patient_id,age,gender,mobile,emergency_contact,medical_history,allergies,room_number,status,allotted_at")
    .eq("hospital_id", scope)
    .order("allotted_at", { ascending: false });

  if (error) {
    throw new HttpError(500, error.message, "DB_ROOM_LIST_FAILED");
  }

  return (data || []).map(mapRoom);
}

export async function createRoomAllotment({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("room_allotments")
    .insert({
      hospital_id: scope,
      patient_name: payload.patientName,
      patient_id: payload.patientId,
      age: payload.age,
      gender: payload.gender,
      mobile: payload.mobile,
      emergency_contact: payload.emergencyContact,
      medical_history: payload.medicalHistory,
      allergies: payload.allergies,
      room_number: payload.roomNumber,
      status: "admitted"
    })
    .select("id,hospital_id,patient_name,patient_id,age,gender,mobile,emergency_contact,medical_history,allergies,room_number,status,allotted_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_ROOM_CREATE_FAILED");
  }

  return mapRoom(data);
}

export async function autoAssignWardForEmergency({ hospitalId, request }) {
  if (!hospitalId || !request?.id) {
    return null;
  }

  const wardPriority = resolveWardPriorityFromEmergency(request);
  const wardPool = WARD_CATALOG[wardPriority] || WARD_CATALOG.medium;
  const occupied = await getOccupiedRooms(hospitalId);
  const selectedRoom = wardPool.find((room) => !occupied.has(room)) || null;

  if (!selectedRoom) {
    return null;
  }

  const { data, error } = await supabaseAdmin
    .from("room_allotments")
    .insert({
      hospital_id: hospitalId,
      patient_name: request.patientName || request.callerName || "Emergency Patient",
      patient_id: request.id,
      age: Number(request.patientAge || 0),
      gender: request.patientGender || "other",
      mobile: request.callerPhone || "",
      emergency_contact: request.callerPhone || "",
      medical_history: `Emergency Type: ${request.emergencyType || "unspecified"}`,
      allergies: "",
      room_number: selectedRoom,
      status: "admitted"
    })
    .select("id,hospital_id,patient_name,patient_id,age,gender,mobile,emergency_contact,medical_history,allergies,room_number,status,allotted_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_EMERGENCY_WARD_ASSIGN_FAILED");
  }

  return mapRoom(data);
}

export async function hasEmergencyWardCapacity({ hospitalId, emergencyType }) {
  if (!hospitalId) {
    return false;
  }

  const wardPriority = resolveWardPriorityFromEmergency({ emergencyType });
  const wardPool = WARD_CATALOG[wardPriority] || WARD_CATALOG.medium;
  const occupied = await getOccupiedRooms(hospitalId);
  return wardPool.some((room) => !occupied.has(room));
}

export async function listEmergencyWardCapacityByHospitalIds({ hospitalIds, emergencyType }) {
  const ids = [...new Set((hospitalIds || []).filter(Boolean))];
  if (ids.length === 0) {
    return new Map();
  }

  const wardPriority = resolveWardPriorityFromEmergency({ emergencyType });
  const wardPool = WARD_CATALOG[wardPriority] || WARD_CATALOG.medium;

  const { data, error } = await supabaseAdmin
    .from("room_allotments")
    .select("hospital_id,room_number,status")
    .in("hospital_id", ids)
    .neq("status", "discharged");

  if (error) {
    throw new HttpError(500, error.message, "DB_ROOM_BULK_OCCUPANCY_LOOKUP_FAILED");
  }

  const occupiedByHospital = new Map(ids.map((id) => [id, new Set()]));
  for (const row of data || []) {
    if (!row?.hospital_id || !row?.room_number) {
      continue;
    }
    if (!occupiedByHospital.has(row.hospital_id)) {
      occupiedByHospital.set(row.hospital_id, new Set());
    }
    occupiedByHospital.get(row.hospital_id).add(row.room_number);
  }

  const capacityMap = new Map();
  for (const hospitalId of ids) {
    const occupied = occupiedByHospital.get(hospitalId) || new Set();
    capacityMap.set(
      hospitalId,
      wardPool.some((room) => !occupied.has(room))
    );
  }

  return capacityMap;
}

export async function dischargeRoomAllotment({ hospitalId, role, roomAllotmentId, billAmount, notes }) {
  const scope = await resolveHospitalScope(hospitalId, role);

  const { data: taxRow, error: taxError } = await supabaseAdmin
    .from("billing_tax_settings")
    .select("tax_percentage")
    .eq("hospital_id", scope)
    .maybeSingle();

  if (taxError) {
    throw new HttpError(500, taxError.message, "DB_TAX_GET_FAILED");
  }

  const taxPercentage = Number(taxRow?.tax_percentage || 0);
  const subtotal = Number(billAmount || 0);
  const taxAmount = Number(((subtotal * taxPercentage) / 100).toFixed(2));
  const totalAmount = Number((subtotal + taxAmount).toFixed(2));

  const { data, error } = await supabaseAdmin
    .from("room_allotments")
    .update({ status: "discharged" })
    .eq("id", roomAllotmentId)
    .eq("hospital_id", scope)
    .select("id,hospital_id,patient_name,patient_id,age,gender,mobile,emergency_contact,medical_history,allergies,room_number,status,allotted_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_ROOM_DISCHARGE_FAILED");
  }

  // If this room was allocated to an emergency request, mark it completed and free linked resources.
  if (isUuid(data.patient_id)) {
    const linkedRequest = await supabaseAdmin
      .from("emergency_requests")
      .select("id,assigned_doctor_id,assigned_ambulance_id")
      .eq("id", data.patient_id)
      .maybeSingle();

    if (!linkedRequest.error && linkedRequest.data?.id) {
      await supabaseAdmin
        .from("emergency_requests")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", linkedRequest.data.id);

      if (linkedRequest.data.assigned_ambulance_id) {
        await supabaseAdmin
          .from("ambulances")
          .update({ trip_status: "idle" })
          .eq("id", linkedRequest.data.assigned_ambulance_id);
      }

      if (linkedRequest.data.assigned_doctor_id) {
        await supabaseAdmin
          .from("doctors")
          .update({ is_available: true })
          .eq("id", linkedRequest.data.assigned_doctor_id);
      }
    }
  }

  const invoicePayload = {
    hospital_id: scope,
    room_allotment_id: roomAllotmentId,
    invoice_number: buildInvoiceNumber(roomAllotmentId),
    patient_name: data.patient_name,
    room_number: data.room_number,
    subtotal,
    tax_percentage: taxPercentage,
    tax_amount: taxAmount,
    total_amount: totalAmount,
    notes: notes || null,
    billed_at: new Date().toISOString(),
    status: "generated"
  };

  let invoice = null;
  const inserted = await supabaseAdmin
    .from("billing_invoices")
    .insert(invoicePayload)
    .select("id,room_allotment_id,invoice_number,patient_name,room_number,subtotal,tax_percentage,tax_amount,total_amount,notes,billed_at,status")
    .single();

  if (inserted.error) {
    if (!isMissingTable(inserted.error, "billing_invoices")) {
      throw new HttpError(500, inserted.error.message, "DB_BILLING_INVOICE_CREATE_FAILED");
    }
    invoice = {
      id: `virtual-${roomAllotmentId}`,
      roomAllotmentId: roomAllotmentId,
      invoiceNumber: invoicePayload.invoice_number,
      patientName: invoicePayload.patient_name,
      roomNumber: invoicePayload.room_number,
      subtotal: invoicePayload.subtotal,
      taxPercentage: invoicePayload.tax_percentage,
      taxAmount: invoicePayload.tax_amount,
      totalAmount: invoicePayload.total_amount,
      notes: invoicePayload.notes || "",
      billedAt: invoicePayload.billed_at,
      status: invoicePayload.status
    };
  } else {
    invoice = mapInvoice(inserted.data);
  }

  return {
    room: mapRoom(data),
    invoice
  };
}

export async function getBillingSnapshot({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  await ensureBillingSeed(scope);

  const [servicesResult, taxResult] = await Promise.all([
    supabaseAdmin
      .from("billing_services")
      .select("id,service_name,amount,created_at")
      .eq("hospital_id", scope)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("billing_tax_settings")
      .select("tax_percentage")
      .eq("hospital_id", scope)
      .maybeSingle()
  ]);

  if (servicesResult.error) {
    throw new HttpError(500, servicesResult.error.message, "DB_BILLING_LIST_FAILED");
  }

  if (taxResult.error) {
    throw new HttpError(500, taxResult.error.message, "DB_TAX_GET_FAILED");
  }

  return {
    hospitalId: scope,
    taxPercentage: Number(taxResult.data?.tax_percentage || 5),
    services: (servicesResult.data || []).map(mapService)
  };
}

export async function getBillingInvoices({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("billing_invoices")
    .select("id,room_allotment_id,invoice_number,patient_name,room_number,subtotal,tax_percentage,tax_amount,total_amount,notes,billed_at,status")
    .eq("hospital_id", scope)
    .order("billed_at", { ascending: false })
    .limit(200);

  if (error) {
    if (isMissingTable(error, "billing_invoices")) {
      return [];
    }
    throw new HttpError(500, error.message, "DB_BILLING_INVOICE_LIST_FAILED");
  }

  return (data || []).map(mapInvoice);
}

export async function listBloodBankUnits({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("blood_bank_units")
    .select("id,blood_group,component,units_available,reorder_level,updated_at")
    .eq("hospital_id", scope)
    .order("updated_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "blood_bank_units")) {
      return [];
    }
    throw new HttpError(500, error.message, "DB_BLOOD_UNIT_LIST_FAILED");
  }

  return (data || []).map(mapBloodUnit);
}

export async function createBloodBankUnit({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("blood_bank_units")
    .insert({
      hospital_id: scope,
      blood_group: payload.bloodGroup,
      component: payload.component,
      units_available: payload.unitsAvailable,
      reorder_level: payload.reorderLevel,
      updated_at: new Date().toISOString()
    })
    .select("id,blood_group,component,units_available,reorder_level,updated_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_BLOOD_UNIT_CREATE_FAILED");
  }

  return mapBloodUnit(data);
}

export async function listBloodBankIssues({ hospitalId, role }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("blood_bank_issues")
    .select("id,patient_name,blood_group,component,units_issued,status,issued_at")
    .eq("hospital_id", scope)
    .order("issued_at", { ascending: false });

  if (error) {
    if (isMissingTable(error, "blood_bank_issues")) {
      return [];
    }
    throw new HttpError(500, error.message, "DB_BLOOD_ISSUE_LIST_FAILED");
  }

  return (data || []).map(mapBloodIssue);
}

export async function createBloodBankIssue({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("blood_bank_issues")
    .insert({
      hospital_id: scope,
      patient_name: payload.patient,
      blood_group: payload.bloodGroup,
      component: payload.component,
      units_issued: payload.unitsIssued,
      status: payload.status || "Issued",
      issued_at: new Date().toISOString()
    })
    .select("id,patient_name,blood_group,component,units_issued,status,issued_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_BLOOD_ISSUE_CREATE_FAILED");
  }

  const stockLookup = await supabaseAdmin
    .from("blood_bank_units")
    .select("id,units_available")
    .eq("hospital_id", scope)
    .eq("blood_group", payload.bloodGroup)
    .eq("component", payload.component)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!stockLookup.error && stockLookup.data?.id) {
    await supabaseAdmin
      .from("blood_bank_units")
      .update({
        units_available: Math.max(Number(stockLookup.data.units_available || 0) - Number(payload.unitsIssued || 0), 0),
        updated_at: new Date().toISOString()
      })
      .eq("id", stockLookup.data.id);
  }

  return mapBloodIssue(data);
}

export async function createBillingService({ hospitalId, role, payload }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { data, error } = await supabaseAdmin
    .from("billing_services")
    .insert({
      hospital_id: scope,
      service_name: payload.serviceName,
      amount: payload.amount,
      is_active: true
    })
    .select("id,service_name,amount,created_at")
    .single();

  if (error) {
    throw new HttpError(500, error.message, "DB_BILLING_CREATE_FAILED");
  }

  return mapService(data);
}

export async function updateTaxSettings({ hospitalId, role, taxPercentage }) {
  const scope = await resolveHospitalScope(hospitalId, role);
  const { error } = await supabaseAdmin
    .from("billing_tax_settings")
    .upsert({
      hospital_id: scope,
      tax_percentage: taxPercentage,
      updated_at: new Date().toISOString()
    }, { onConflict: "hospital_id" });

  if (error) {
    throw new HttpError(500, error.message, "DB_TAX_UPDATE_FAILED");
  }

  return {
    hospitalId: scope,
    taxPercentage
  };
}

export async function findAssignableDoctor(hospitalId) {
  const { data, error } = await supabaseAdmin
    .from("doctors")
    .select("id,full_name,is_available")
    .eq("hospital_id", hospitalId)
    .order("is_available", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message, "DB_ASSIGNABLE_DOCTOR_LOOKUP_FAILED");
  }

  if (!data?.id) {
    // Backfill doctor coverage lazily so acceptance path stays fast.
    void ensureDoctorCoverage(hospitalId).catch(() => {
      // Ignore asynchronous seed failures in assignment hot path.
    });
    return null;
  }

  return {
    id: data.id,
    fullName: data.full_name,
    isAvailable: Boolean(data.is_available)
  };
}

export async function markDoctorAvailability(doctorId, isAvailable) {
  if (!doctorId) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("doctors")
    .update({ is_available: Boolean(isAvailable) })
    .eq("id", doctorId);

  if (error) {
    throw new HttpError(500, error.message, "DB_DOCTOR_AVAILABILITY_UPDATE_FAILED");
  }
}

async function ensureDoctorCoverage(hospitalId) {
  const { data: doctors, error } = await supabaseAdmin
    .from("doctors")
    .select("id,specialization")
    .eq("hospital_id", hospitalId);

  if (error) {
    throw new HttpError(500, error.message, "DB_DOCTOR_COVERAGE_LOOKUP_FAILED");
  }

  const existingSpecializations = new Set((doctors || []).map((item) => String(item.specialization || "").toLowerCase()));
  for (let index = 0; index < SPECIALIZATION_SEED.length; index += 1) {
    const seed = SPECIALIZATION_SEED[index];
    if (existingSpecializations.has(seed.specialization.toLowerCase())) {
      continue;
    }

    await createDoctor({
      hospitalId,
      role: "hospital_admin_staff",
      payload: {
        firstName: seed.firstName,
        middleName: "",
        lastName: seed.lastName,
        gender: seed.gender,
        dateOfBirth: `198${index}-01-15`,
        bloodGroup: seed.bloodGroup,
        email: `${seed.firstName.toLowerCase()}.${seed.lastName.toLowerCase()}.${String(hospitalId).slice(0, 6)}@medisync.demo`,
        mobile: `98931${String(10000 + index).slice(-5)}`,
        alternateContact: "",
        address: "Indore",
        department: seed.department,
        specialization: seed.specialization
      }
    });

    existingSpecializations.add(seed.specialization.toLowerCase());
  }
}
