import { requireUser } from './_auth.js';

export async function handler(event) {
  const auth = event.headers?.authorization || event.headers?.Authorization || '';
  const hasAuthHeader = /^Bearer\s+/i.test(auth);
  const authHeaderPrefix = hasAuthHeader ? auth.slice(0, 10) : '';

  const clientContextHasUser = !!event?.clientContext?.user;

  const [user, err] = await requireUser(event);

  if (err) {
    // Surface the error for debugging while we’re wiring things up
    return {
      statusCode: err.statusCode || 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        hasAuthHeader,
        authHeaderPrefix,
        clientContextHasUser,
        user: null,
        note: 'Verification failed in requireUser',
      }),
    };
  }

  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      hasAuthHeader,
      authHeaderPrefix,
      clientContextHasUser,
      user, // { id, email }
    }),
  };
}
