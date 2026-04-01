import crypto from "crypto";
import { env, supabase } from "./config.js";

const ACCESS_TOKEN_TTL = 60 * 60 * 12; // 12 hours

/* ── Hospitals ──────────────────────────────────────────────────── */
const HOSPITALS = [
  { code: "IND-AITR-01",    short: "aitri",   name: "AitriCare Hospital"  },
  { code: "IND-AURO-02",    short: "auro",    name: "Aurobindo Hospital"  },
  { code: "IND-VIJAY-03",   short: "vijay",   name: "VijayCare Hospital"  },
  { code: "IND-PALASIA-04", short: "palasia", name: "PalasiaCare Hospital" },
  { code: "IND-BHAWAR-05",  short: "bhawar",  name: "BhawarLife Hospital" },
];

/* ── Doctor roster — 3 per specialty per hospital ───────────────── */
const DOCTOR_ROSTER = {
  "IND-AITR-01": [
    { deptCode: "CARD", name: "Dr. Rajesh Kumar",      qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Ananya Iyer",       qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Harsh Trivedi",     qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Priya Sharma",      qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Kunal Bose",        qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Sneha Pillai",      qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Amit Patel",        qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Ritika Sen",        qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Vishal Thakur",     qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Sunita Verma",      qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Arjun Nambiar",     qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Divya Rajan",       qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Vikram Singh",      qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Meghna Jain",       qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Siddharth Roy",     qualification: "MBBS, MD",            room: "115" },
  ],
  "IND-AURO-02": [
    { deptCode: "CARD", name: "Dr. Neha Gupta",        qualification: "MD Cardiology",       room: "201" },
    { deptCode: "CARD", name: "Dr. Tarun Saxena",      qualification: "DM Cardiology",       room: "206" },
    { deptCode: "CARD", name: "Dr. Prerna Malik",      qualification: "MD Cardiology",       room: "207" },
    { deptCode: "ORTH", name: "Dr. Sanjay Mishra",     qualification: "MS Orthopedics",      room: "202" },
    { deptCode: "ORTH", name: "Dr. Aditi Kulkarni",    qualification: "MS Orthopedics",      room: "208" },
    { deptCode: "ORTH", name: "Dr. Ramesh Tiwari",     qualification: "DNB Orthopedics",     room: "209" },
    { deptCode: "NEUR", name: "Dr. Kavita Joshi",      qualification: "DM Neurology",        room: "203" },
    { deptCode: "NEUR", name: "Dr. Nikhil Bansal",     qualification: "DM Neurology",        room: "210" },
    { deptCode: "NEUR", name: "Dr. Swati Menon",       qualification: "MD Neurology",        room: "211" },
    { deptCode: "PEDI", name: "Dr. Rohit Agarwal",     qualification: "MD Pediatrics",       room: "204" },
    { deptCode: "PEDI", name: "Dr. Pallavi Grover",    qualification: "MD Pediatrics",       room: "212" },
    { deptCode: "PEDI", name: "Dr. Aman Bajaj",        qualification: "DNB Pediatrics",      room: "213" },
    { deptCode: "GENM", name: "Dr. Meena Reddy",       qualification: "MD General Medicine",  room: "205" },
    { deptCode: "GENM", name: "Dr. Karan Ahuja",       qualification: "MD General Medicine",  room: "214" },
    { deptCode: "GENM", name: "Dr. Isha Bhatt",        qualification: "MBBS, MD",            room: "215" },
  ],
  "IND-VIJAY-03": [
    { deptCode: "CARD", name: "Dr. Arun Malhotra",     qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Pooja Nair",        qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Deepak Soni",       qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Deepika Nair",      qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Mohit Gupta",       qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Rashi Chauhan",     qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Suresh Yadav",      qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Anjali Bhatt",      qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Pranav Sinha",      qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Anjali Desai",      qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Vivek Sharma",      qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Nisha Kapoor",      qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Manoj Tiwari",      qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Shruti Pandey",     qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Rohan Joshi",       qualification: "MBBS, MD",            room: "115" },
  ],
  "IND-PALASIA-04": [
    { deptCode: "CARD", name: "Dr. Rakesh Dubey",      qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Nandini Rao",       qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Ajay Verma",        qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Pooja Saxena",      qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Sameer Khan",       qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Kavya Iyer",        qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Vivek Choudhary",   qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Anita Desai",       qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Gaurav Soni",       qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Shweta Pandey",     qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Rahul Mehta",       qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Tanya Gupta",       qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Ashok Bhatia",      qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Neelam Puri",       qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Varun Thakur",      qualification: "MBBS, MD",            room: "115" },
  ],
  "IND-BHAWAR-05": [
    { deptCode: "CARD", name: "Dr. Nitin Kapoor",      qualification: "MD Cardiology",       room: "101" },
    { deptCode: "CARD", name: "Dr. Suman Agarwal",     qualification: "DM Cardiology",       room: "106" },
    { deptCode: "CARD", name: "Dr. Rajat Mishra",      qualification: "MD Cardiology",       room: "107" },
    { deptCode: "ORTH", name: "Dr. Ritu Dixit",        qualification: "MS Orthopedics",      room: "102" },
    { deptCode: "ORTH", name: "Dr. Anil Sharma",       qualification: "MS Orthopedics",      room: "108" },
    { deptCode: "ORTH", name: "Dr. Mansi Patel",       qualification: "DNB Orthopedics",     room: "109" },
    { deptCode: "NEUR", name: "Dr. Gaurav Mehta",      qualification: "DM Neurology",        room: "103" },
    { deptCode: "NEUR", name: "Dr. Preeti Jain",       qualification: "DM Neurology",        room: "110" },
    { deptCode: "NEUR", name: "Dr. Ashish Dubey",      qualification: "MD Neurology",        room: "111" },
    { deptCode: "PEDI", name: "Dr. Pallavi Sinha",     qualification: "MD Pediatrics",       room: "104" },
    { deptCode: "PEDI", name: "Dr. Sunil Reddy",       qualification: "MD Pediatrics",       room: "112" },
    { deptCode: "PEDI", name: "Dr. Bhavna Chauhan",    qualification: "DNB Pediatrics",      room: "113" },
    { deptCode: "GENM", name: "Dr. Dinesh Chauhan",    qualification: "MD General Medicine",  room: "105" },
    { deptCode: "GENM", name: "Dr. Renu Saxena",       qualification: "MD General Medicine",  room: "114" },
    { deptCode: "GENM", name: "Dr. Kartik Nair",       qualification: "MBBS, MD",            room: "115" },
  ],
};

