// functions/utils/db.js
import pg from 'pg';
const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;
if (!connectionString) {
  throw new Error('Missing DATABASE_URL (Neon Postgres connection string)');
}

// Neon requires SSL in most cases
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

export async function query(q, params) {
  const client = await pool.connect();
  try {
    const res = await client.query(q, params);
    return res;
  } finally {
    client.release();
  }
}

// Ensure tables exist (run at cold start)
export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      name TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS readings (
      id BIGSERIAL PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
      ts TIMESTAMPTZ NOT NULL,
      temp_c DOUBLE PRECISION,
      humidity DOUBLE PRECISION,
      sound_db DOUBLE PRECISION,
      payload_json JSONB
    );
  `);
}
