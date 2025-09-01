// functions/readings.js
import { requireUser, hasRole } from './_auth.js';
import { sql } from './utils/db.js';

export default async (event) => {
  const { user, error } = requireUser(event);
  if (error) return error;

  const url = new URL(event.rawUrl || `http://x${event.path}?${event.queryStringParameters ?? ''}`);
  const device_id = url.searchParams.get('device_id');
  const limit = Math.min(Number(url.searchParams.get('limit') || 200), 1000);

  if (!device_id)
    return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });

  // authZ: admins can read any; others only their devices
  const isAdmin = hasRole(user, 'admin');
  if (!isAdmin) {
    const allowed = await sql`
      select 1 from device_users
      where device_id = ${device_id} and user_id = ${user.sub} limit 1`;
    if (allowed.length === 0) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
    }
  }

  const readings = await sql`
    select ts, temp_c, humidity, sound_db
    from readings
    where device_id = ${device_id}
    order by ts asc
    limit ${limit}`;

  return new Response(JSON.stringify({ readings }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
