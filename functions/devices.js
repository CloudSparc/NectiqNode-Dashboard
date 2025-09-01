// functions/devices.js
import { requireUser } from "./_auth.js";
import { getClient } from "./utils/db.js";

export const handler = async (event) => {
  const { user, error } = await requireUser(event);
  if (error) return { statusCode: error.statusCode, body: JSON.stringify({ ok: false, error: error.message }) };

  try {
    const db = await getClient();
    const { rows } = await db.query(
      `SELECT d.device_id, d.name
       FROM device_users du
       JOIN devices d ON d.device_id = du.device_id
       WHERE du.user_id = $1
       ORDER BY d.name ASC`,
      [user.id]
    );
    return { statusCode: 200, body: JSON.stringify({ ok: true, devices: rows }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server error" }) };
  }
};
