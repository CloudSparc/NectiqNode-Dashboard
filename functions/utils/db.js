// /netlify/functions/db.js
import pg from "pg";

let client;
export async function getClient() {
  if (!client) {
    const { Client } = pg;
    client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    await client.connect();
  }
  return client;
}
