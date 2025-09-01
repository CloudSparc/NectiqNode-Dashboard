// functions/particle-webhook.js
import { query, ensureSchema } from './utils/db.js';

export default async (req, context) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cors() });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const secret = req.headers.get('x-webhook-secret');
  if (!secret || secret !== (process.env.WEBHOOK_SECRET || 'change-me')) {
    return json({ error: 'unauthorized' }, 401);
  }

  let payload;
  try { payload = await req.json(); }
  catch { return json({ error: 'invalid json' }, 400); }

  const device_id = payload.device_id || payload.coreid || 'unknown';
  const published_at = payload.published_at;
  const data = payload.data;

  // parse data
  let parsed = {};
  if (typeof data === 'string') {
    try { parsed = JSON.parse(data); }
    catch {
      const parts = data.split(',').map(p => p.trim());
      if (parts.length >= 3) parsed = { t: parseFloat(parts[0]), h: parseFloat(parts[1]), s: parseFloat(parts[2]) };
    }
  } else if (data && typeof data === 'object') {
    parsed = data;
  }

  const t = coalesce(parsed.t, parsed.temp, parsed.temperature);
  const h = coalesce(parsed.h, parsed.hum, parsed.humidity);
  const s = coalesce(parsed.s, parsed.sound, parsed.sound_db);

  let ts;
  try { ts = published_at ? new Date(published_at).toISOString() : new Date().toISOString(); }
  catch { ts = new Date().toISOString(); }

  try {
    await ensureSchema();
    await query(`
      INSERT INTO devices (device_id, name)
      VALUES ($1, $1)
      ON CONFLICT (device_id) DO NOTHING
    `, [device_id]);

    await query(`
      INSERT INTO readings (device_id, ts, temp_c, humidity, sound_db, payload_json)
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
    `, [device_id, ts, t, h, s, JSON.stringify(payload)]);
  } catch (e) {
    return json({ error: 'db error', details: e.message }, 500);
  }

  return json({ status: 'ok' });
};

function coalesce(...vals) {
  for (const v of vals) if (v !== undefined && v !== null) return v;
  return null;
}

function cors() {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ORIGINS || '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Secret'
  };
}

function json(body, status=200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors(), 'Content-Type': 'application/json' } });
}
