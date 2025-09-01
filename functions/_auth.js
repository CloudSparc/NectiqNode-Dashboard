// _auth.js (only the JWKS URL logic shown here)
import jwt from 'jsonwebtoken';

async function fetchJson(url) {
  const r = await fetch(url, { redirect: 'follow' });
  if (!r.ok) throw new Error(`JWKS fetch failed ${r.status}`);
  return r.json();
}

async function getJwksForIssuer(iss) {
  // Try the Identity path first, then fall back to the root path
  const identityJwks = `${iss.replace(/\/$/, '')}/.well-known/jwks.json`;
  const rootJwks     = `${iss.replace('/.netlify/identity', '').replace(/\/$/, '')}/.well-known/jwks.json`;

  try {
    return await fetchJson(identityJwks);
  } catch (_) {
    return await fetchJson(rootJwks);
  }
}

export async function verifyNetlifyJwt(authorization) {
  if (!authorization?.startsWith('Bearer ')) return { user: null, reason: 'no bearer' };

  const token = authorization.slice('Bearer '.length);

  // Decode header/payload without verifying to get `iss` & `kid`
  const [ , payloadB64, ] = token.split('.');
  const payload = JSON.parse(Buffer.from(payloadB64.replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));

  const iss = payload.iss;                    // e.g. https://<site>/.netlify/identity  OR  https://<site>
  const jwks = await getJwksForIssuer(iss);

  const header = JSON.parse(Buffer.from(token.split('.')[0].replace(/-/g,'+').replace(/_/g,'/'), 'base64').toString('utf8'));
  const kid = header.kid;

  const jwk = jwks.keys.find(k => k.kid === kid);
  if (!jwk) return { user: null, reason: 'kid not found' };

  // Build PEM from JWK (RSA) – minimal version:
  const pub = jwkToPem(jwk); // use a helper like 'jwk-to-pem' or your own builder
  try {
    const verified = jwt.verify(token, pub, { algorithms: ['RS256'], issuer: iss.includes('/.netlify/identity') ? iss : `${iss}/.netlify/identity` });
    return { user: { id: verified.sub, email: verified.email }, raw: verified };
  } catch (e) {
    return { user: null, reason: e.message };
  }
}
