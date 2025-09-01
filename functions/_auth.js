// functions/_auth.js
import { query } from './utils/db.js';
import { jwtVerify, createRemoteJWKSet } from 'jose';

const isUUID = (s) =>
  typeof s === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

// Cache JWKS between invocations
let JWKS;

/**
 * Verify a Netlify Identity JWT manually when clientContext.user is missing.
 * Returns { sub, email } or throws.
 */
async function verifyIdentityJWT(authorization) {
  if (!authorization?.startsWith('Bearer ')) {
    throw new Error('No bearer token');
  }
  const token = authorization.slice(7).trim();

  // In Netlify Functions, URL is the site URL (prod) or deploy URL.
  // SITE_URL also works. Prefer URL, fallback to SITE_URL.
  const origin = (process.env.URL || process.env.SITE_URL || '').replace(/\/$/, '');
  if (!origin) throw new Error('Missing site URL env');

  // Netlify Identity JWKS + issuer
  const jwksUrl = new URL('/.netlify/identity/.well-known/jwks.json', origin);
  const issuer  = `${origin}/.netlify/identity`;

  if (!JWKS) JWKS = createRemoteJWKSet(jwksUrl);
  const { payload } = await jwtVerify(token, JWKS, { issuer, audience: 'netlify' });

  return {
    sub: payload.sub,
    email: payload.email || ''
  };
}

/**
 * Read the Netlify user from the request, verify if needed, and ensure a DB row.
 * Returns [user, null] on success or [null, httpError] on failure.
 */
export async function requireUser(event) {
  try {
    // 1) Try Netlify-provided user first
    let u = event?.clientContext?.user;
    let id, email;

    if (u) {
      id = u.sub || u.id || u.user_id;
      email = u.email || '';
    } else {
      // 2) Fallback: verify the Authorization header ourselves
      const auth = event.headers?.authorization || event.headers?.Authorization;
      const decoded = await verifyIdentityJWT(auth);
      id = decoded.sub;
      email = decoded.email;
    }

    if (!id) {
      return [null, { statusCode: 401, body: 'Unauthorized (no user id)' }];
    }

    // Many Identity providers use UUIDs; if for some reason it's not, you can
    // change your DB schema to TEXT or store a mapping. For now we enforce UUID.
    if (!isUUID(id)) {
      return [null, { statusCode: 500, body: 'Server expects UUID user ids from Identity' }];
    }

    // Auto-provision / keep email fresh
    await query`
      INSERT INTO users (id, email)
      VALUES (${id}::uuid, ${email})
      ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email
    `;

    return [{ id, email }, null];
  } catch (e) {
    console.error('requireUser failed:', e);
    return [null, { statusCode: 401, body: 'Unauthorized' }];
  }
}
