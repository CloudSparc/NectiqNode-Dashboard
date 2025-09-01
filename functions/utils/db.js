// functions/utils/db.js
import { Pool } from 'pg';

/**
 * Connection string: prefer DATABASE_URL; fall back to Netlify Neon vars
 */
const CS =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!CS) {
  throw new Error('Missing DATABASE_URL (Neon Postgres connection string)');
}

/**
 * Neon requires SSL in serverless functions
 */
export const pool = new Pool({
  connectionString: CS,
  ssl: { rejectUnauthorized: false },
});

/**
 * sql` ... ${param} ... `
 * Returns ONLY rows (res.rows).
 */
export async function sql(strings, ...values) {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  const { rows } = await pool.query(text, values);
  return rows;
}

/**
 * exec` ... ${param} ... `
 * Returns the full pg result object (rowCount, rows, etc.).
 */
export async function exec(strings, ...values) {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  return pool.query(text, values);
}

/**
 * query(...)
 * Compatibility helper for code that calls either:
 *   1) query`select ... ${x}`               (tagged template)
 *   2) query('select ... where x=$1', [x])  (text + params)
 * Returns the full pg result object.
 */
export async function query(first, ...rest) {
  // Tagged template usage
  if (Array.isArray(first) && Object.prototype.hasOwnProperty.call(first, 'raw')) {
    let text = '';
    const values = rest;
    for (let i = 0; i < first.length; i++) {
      text += first[i];
      if (i < values.length) text += `$${i + 1}`;
    }
    return pool.query(text, values);
  }

  // Text + params usage
  const text = String(first);
  const params = rest && rest.length ? rest[0] : [];
  return pool.query(text, params);
}

/**
 * ensureSchema()
 * Create the tables used by the app if they don't exist.
 * Safe to call on every cold start / first webhook call.
 */
export async function ensureSchema() {
  await exec`
    create table if not exists devices (
      device_id text primary key,
      name      text
    )
  `;

  await exec`
    create table if not exists readings (
      id         bigserial primary key,
      device_id  text references devices(device_id) on delete cascade,
      ts         timestamptz not null default now(),
      temp_c     double precision,
      humidity   double precision,
      sound_db   double precision,
      payload_json jsonb
    )
  `;

  // optional helpful indexes (idempotent)
  await exec`create index if not exists idx_readings_device_ts on readings (device_id, ts)`;
}
