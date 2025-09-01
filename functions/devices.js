// functions/devices.js
import { query, ensureSchema } from './utils/db.js';

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  try {
    await ensureSchema();
    const { rows } = await query(`SELECT device_id, COALESCE(name, device_id) AS name FROM devices ORDER BY device_id`);
    return json({ devices: rows });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
};

function cors() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
}
function json(body, status=200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(), 'Content-Type': 'application/json' } });
}
