// /netlify/functions/whoami.js
import { requireUser } from "./_auth.js";

export const handler = async (event) => {
  const { user, error } = await requireUser(event);
  if (error) {
    return { statusCode: error.statusCode, body: JSON.stringify({ ok: false, error: error.message }) };
  }
  return { statusCode: 200, body: JSON.stringify({ ok: true, user }) };
};
