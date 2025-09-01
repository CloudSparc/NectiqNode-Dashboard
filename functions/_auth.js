// functions/_auth.js
import { query } from './utils/db.js';
import { jwtVerify, createRemoteJWKSet, decodeJwt } from 'jose';

const isUUID = (s) =>
  typeof s === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

/**
 * Verify a Netlify Identity JWT by deriving the issuer from the token itself.
 * This avoids any mismatch between SITE_URL/URL and the Identity site.
 */
async function verifyIdentityJWTFromHeader(authorization) {
  if (!authorization?.startsWith('Bearer ')) throw new Error('No bearer token');
  const token = authorization.slice(7).trim();

  // Read iss (issuer) from token payload without verifying yet
  const decoded = decodeJwt(token);
  const iss = decoded?.iss;
  if (!iss) throw new Error('Missing iss in token');

  // Netlify Identity JWKS lives at: {iss}/.well-known/jwks.json
  const jwksUrl = new URL('/.well-known/jwks.json', iss);
  const JWKS = createRemoteJWKSet(jwksUrl);

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: iss,
    audience: 'netlify',  // Netlify Identity uses "netlify"
  });

  return {
    sub: payload.sub,
    email: payload.email || '',
  };
}

export async function requireUser(event) {
  try {
    // 1) Try Netlify-provided user (when it works, this is already populated)
    let id, email;
    const ctxUser = event?.clientContext?.user;

    if (ctxUser) {
      id = ctxUser.sub || ctxUser.id || ctxUser.user_id;
      email = ctxUser.email || '';
    } else {
      // 2) Fallback: verify Authorization header manually (most robust path)
      const auth = event.headers?.authorization || event.headers?.Authorization;
      const { sub, email: em } = await verifyIdentityJWTFromHeader(auth);
      id = sub;
      email = em;
    }

    if (!id) {
      return [null, { statusCode: 401, body: 'Unauthorized (no user id)' }];
    }

    if (!isUUID(id)) {
      // If your Identity is not issuing UUIDs, either change users.id to TEXT
      // or create a mapping table. For now we enforce UUIDs.
      return [null, { statusCode: 500, body: 'Server expects UUID user ids from Identity' }];
    }

    // Auto-provision the user and keep email in sync
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
