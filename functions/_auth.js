import { query } from './utils/db.js';
import { jwtVerify, createRemoteJWKSet, decodeJwt } from 'jose';

const isUUID = (s) =>
  typeof s === 'string' &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

async function verifyIdentityJWTFromHeader(authorization) {
  if (!authorization?.startsWith('Bearer ')) throw new Error('No bearer token');
  const token = authorization.slice(7).trim();

  // Read issuer from the token itself
  const decoded = decodeJwt(token);
  const iss = decoded?.iss;
  if (!iss) throw new Error('Missing iss in token');

  // Netlify Identity JWKS: {iss}/.well-known/jwks.json
  const jwksUrl = new URL('/.well-known/jwks.json', iss);
  const JWKS = createRemoteJWKSet(jwksUrl);

  const { payload } = await jwtVerify(token, JWKS, {
    issuer: iss,
    audience: 'netlify',
  });

  return {
    sub: payload.sub,
    email: payload.email || '',
    iss,
  };
}

export async function requireUser(event) {
  try {
    let id, email, iss;
    const ctxUser = event?.clientContext?.user;

    if (ctxUser) {
      id = ctxUser.sub || ctxUser.id || ctxUser.user_id;
      email = ctxUser.email || '';
    } else {
      const auth = event.headers?.authorization || event.headers?.Authorization;
      const r = await verifyIdentityJWTFromHeader(auth);
      id = r.sub;
      email = r.email;
      iss = r.iss;
      console.log('Verified via header; iss =', iss);
    }

    if (!id) return [null, { statusCode: 401, body: 'Unauthorized (no user id)' }];

    if (!isUUID(id)) {
      return [null, { statusCode: 500, body: 'Server expects UUID user ids from Identity' }];
    }

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
