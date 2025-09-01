// functions/utils/db.js
import { Pool } from 'pg';

/**
 * Get the connection string from Netlify/Neon envs.
 * We support DATABASE_URL (your own), or Netlify's Neon integration vars.
 */
const CS =
  process.env.DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL ||
  process.env.NETLIFY_DATABASE_URL_UNPOOLED;

if (!CS) {
  throw new Error('Missing DATABASE_URL (Neon Postgres connection string)');
}

/**
 * Neon requires SSL. rejectUnauthorized:false is safe for serverless clients.
 */
export const pool = new Pool({
  connectionString: CS,
  ssl: { rejectUnauthorized: false },
});

/**
 * sql` ... ${param} ... `
 * A minimal tagged-template helper that parameterizes values as $1, $2, ...
 * Returns rows (res.rows), which is what your functions expect.
 */
export async function sql(strings, ...values) {
  // Build parameterized query text
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }

  const { rows } = await pool.query(text, values);
  return rows;
}

/**
 * If you ever need the full result object (rowCount, etc.) use exec instead.
 */
export async function exec(strings, ...values) {
  let text = '';
  for (let i = 0; i < strings.length; i++) {
    text += strings[i];
    if (i < values.length) text += `$${i + 1}`;
  }
  return pool.query(text, values);
}