/* ── Build mock users from roster ───────────────────────────────── */
const PASSWORD = "OPD@2026";

const receptionists = HOSPITALS.map((h) => ({
  id: `rec_${h.short}`,
  role: "receptionist",
  email: `rec.${h.short}@medisync.com`,
  password: PASSWORD,
  hospitalCode: h.code,
}));

const doctors = [];
for (const h of HOSPITALS) {
  const deptCounter = {}; // track doctor index per dept per hospital
  for (const doc of DOCTOR_ROSTER[h.code]) {
    const dc = doc.deptCode.toLowerCase();
    deptCounter[dc] = (deptCounter[dc] || 0) + 1;
    const idx = deptCounter[dc]; // 1, 2, 3
    const suffix = idx === 1 ? "" : String(idx); // first doctor has no suffix for backward compat
    doctors.push({
      id: `doc_${dc}${suffix}_${h.short}`,
      role: "doctor",
      email: `dr.${dc}${suffix}.${h.short}@medisync.com`,
      password: PASSWORD,
      hospitalCode: h.code,
      deptCode: doc.deptCode,
      doctorName: doc.name,
      doctorRoom: doc.room,
    });
  }
}

const opdUsers = [...receptionists, ...doctors];
export { DOCTOR_ROSTER, HOSPITALS };

