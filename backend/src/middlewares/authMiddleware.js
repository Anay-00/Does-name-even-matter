import { verifyAccessToken } from "../services/tokenService.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: { message: "Missing token", code: "MISSING_TOKEN" } });
    return;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    res.status(401).json({ error: { message: "Invalid token", code: "INVALID_TOKEN" } });
    return;
  }

  req.user = payload;
  next();
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ error: { message: "Forbidden", code: "FORBIDDEN" } });
      return;
    }
    next();
  };
}
