// functions/particle-webhook.js
import crypto from "crypto";
import { query, ensureSchema } from "./utils/db.js";

/**
 * Expected JSON body (example):
 * {
 *   "secret": "...", // must match WEBHOOK_SECRET
 *   "device_id": "boron-001",
 *   "ts": "2025-09-01T19:20:00Z",
 *   "temp_c": 33.5,
 *   "humidity": 57.2,
 *   "sound_db": 44.1
 * }
 */
export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.warn("WEBHOOK_SECRET is not set");
      return { statusCode: 500, body: "Missing server secret" };
    }
    if (data.secret !== secret) {
      return { statusCode: 401, body: "Unauthorized" };
    }

    await ensureSchema();

    const device_id = String(data.device_id || "").trim();
    if (!device_id) return { statusCode: 400, body: "device_id required" };

    const ts = data.ts ? new Date(data.ts) : new Date();
    const temp_c = data.temp_c ?? null;
    const humidity = data.humidity ?? null;
    const sound_db = data.sound_db ?? null;

    // Make sure device exists
    await query(
      `INSERT INTO devices (device_id, name)
       VALUES ($1, $1)
       ON CONFLICT (device_id) DO NOTHING`,
      [device_id]
    );

    // Insert reading
    await query(
      `INSERT INTO readings (device_id, ts, temp_c, humidity, sound_db)
       VALUES ($1, $2, $3, $4, $5)`,
      [device_id, ts.toISOString(), temp_c, humidity, sound_db]
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error("webhook error", e);
    return { statusCode: 500, body: "Server error" };
  }
};
