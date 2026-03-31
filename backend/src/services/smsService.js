import { env } from "../config/env.js";

export async function sendSms({ to, message }) {
  if (!to || !message) {
    return { sent: false, provider: "none", reason: "missing_payload" };
  }

  if (env.SMS_WEBHOOK_URL) {
    const response = await fetch(env.SMS_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, message })
    });

    if (!response.ok) {
      throw new Error(`SMS webhook failed with status ${response.status}`);
    }

    return { sent: true, provider: "webhook" };
  }

  // Fallback in development environments when no SMS provider is configured.
  // eslint-disable-next-line no-console
  console.log(`[SMS-FALLBACK] to=${to} message=${message}`);
  return { sent: true, provider: "console" };
}
