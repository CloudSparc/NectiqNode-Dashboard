// functions/readings.js
import { requireUser } from './_auth.js';
import { sql } from './utils/db.js';

export async function handler(event) {
  const debug = event.queryStringParameters?.debug === '1';

  try {
    const user = await requireUser(event);
    const { device_id, limit = 200 } = event.queryStringParameters || {};

    // Verify the user owns the device
    const owns = await sql`
      SELECT 1 FROM device_users
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

    const body = { readings: rows };
    if (debug) {
      body.debug = {
        user,
        count: rows.length,
        firstTs: rows[0]?.ts || null,
        lastTs: rows[rows.length - 1]?.ts || null,
      };
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  } catch (err) {
    console.error('readings error:', err);
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Bad Gateway', details: String(err?.message || err) }),
    };
  }
}
