// functions/_auth.js
import { query } from './utils/db.js';

/**
 * Reads Netlify Identity user from the function event, creates/updates a
 * row in `users` table, and returns { id, email }.
 *
 * Usage in a function:
 *   const [user, err] = await requireUser(event);
 *   if (err) return err; // { statusCode, body }
 *   // user.id, user.email available
 */
export async function requireUser(event) {
  const u = event?.clientContext?.user;
  if (!u) {
    return [null, { statusCode: 401, body: 'Unauthorized (no token)' }];
  }

  // Netlify Identity (GoTrue) user id is a UUID string
  const id = u.sub || u.id || u.user_id;
  const email = u.email || '';

  if (!id) {
    return [null, { statusCode: 401, body: 'Unauthorized (no user id)' }];
  }

  // Auto-provision (or refresh email) on first use
  await query`
    INSERT INTO users (id, email)
    VALUES (${id}::uuid, ${email})
    ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
  `;

  return [{ id, email }, null];
}
