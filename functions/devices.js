import { requireUser } from './_auth.js';
import { sql } from './utils/db.js';

export async function handler(event, context) {
  try {
    const user = await requireUser(event);

    // ✅ Correct: sql returns rows directly
    const devices = await sql`
      SELECT d.device_id, d.name
      FROM device_users du
      JOIN devices d ON d.device_id = du.device_id
      WHERE du.user_id = ${user.id}
    `;

    return {
      statusCode: 200,
      body: JSON.stringify({ devices }),
    };
  } catch (err) {
    console.error('devices error', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
}
