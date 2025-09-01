// functions/utils/db.js
import pg from "pg";

let client;

// Reusable pooled client
export async function getClient() {
  if (!client) {
    const { Client } = pg;
    client = new Client({
      connectionString: process.env.DATABASE_URL || process.env.NETLIFY_DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
  }
  return client;
}

// Convenience query wrapper
export async function query(text, params = []) {
  const db = await getClient();
  return db.query(text, params);
}

// Ensure schema exists (used by webhook; safe to call multiple times)
export async function ensureSchema() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS devices (
      device_id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS device_users (
      device_id TEXT REFERENCES devices(device_id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      role TEXT DEFAULT 'owner',
      PRIMARY KEY (device_id, user_id)
    );
