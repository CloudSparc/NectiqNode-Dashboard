// functions/_auth.js
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import { getClient } from "./utils/db.js";

const JWKS_URI = process.env.NETLIFY_IDENTITY_JWKS;

let jwks;
if (JWKS_URI) {
  jwks = jwksClient({ jwksUri: JWKS_URI });
}

function getKey(header, callback) {
  if (!jwks) return callback(new Error("NETLIFY_IDENTITY_JWKS not set"));
  jwks.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
}

export async function requireUser(event) {
  try {
    const auth = event.headers.authorization || event.headers.Authorization;
    if (!auth?.startsWith("Bearer ")) {
      return { error: { statusCode: 401, message: "Missing Bearer token" } };
    }
    if (!JWKS_URI) {
      return { error: { statusCode: 500, message: "Server auth misconfigured (JWKS missing)" } };
    }

    const token = auth.slice(7);
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, { algorithms: ["RS256"] }, (err, payload) =>
        err ? reject(err) : resolve(payload)
      );
    });

    const userId = decoded.sub || decoded.user_id || decoded.id;
    const email = decoded.email || decoded.user_metadata?.email || decoded?.email;
    if (!userId || !email) {
      return { error: { statusCode: 401, message: "Invalid token: missing id/email" } };
    }

    const db = await getClient();
    await db.query(
      `INSERT INTO users (id, email)
       VALUES ($1, $2)
       ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email`,
      [userId, email]
    );

    return { user: { id: userId, email } };
  } catch (err) {
    console.error("Auth error:", err);
    return { error: { statusCode: 401, message: "Unauthorized" } };
  }
}
