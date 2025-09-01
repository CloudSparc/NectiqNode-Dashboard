// functions/whoami.js
import { requireUser, getAuthContext } from './_auth.js';

export async function handler(event) {
  const debug = event.queryStringParameters?.debug === '1';

  try {
    const ctx = await getAuthContext(event); // doesn't throw; just inspects headers
    let user = null;
    let ok = false;
    try {
      const u = await requireUser(event); // verifies JWT and upserts the user row
      user = { id: u.id, email: u.email, roles: u.roles || [] };
      ok = true;
    } catch (e) {
      ok = false;
    }

    const body = { ok, user };
    if (debug) {
      body.debug = {
        hasAuthHeader: !!ctx.authHeader,
        authHeaderPrefix: ctx.authHeader?.slice(0, 10) || null,
        clientContextHasUser: !!ctx.clientContextUser,
        issuer: ctx.issuer,
        jwksUrl: ctx.jwksUrl,
      };
    }

    return {
      statusCode: ok ? 200 : 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ok: false, error: String(err?.message || err) }),
    };
  }
}
