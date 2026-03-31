import fs from "fs/promises";
import { env } from "../config/env.js";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function cleanGuidanceText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

export async function buildAIGuidanceFromFrame({ emergencyType, note, frameFilePath, frameMimeType }) {
  if (!env.GEMINI_API_KEY || !frameFilePath || !frameMimeType?.startsWith("image/")) {
    return null;
  }

  try {
    const frameBuffer = await fs.readFile(frameFilePath);
    const base64Frame = frameBuffer.toString("base64");

    const prompt = [
      "You are a medical first-response assistant.",
      "Return concise, safe, immediate first-aid guidance in plain English.",
      "Do not diagnose. Do not prescribe medication dosage.",
      "Focus on immediate steps until ambulance arrives.",
      `Emergency type: ${emergencyType || "unknown"}`,
      `Caller note: ${note || "none"}`
    ].join(" ");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${GEMINI_ENDPOINT}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: frameMimeType,
                  data: base64Frame
                }
              }
            ]
          }
        ]
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return null;
    }

    const payload = await response.json().catch(() => ({}));
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => typeof part?.text === "string")?.text;

    return cleanGuidanceText(text);
  } catch {
    return null;
  }
}
