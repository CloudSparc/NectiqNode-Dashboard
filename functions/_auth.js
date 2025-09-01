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
  const host = (event.headers?.host || '').trim();
  const scheme = host.startsWith('localhost') ? 'http' : 'https';
  return `${scheme}://${host}/.netlify/identity`;
}

// Netlify Identity's global JWKS location (works for prod, previews, dev)
const GLOBAL_JWKS_URL = 'https://identity.netlify.com/.well-known/jwks.json';

export async function requireUser(event) {
  const authz = getAuthHeader(event);
  if (!authz?.startsWith('Bearer ')) {
    throw json(401, { error: 'Unauthorized' });
  }

  const token = authz.slice('Bearer '.length).trim();
  const issuer = buildIssuer(event);

  try {
    const JWKS = createRemoteJWKSet(new URL(GLOBAL_JWKS_URL));
    const { payload } = await jwtVerify(token, JWKS, { issuer });

    return {
      id: payload.sub,
      email: payload.email,
      app_metadata: payload.app_metadata,
      user_metadata: payload.user_metadata,
    };
  } catch (e) {
    console.error('JWT verify failed:', {
      message: e?.message,
      name: e?.name,
      issuer,
      jwksUrl: GLOBAL_JWKS_URL,
    });
    throw json(401, { error: 'Unauthorized' });
  }
}

export const handler = async (event) => {
  try {
    const user = await requireUser(event);
    return json(200, { ok: true, user });
  } catch (e) {
    if (e?.statusCode) return e;
    console.error('auth handler error:', e);
    return json(500, { error: 'server error' });
  }
};
