// functions/readings.js
import { requireUser } from './_auth.js';
import { query } from './utils/db.js';

export async function handler(event) {
  const [user, err] = await requireUser(event);
  if (err) return err;

  const p = new URLSearchParams(event.queryStringParameters || {});
  const device_id = p.get('device_id');
  const limit = Math.min(parseInt(p.get('limit') || '200', 10), 200);

  if (!device_id) return { statusCode: 400, body: 'device_id required' };

  // Optional guard: only allow if the user has access to this device
  const own = await query`
    SELECT 1 FROM device_users WHERE device_id = ${device_id} AND user_id = ${user.id}::uuid
  `;
  if (own.rowCount === 0) {
    return { statusCode: 403, body: 'Forbidden (no access to device)' };
  }

  const { rows } = await query`
    SELECT ts, temp_c, humidity, sound_db
    FROM readings
    WHERE device_id = ${device_id}
    ORDER BY ts ASC
    LIMIT ${limit}
  `;

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ readings: rows }),
  };
}