/* ── JWT helpers (HMAC-SHA256, same scheme as main backend) ─────── */
function signToken(payload) {
  const iat = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat, exp: iat + ACCESS_TOKEN_TTL })
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(body)
    .digest("base64url");
  if (expected !== sig) return null;
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!parsed || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

/* ── Dept name map (fallback when Supabase rows are missing) ───── */
const DEPT_NAMES = {
  CARD: "Cardiology", ORTH: "Orthopedics",
  NEUR: "Neurology",  PEDI: "Pediatrics", GENM: "General Medicine",
};

/* ── Login ──────────────────────────────────────────────────────── */
export async function login(email, password) {
  const user = opdUsers.find(
    (u) => u.email === email && u.password === password
  );
  if (!user) return null;

  // Try Supabase, fall back to roster data so login never fails due to missing DB rows
  const { data: hospital } = await supabase
    .from("hospitals")
    .select("id, name, code")
    .eq("code", user.hospitalCode)
    .maybeSingle();

  const rosterHospital = HOSPITALS.find((h) => h.code === user.hospitalCode);
  const resolvedHospital = hospital || {
    id: `local_${user.hospitalCode}`,
    name: rosterHospital?.name || user.hospitalCode,
    code: user.hospitalCode,
  };

  const tokenPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
    hospitalId: resolvedHospital.id,
    hospitalName: resolvedHospital.name,
    hospitalCode: resolvedHospital.code,
  };

  // For doctors, attach department + doctor DB info (with fallback)
  if (user.role === "doctor") {
    const { data: dept } = hospital
      ? await supabase
          .from("opd_departments")
          .select("id, code, name")
          .eq("hospital_id", hospital.id)
          .eq("code", user.deptCode)
          .maybeSingle()
      : { data: null };

    const { data: doc } = dept
      ? await supabase
          .from("opd_doctors")
          .select("id, name, room_number")
          .eq("department_id", dept.id)
          .eq("room_number", user.doctorRoom)
          .maybeSingle()
      : { data: null };

    // Fallback to in-memory roster values when DB rows don't exist yet
    const rosterDoc = DOCTOR_ROSTER[user.hospitalCode]?.find(
      (d) => d.deptCode === user.deptCode && d.room === user.doctorRoom
    );

    tokenPayload.departmentId   = dept?.id   || `local_${user.deptCode}_${user.hospitalCode}`;
    tokenPayload.departmentCode = dept?.code || user.deptCode;
    tokenPayload.departmentName = dept?.name || DEPT_NAMES[user.deptCode] || user.deptCode;
    tokenPayload.doctorId       = doc?.id    || `local_${user.id}`;
    tokenPayload.doctorName     = doc?.name  || rosterDoc?.name || user.doctorName;
    tokenPayload.roomNumber     = doc?.room_number || rosterDoc?.room || user.doctorRoom;
  }

  return { token: signToken(tokenPayload), user: tokenPayload };
}

/* ── Express middleware ──────────────────────────────────────────── */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing token" });
  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ error: "Invalid or expired token" });
  req.user = payload;
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role))
      return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

/* ── Public: list doctors for a hospital (login page dropdown) ──── */
export function getLoginOptions() {
  const options = HOSPITALS.map((h) => {
    const deptCounter = {};
    return {
      code: h.code,
      short: h.short,
      receptionist: `rec.${h.short}@medisync.com`,
      doctors: DOCTOR_ROSTER[h.code].map((d) => {
        const dc = d.deptCode.toLowerCase();
        deptCounter[dc] = (deptCounter[dc] || 0) + 1;
        const idx = deptCounter[dc];
        const suffix = idx === 1 ? "" : String(idx);
        return {
          email: `dr.${dc}${suffix}.${h.short}@medisync.com`,
          name: d.name,
          deptCode: d.deptCode,
          room: d.room,
          qualification: d.qualification,
        };
      }),
    };
  });
  return options;
}
