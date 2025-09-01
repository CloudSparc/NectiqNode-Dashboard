// functions/readings.js
import { requireUser } from './_auth.js';
import { sql } from './utils/db.js';

export async function handler(event) {
  try {
    const user = await requireUser(event);

    const { device_id, limit = 200 } =
      (event.queryStringParameters || {});

    // Optional: verify the user actually owns this device
    const owns = await sql`
      SELECT 1
      FROM device_users
      WHERE user_id = ${user.id} AND device_id = ${device_id}
      LIMIT 1
    `;
    if (owns.length === 0) {
      return { statusCode: 403, body: JSON.stringify({ error: 'Forbidden' }) };
    }

    const rows = await sql`
      SELECT ts, temp_c, humidity, sound_db
      FROM readings
      WHERE device_id = ${device_id}
      ORDER BY ts ASC
      LIMIT ${limit}
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ readings: rows }),
      headers: { 'content-type': 'application/json' },
    };
  } catch (err) {
    console.error('readings error', err);
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Bad Gateway', details: String(err?.message || err) }),
      headers: { 'content-type': 'application/json' },
    };
  }
}
