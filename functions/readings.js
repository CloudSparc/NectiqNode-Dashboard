// functions/readings.js
import { query, ensureSchema } from './utils/db.js';

export default async (req, context) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const device_id = url.searchParams.get('device_id');
  const limit = parseInt(url.searchParams.get('limit') || '200', 10);
  if (!device_id) return json({ error: 'device_id required' }, 400);

  try {
    await ensureSchema();
    const { rows } = await query(`
      SELECT ts, temp_c, humidity, sound_db, payload_json
      FROM readings
      WHERE device_id = $1
      ORDER BY ts DESC
      LIMIT $2
    `, [device_id, limit]);
    rows.reverse();
    return json({ device_id, readings: rows });
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
