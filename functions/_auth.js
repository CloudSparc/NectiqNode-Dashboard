// functions/_auth.js
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Where your site is hosted (Netlify sets one of these at build/runtime)
const SITE_URL =
  process.env.URL ||
  process.env.DEPLOY_PRIME_URL ||
  'https://nectiqdashboard.netlify.app';

// Netlify Identity issuer for this site
function issuerUrl() {
  return `${SITE_URL.replace(/\/$/, '')}/.netlify/identity`;
}

// Build a remote JWKS fetcher. Some stacks expose JWKS at the root as well,
// so we try identity first, then root.
function jwksFetcher() {
  const iss = issuerUrl();
  const identityJWKS = new URL('/.well-known/jwks.json', iss).toString();
  const rootJWKS = new URL('/.well-known/jwks.json', SITE_URL).toString();

  // We'll return a function that first tries identity JWKS; if that fails during
  // verification, we try the root JWKS path.
  const primary = createRemoteJWKSet(new URL(identityJWKS));
  const fallback = createRemoteJWKSet(new URL(rootJWKS));

  return async (protectedHeader, token) => {
    try {
      return await primary(protectedHeader, token);
    } catch {
      return await fallback(protectedHeader, token);
    }
  };
}

const JWKS = jwksFetcher();

/**
 * Verify an Authorization: Bearer <jwt> header against Netlify Identity.
 * Returns `{ id, email, app_metadata }` on success, or `null` on failure.
 */
export async function verifyNetlifyJwt(authorization) {
  if (!authorization || !authorization.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = authorization.slice(7); // strip "Bearer "

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ['RS256'],
      issuer: issuerUrl(), // expected iss in the token
    });

    return {
      id: payload.sub,
      email: payload.email,
      app_metadata: payload.app_metadata || {},
    };
  } catch (err) {
    // console.warn('JWT verify failed:', err?.message);
    return null;
  }
}

/**
 * Extracts the user from a Netlify function event (Authorization header).
 * Returns the user object or null.
 */
export async function getUserFromEvent(event) {
  const auth =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    event.multiValueHeaders?.authorization?.[0] ||
    event.multiValueHeaders?.Authorization?.[0];

  return await verifyNetlifyJwt(auth);
}

/**
 * Require a valid user for a function.
 * - Resolves with the `user` object if authorized
 * - Throws an object `{ statusCode, body }` you can `catch` and `return` for 401 cases
 *
 * Usage:
 *   try {
 *     const user = await requireUser(event);
 *     // ...authorized work...
 *   } catch (resp) {
 *     return resp; // 401 response
 *   }
 */
export async function requireUser(event) {
  const user = await getUserFromEvent(event);
  if (!user) {
    throw {
      statusCode: 401,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }
  return user;
}
