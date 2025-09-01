// functions/_auth.js
// Server-side auth helper for Netlify Identity using the Identity /user endpoint.
// This avoids JWKS lookups and validates the token directly with Identity.

const json = (code, body) => ({
  statusCode: code,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

function getAuthHeader(event) {
  const h = event.headers || {};
  return h.authorization || h.Authorization || '';
}

function buildIdentityBase(event) {
  const host = (event.headers?.host || '').trim();
  const scheme = host.startsWith('localhost') ? 'http' : 'https';
  return `${scheme}://${host}/.netlify/identity`;
}

/**
 * Validates the token by delegating to Netlify Identity itself.
 * If valid, returns a normalized user object.
 * If invalid, throws a 401 JSON response.
 */
export async function requireUser(event) {
  const authz = getAuthHeader(event);
  if (!authz || !authz.startsWith('Bearer ')) {
    throw json(401, { error: 'Unauthorized' });
  }

  const identityBase = buildIdentityBase(event);
  const url = `${identityBase}/user`;

  let resp;
  try {
    resp = await fetch(url, { headers: { Authorization: authz } });
  } catch (e) {
    console.error('Identity /user fetch failed:', e?.message || e);
    throw json(502, { error: 'Identity unavailable' });
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error('Identity /user non-200:', resp.status, text);
    throw json(401, { error: 'Unauthorized' });
  }

  const raw = await resp.json();
  // Normalize the shape to something simple your functions can use
  return {
    id: raw?.id || raw?.sub || null,
    email: raw?.email || null,
    app_metadata: raw?.app_metadata || {},
    user_metadata: raw?.user_metadata || {},
    _raw: raw,
  };
}

/**
 * Optional: a tiny function you can hit at /api/whoami for debugging.
 */
export const handler = async (event) => {
  try {
    const user = await requireUser(event);
    return json(200, { ok: true, user });
  } catch (e) {
    if (e?.statusCode) return e;
    console.error('whoami error:', e);
    return json(500, { error: 'server error' });
  }
};
