// functions/claim-device.js
import { requireUser } from './_auth.js';
import { sql } from './utils/db.js';

export default async (event) => {
  const { user, error } = requireUser(event);
  if (error) return error;

  const { device_id, name } = JSON.parse(event.body || '{}');
  if (!device_id) {
    return new Response(JSON.stringify({ error: 'device_id required' }), { status: 400 });
  }

  await sql`insert into devices (device_id, name)
            values (${device_id}, ${name || null})
            on conflict (device_id) do update
            set name = coalesce(excluded.name, devices.name)`;

  await sql`insert into device_users (device_id, user_id, role)
            values (${device_id}, ${user.sub}, 'owner')
            on conflict (device_id, user_id) do nothing`;

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
