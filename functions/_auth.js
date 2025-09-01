// functions/_auth.js
import { jwtVerify, createRemoteJWKSet } from 'jose';

const json = (code, body) => ({
  statusCode: code,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function getAuthHeader(event) {
  const h = event.headers || {};
  return h.authorization || h.Authorization || '';
}

function buildIssuer(event) {
  // Works on prod, deploy previews, and netlify dev
  const host = (event.headers?.host || '').trim();
  const scheme = host.startsWith('localhost') ? 'http' : 'https';
  return `${scheme}://${host}/.netlify/identity`;
}

export async function requireUser(event) {
  const authz = getAuthHeader(event);
  if (!authz?.startsWith('Bearer ')) {
    throw json(401, { error: 'Unauthorized' });
  }

  const token = authz.slice('Bearer '.length).trim();
  const issuer = buildIssuer(event);
  const jwksUrl = `${issuer}/.well-known/jwks.json`;

  try {
    const JWKS = createRemoteJWKSet(new URL(jwksUrl));
    // Skip audience check; Identity tokens typically don’t carry one you control
    const { payload } = await jwtVerify(token, JWKS, { issuer });

    // Shape your user object here:
    const user = {
      id: payload.sub,
      email: payload.email,
      app_metadata: payload.app_metadata,
      user_metadata: payload.user_metadata,
    };
    return user;
  } catch (e) {
    console.error('JWT verify failed:', {
      message: e?.message,
      name: e?.name,
      issuer,
      jwksUrl,
    });
    // return 401 instead of throwing a raw object
    throw json(401, { error: 'Unauthorized' });
  }
}

export const handler = async (event) => {
  // optional: a tiny endpoint for quick checks
  try {
    const user = await requireUser(event);
    return json(200, { ok: true, user });
  } catch (e) {
    if (e?.statusCode) return e;
    console.error('auth handler error:', e);
    return json(500, { error: 'server error' });
  }
};
