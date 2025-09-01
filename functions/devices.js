// functions/devices.js
import { requireUser } from './_auth.js';
import { sql } from './utils/db.js';

export async function handler(event) {
  const debug = event.queryStringParameters?.debug === '1';

  try {
    const user = await requireUser(event); // { id, email }
    // NOTE: sql(...) returns an array of rows directly
    const rows = await sql`
      SELECT d.device_id, d.name
      FROM device_users du
      JOIN devices d ON d.device_id = du.device_id
      WHERE du.user_id = ${user.id}
      ORDER BY d.name NULLS LAST, d.device_id
    `;

    const body = { devices: rows };
    if (debug) {
      body.debug = {
        user,
        deviceCount: rows.length,
        sample: rows.slice(0, 2),
      };
    }

    return {
      statusCode: 200,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  } catch (err) {
    console.error('devices error:', err);
    return {
      statusCode: 502,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        error: 'Bad Gateway',
        details: String(err?.message || err),
        stack: process.env.NODE_ENV === 'production' ? undefined : err?.stack,
      }),
    };
  }
}
