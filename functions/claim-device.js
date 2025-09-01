// functions/claim-device.js
import { requireUser } from './_auth.js';
import { query } from './utils/db.js';

export const handler = async (event) => {
  try {
    const user = await requireUser(event); // throws 401 response on fail

    const { device_id, name } = JSON.parse(event.body || '{}');
    if (!device_id) {
      return { statusCode: 400, body: JSON.stringify({ error: 'device_id required' }) };
    }

    // ... your DB logic (ensure user row, claim device, etc.) ...
    // await query`insert into ...`;

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (resp) {
    // If requireUser threw the 401 response, return it unchanged.
    if (resp?.statusCode) return resp;
    // Otherwise it's an unexpected error.
    return { statusCode: 500, body: JSON.stringify({ error: 'Server error' }) };
  }
};
