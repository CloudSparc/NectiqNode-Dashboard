// functions/whoami.js
import { requireUser } from './_auth.js';

export const handler = async (event) => {
  try {
    const { user, debug } = await requireUser(event);
    return new Response(JSON.stringify({ ok: true, user, debug }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unauthorized', detail: String(err?.message || err) }), {
      status: err?.statusCode || 401,
      headers: { 'content-type': 'application/json' }
    });
  }
};
