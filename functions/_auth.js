// functions/_auth.js
import { createRemoteJWKSet, jwtVerify } from 'jose';

const ISSUER = `https://${process.env.URL?.replace(/^https?:\/\//, '') || process.env.SITE_NAME}.netlify.app/.netlify/identity`;
const JWKS_URL = `${ISSUER}/.well-known/jwks.json`;
const JWKS = createRemoteJWKSet(new URL(JWKS_URL));

export async function requireUser(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  if (!auth.startsWith('Bearer ')) {
    const e = new Error('Missing bearer');
    e.statusCode = 401;
    throw e;
  }
  const token = auth.slice(7);
  const { payload } = await jwtVerify(token, JWKS, { issuer: ISSUER });
  return {
    user: {
      id: payload.sub,
      email: payload.email,
      app_metadata: payload.app_metadata || {},
      user_metadata: payload.user_metadata || {},
      _raw: payload
    },
    debug: { issuer: ISSUER, jwksUrl: JWKS_URL }
  };
}
