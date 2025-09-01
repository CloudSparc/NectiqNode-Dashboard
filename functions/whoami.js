// functions/whoami.js
export async function handler(event) {
  return {
    statusCode: 200,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      // what the function sees
      hasAuthHeader: !!event.headers.authorization,
      authHeaderPrefix: event.headers.authorization?.slice(0, 10) || null,
      clientContextHasUser: !!event.clientContext?.user,
      user: event.clientContext?.user || null,
    }, null, 2),
  };
}
