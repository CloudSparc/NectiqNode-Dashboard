// functions/devices.js
import { requireUser } from './_auth.js';
import { query } from './utils/db.js';

export async function handler(event) {
  const [user, err] = await requireUser(event);
  if (err) return err;

  // Return only devices the user has access to
  const { rows } = await query`
    SELECT d.device_id, d.name
    FROM device_users du
    JOIN devices d ON d.device_id = du.device_id
    WHERE du.user_id = ${user.id}::uuid
    ORDER BY COALESCE(d.name, d.device_id)
  `;

  // Important: 200 with empty list is OK (don’t return 401)
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ devices: rows }),
  };
}
