// functions/readings.js
import { requireUser } from "./_auth.js";
import { getClient } from "./utils/db.js";

function parseSince(since) {
  if (!since) return null;
  const m = /^(\d+)([hd])$/i.exec(since);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const ms = m[2].toLowerCase() === "h" ? n * 3600_000 : n * 24 * 3600_000;
  return new Date(Date.now() - ms);
}

export const handler = async (event) => {
  const { user, error } = await requireUser(event);
  if (error) return { statusCode: error.statusCode, body: JSON.stringify({ ok: false, error: error.message }) };

  try {
    const deviceId = event.queryStringParameters?.device_id;
    const sinceStr = event.queryStringParameters?.since;
    if (!deviceId) return { statusCode: 400, body: JSON.stringify({ ok: false, error: "device_id is required" }) };

    const db = await getClient();

    const hasAccess = await db.query(
      `SELECT 1 FROM device_users WHERE device_id = $1 AND user_id = $2`,
      [deviceId, user.id]
    );
    if (hasAccess.rowCount === 0) {
      return { statusCode: 403, body: JSON.stringify({ ok: false, error: "Forbidden" }) };
    }

    const since = parseSince(sinceStr);
    const params = [deviceId];
    let sql = `SELECT ts, temp_c, humidity, sound_db FROM readings WHERE device_id = $1`;
    if (since) {
      params.push(since.toISOString());
      sql += ` AND ts >= $2`;
    }
    sql += ` ORDER BY ts ASC LIMIT 5000`;

    const { rows } = await db.query(sql, params);
    return { statusCode: 200, body: JSON.stringify({ ok: true, readings: rows }) };
  } catch (e) {
    console.error(e);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "Server error" }) };
  }
};
