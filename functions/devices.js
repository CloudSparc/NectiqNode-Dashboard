// functions/devices.js
import { requireUser, hasRole } from './_auth.js';
import { sql } from './utils/db.js'; // your existing PG helper

export default async (event) => {
  const { user, error } = requireUser(event);
  if (error) return error;

  // upsert user (first seen)
  await sql`insert into users (id, email)
            values (${user.sub}, ${user.email})
            on conflict (id) do update set email = excluded.email`;

  const isAdmin = hasRole(user, 'admin');

  const rows = isAdmin
    ? await sql`select device_id, coalesce(name, device_id) as name
                from devices order by name`
    : await sql`
        select d.device_id, coalesce(d.name, d.device_id) as name
        from device_users du
        join devices d on d.device_id = du.device_id
        where du.user_id = ${user.sub}
        order by name`;

  return new Response(JSON.stringify({ devices: rows }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
