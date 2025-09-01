// functions/devices.js
import { requireUser } from './_auth.js';
import { sql } from './utils/db.js';

export async function handler(event) {
  try {
    const user = await requireUser(event); // ensures user exists in DB and gives you { id, email }

    // NOTE: sql(...) returns an array of rows directly
    const rows = await sql`
      SELECT d.device_id, d.name
      FROM device_users du
      JOIN devices d ON d.device_id = du.device_id
      WHERE du.user_id = ${user.id}
      ORDER BY d.name NULLS LAST, d.device_id
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ devices: rows }),
      headers: { 'content-type': 'application/json' },
    };
  } catch (err) {
    console.error('devices error', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Bad Gateway', details: String(err?.message || err) }),
      headers: { 'content-type': 'application/json' },
    };
  }
}
