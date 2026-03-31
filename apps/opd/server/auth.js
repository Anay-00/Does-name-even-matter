import crypto from "crypto";
import { env, supabase } from "./config.js";

const ACCESS_TOKEN_TTL = 60 * 60 * 12;

/* ── Mock OPD users ─────────────────────────────────────────────── */
const opdUsers = [
  { id: "opd_rec_aitri",    role: "opd_receptionist", email: "aitri.opd@medisync.com",      password: "OPD@123",    hospitalCode: "IND-AITR-01"     },
  { id: "opd_rec_palasia",  role: "opd_receptionist", email: "palasia.opd@medisync.com",    password: "OPD@234",    hospitalCode: "IND-PALASIA-04"  },
  { id: "opd_rec_acro",     role: "opd_receptionist", email: "acro.opd@medisync.com",       password: "OPD@345",    hospitalCode: "IND-ACRO-02"     },
  { id: "opd_doc_aitri",    role: "doctor",           email: "dr.aitri.opd@medisync.com",   password: "Doctor@123", hospitalCode: "IND-AITR-01"     },
  { id: "opd_doc_palasia",  role: "doctor",           email: "dr.palasia.opd@medisync.com", password: "Doctor@456", hospitalCode: "IND-PALASIA-04"  },
  { id: "opd_doc_acro",     role: "doctor",           email: "dr.acro.opd@medisync.com",    password: "Doctor@234", hospitalCode: "IND-ACRO-02"     },
];

/* ── JWT helpers (same scheme as main backend) ──────────────────── */
function signToken(payload) {
  const iat = Math.floor(Date.now() / 1000);
  const body = Buffer.from(JSON.stringify({ ...payload, iat, exp: iat + ACCESS_TOKEN_TTL })).toString("base64url");
  const sig = crypto.createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyToken(token) {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", env.JWT_SECRET).update(body).digest("base64url");
  if (expected !== sig) return null;
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!parsed || parsed.exp < Math.floor(Date.now() / 1000)) return null;
  return parsed;
}

/* ── Login ──────────────────────────────────────────────────────── */
export async function login(email, password, role) {
  const user = opdUsers.find((u) => u.email === email && u.password === password && u.role === role);
  if (!user) return null;

  const { data: hospital } = await supabase
    .from("hospitals")
    .select("id, name, code")
    .eq("code", user.hospitalCode)
    .eq("is_active", true)
    .single();

  if (!hospital) return null;

  const tokenPayload = {
    id: user.id,
    role: user.role,
    email: user.email,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
    hospitalCode: hospital.code,
  };

  return { token: signToken(tokenPayload), user: tokenPayload };
}

/* ── Express middleware ──────────────────────────────────────────── */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) { res.status(401).json({ error: "Missing token" }); return; }
  const payload = verifyToken(token);
  if (!payload) { res.status(401).json({ error: "Invalid or expired token" }); return; }
  req.user = payload;
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    next();
  };
}
