// functions/_auth.js
import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";
import fetch from "cross-fetch";
import { getClient } from "./utils/db.js";

const JWKS_URI = process.env.NETLIFY_IDENTITY_JWKS;

const client = jwksClient({ jwksUri: JWKS_URI });

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

export async function requireUser(event) {
  try {
    const auth = event.headers.authorization || event.headers.Authorization;
    if (!auth || !auth.startsWith("Bearer ")) {
      return { error: { statusCode: 401, message: "Missing Bearer token" } };
    }

    const token = auth.slice("Bearer ".length);
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        { algorithms: ["RS256", "HS256"] },
        (err, payload) => (err ? reject(err) : resolve(payload))
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
