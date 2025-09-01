// /netlify/functions/claim-device.js
import { requireUser } from "./_auth.js";
import { getClient } from "./db.js";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const { user, error } = await requireUser(event);
  if (error) return { statusCode: error.statusCode, body: JSON.stringify({ ok: false, error: error.message }) };

  try {
    const { device_id, role } = JSON.parse(event.body || "{}");
    if (!device_id) {
      return { statusCode: 400, body: JSON.stringify({ ok: false, error: "device_id is required" }) };
    }

    const db = await getClient();

    // Ensure device exists
    await db.query(
      `INSERT INTO devices (device_id, name) VALUES ($1, $2)
       ON CONFLICT (device_id) DO NOTHING`,
      [device_id, device_id]
    );

    // Link user ↔ device
    await db.query(
      `INSERT INTO device_users (device_id, user_id, role)
       VALUES ($1, $2, COALESCE($3,'owner'))
       ON CONFLICT (device_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
      [device_id, user.id, role || "owner"]
    );

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server error" }) };
  }
};
