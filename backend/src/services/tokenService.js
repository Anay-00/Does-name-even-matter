import crypto from "crypto";
import { env } from "../config/env.js";

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 12;

export function signAccessToken(payload) {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const enrichedPayload = {
    ...payload,
    iat: issuedAtSeconds,
    exp: issuedAtSeconds + ACCESS_TOKEN_TTL_SECONDS
  };
  const body = Buffer.from(JSON.stringify(enrichedPayload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(body)
    .digest("base64url");
  return `${body}.${signature}`;
}

export function verifyAccessToken(token) {
  const [body, signature] = token.split(".");
  if (!body || !signature) {
    return null;
  }
  const expected = crypto
    .createHmac("sha256", env.JWT_SECRET)
    .update(body)
    .digest("base64url");
  if (expected !== signature) {
    return null;
  }
  const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  if (!parsed || typeof parsed !== "object") {
    return null;
  }
  if (typeof parsed.exp !== "number") {
    return null;
  }
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (parsed.exp < nowSeconds) {
    return null;
  }
  return parsed;
}
