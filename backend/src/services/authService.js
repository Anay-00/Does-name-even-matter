import { HttpError } from "../utils/httpError.js";
import { listActiveHospitalsByCity } from "../repositories/hospitalRepository.js";
import { env } from "../config/env.js";
import { loginPatient } from "./patientService.js";

const users = [
  {
    id: "su_001",
    role: "super_admin",
    email: "superadmin@medisync.com",
    password: "superadmin123",
    hospitalId: null
  },
  {
    id: "ad_001",
    role: "admin",
    email: "admin@medisync.com",
    password: "admin123",
    hospitalId: null
  },
  {
    id: "ha_aitri_01",
    role: "hospital_admin_staff",
    email: "aitricare@gmail.com",
    password: "Aitri@123",
    hospitalCode: "IND-AITR-01"
  },
  {
    id: "ha_acro_02",
    role: "hospital_admin_staff",
    email: "acrolife@gmail.com",
    password: "Acro@123",
    hospitalCode: "IND-ACRO-02"
  },
  {
    id: "ha_vijay_03",
    role: "hospital_admin_staff",
    email: "vijaycare@gmail.com",
    password: "Vijay@123",
    hospitalCode: "IND-VIJAY-03"
  },
  {
    id: "ha_palasia_04",
    role: "hospital_admin_staff",
    email: "palasiacare@gmail.com",
    password: "Palasia@123",
    hospitalCode: "IND-PALASIA-04"
  },
  {
    id: "ha_bhawar_05",
    role: "hospital_admin_staff",
    email: "bhawarlife@gmail.com",
    password: "Bhawar@123",
    hospitalCode: "IND-BHAWAR-05"
  },
  {
    id: "dp_aitri_01",
    role: "dispatch_operator",
    email: "aitridispatch@gmail.com",
    password: "Dispatch@123",
    hospitalCode: "IND-AITR-01"
  },
  {
    id: "dr_aitri_01",
    role: "doctor",
    email: "aitridoctor@gmail.com",
    password: "Doctor@123",
    hospitalCode: "IND-AITR-01"
  },
  {
    id: "dr_acro_02",
    role: "doctor",
    email: "acrodoctor@gmail.com",
    password: "Doctor@234",
    hospitalCode: "IND-ACRO-02"
  },
  {
    id: "dr_vijay_03",
    role: "doctor",
    email: "vijaydoctor@gmail.com",
    password: "Doctor@345",
    hospitalCode: "IND-VIJAY-03"
  },
  {
    id: "dr_palasia_04",
    role: "doctor",
    email: "palasiadoctor@gmail.com",
    password: "Doctor@456",
    hospitalCode: "IND-PALASIA-04"
  },
  {
    id: "dr_bhawar_05",
    role: "doctor",
    email: "bhawardoctor@gmail.com",
    password: "Doctor@567",
    hospitalCode: "IND-BHAWAR-05"
  },
  {
    id: "nr_aitri_01",
    role: "nurse",
    email: "aitrinurse@gmail.com",
    password: "Nurse@123",
    hospitalCode: "IND-AITR-01"
  },
  {
    id: "am_template",
    role: "ambulance_provider_operator",
    email: "ambulance@medisync.com",
    password: "ambulance123"
  }
];

async function resolveHospitalIdByCode(hospitalCode) {
  if (!hospitalCode) {
    return null;
  }
  const hospitals = await listActiveHospitalsByCity(env.CITY_DEFAULT);
  const match = hospitals.find((hospital) => hospital.code === hospitalCode);
  return match?.id || null;
}

export async function loginWithEmailPassword({ email, password, role }) {
  if (role === "patient") {
    return loginPatient({ identifier: email, password });
  }

  const user = users.find((entry) => entry.email === email && entry.role === role && entry.password === password);
  if (!user) {
    throw new HttpError(401, "Invalid credentials", "INVALID_CREDENTIALS");
  }

  if (["super_admin", "admin"].includes(role)) {
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      hospitalId: null,
      hospitalCode: null
    };
  }

  const hospitals = await listActiveHospitalsByCity(env.CITY_DEFAULT);
  const effectiveHospitalCode = user.hospitalCode;
  const matchedHospital = hospitals.find((hospital) => hospital.code === effectiveHospitalCode);

  if (!matchedHospital?.id) {
    throw new HttpError(400, `Hospital code ${effectiveHospitalCode} is invalid`, "INVALID_HOSPITAL_CODE");
  }

  const hospitalId = await resolveHospitalIdByCode(effectiveHospitalCode);
  if (!hospitalId) {
    throw new HttpError(500, "Hospital mapping not found for account", "AUTH_HOSPITAL_MAPPING_FAILED");
  }

  return {
    id: `${user.id}_${effectiveHospitalCode}`,
    role: user.role,
    email: user.email,
    hospitalId,
    hospitalCode: effectiveHospitalCode
  };
}
