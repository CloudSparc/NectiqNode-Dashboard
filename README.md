# NectiqNode — Netlify + Neon (Postgres) Edition

This version uses **Neon Postgres** via the `pg` client in Netlify Functions.

## Setup (Netlify)
1. In your site **Environment variables**, add:
   - `DATABASE_URL` – your Neon Postgres connection string
   - `WEBHOOK_SECRET` – shared token for the Particle header `X-Webhook-Secret`
   - `CORS_ORIGINS` – optional (default `*`)

2. Deploy this folder (connect repo or CLI). Make sure:
   - **Publish directory** = `public`
   - **Functions** = `functions`

3. Endpoints:
   - `https://YOUR-SITE.netlify.app/api/particle-webhook` (POST)
   - `https://YOUR-SITE.netlify.app/api/devices` (GET)
   - `https://YOUR-SITE.netlify.app/api/readings?device_id=...&limit=200` (GET)

## Notes
- The Functions create the tables on first run if they don't exist.
- Neon usually requires SSL; we set `ssl: { rejectUnauthorized: false }` in the pool.
- The dashboard HTML is the same as before and will call the Functions under `/api/*`.

## Optional: Manual SQL (if you want to pre-create)
```sql
CREATE TABLE IF NOT EXISTS devices (
  device_id TEXT PRIMARY KEY,
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS readings (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(device_id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL,
  temp_c DOUBLE PRECISION,
  humidity DOUBLE PRECISION,
  sound_db DOUBLE PRECISION,
  payload_json JSONB
);
```
