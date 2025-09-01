// functions/whoami.js
import { requireUser } from './_auth.js';

const json = (code, body) => ({
  statusCode: code,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export const handler = async (event) => {
  try {
    const user = await requireUser(event);   // verifies the Bearer JWT
    return json(200, { ok: true, user });
  } catch (e) {
    // If requireUser deliberately threw a Netlify-style response (e.g., 401),
    // just return it so Netlify doesn’t crash the function.
    if (e?.statusCode) return e;

    console.error('whoami error:', e);
    return json(500, { ok: false, error: e?.message ?? 'server error' });
  }
};
