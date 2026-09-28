# Deploying StaffSync Backend on Render

`render.yaml` in the repo root is a Render Blueprint: it declares the web
service, so a fresh deploy needs almost no manual setup. The database is
external - Neon's free tier needs no card and is IPv4-reachable, which matters
because Render's containers have no IPv6 route. The app reads `PORT`,
`DATABASE_URL` and everything else from environment variables, so nothing in
the code is environment-specific.

## 1. Before you start

- A Render account with this GitHub repo connected (`TaslimYusuf2210/EMS-Backend`).
- PostgreSQL client tools 16 or newer on your machine (`pg_dump`, `pg_restore`,
  `psql`) - only needed if you are importing an existing database.
- The values your deployment needs: SMTP credentials, the frontend origin, and
  the `JWT_SECRET` that existing user tokens were signed with.

## 2. Create the resources

Render Dashboard -> **New** -> **Blueprint** -> pick this repo -> **Apply**.
Render reads `render.yaml` and creates `staffsync-api`: a web service with
build `npm ci`, start `npm start`, and health check `/api/health`.

During the import Render prompts for the env vars marked `sync: false`
(`DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`, `BREVO_API_KEY`,
`BREVO_FROM_EMAIL`, and optionally the `BREVO_SMTP_*` values); step 3
lists them.

Prefer to set it up by hand? Create a Web Service:

| Setting | Value |
| --- | --- |
| Runtime | Node (pinned by `.node-version`) |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Region | same region as the database |

Then add `DATABASE_URL` using your external Postgres connection string.

Plan notes: the service runs on `free` (spins down after ~15 min idle, so the
next request takes ~30-60s). The database itself is not part of the Blueprint.

## 3. Environment variables

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | your external Postgres URL (Neon), ending in `?sslmode=require` |
| `JWT_SECRET` | the secret your existing user tokens were signed with |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | frontend origin, e.g. `https://app.example.com` (blank = allow all) |
| `BREVO_API_KEY` | **required on Render** - Brevo API key (`xkeysib-...`), sends over HTTPS |
| `BREVO_FROM_EMAIL` | the address OTP mail is sent from (must be a verified Brevo sender) |
| `BREVO_SMTP_HOST` | optional, local only - SMTP host (e.g. `smtp.gmail.com`) |
| `BREVO_SMTP_PORT` | optional, local only - `465` or `587` |
| `BREVO_SMTP_USER` | optional, local only - SMTP login |
| `BREVO_SMTP_PASS` | optional, local only - SMTP key |

Do **not** set `PORT` - Render injects it and `src/config/index.js` already reads
`process.env.PORT`. Never commit `.env`; it is gitignored and Render takes these
values from the dashboard.

## 4. Get data in

`sequelize.sync()` on boot only creates missing tables - it never copies rows.

**Option A - import an existing database.** Grab that database's connection
string, then run:

```powershell
pg_dump '<SOURCE_DATABASE_URL>' --no-owner --no-acl --no-comments -Fc -f staffsync.dump
pg_restore --no-owner --no-acl --clean --if-exists -d '<DATABASE_URL>' staffsync.dump
psql '<DATABASE_URL>' -c 'select count(*) from employees;'
```

Use the same connection string you gave Render as `DATABASE_URL`, and append
`?sslmode=require` if it is not already there. `--clean --if-exists`
makes the restore safe even if the service already booted and created empty
tables; a few `does not exist, skipping` notices are normal.

**Option B - start fresh.** Open the service's **Shell** tab in Render and run
`node seed.js` (it asks for confirmation before touching anything).

## 5. Verify the deploy

```powershell
curl https://<your-service>.onrender.com/api/health
```

- `/api/health` returns `success: true`, and the logs show
  `Database connection established successfully` plus `Database tables synced`.
- `/api/docs` serves Swagger.
- Register/login works and an OTP email actually arrives (see gotchas).
- Spot-check a couple of list endpoints for real data.

## 6. Point the frontend at Render

- Update the frontend's API base URL to `https://<your-service>.onrender.com/api`.
- Set `CORS_ORIGIN` to that frontend origin and let the service restart.
- Optional: attach a custom domain under the service's **Settings -> Custom
  Domains** and add the DNS record Render shows; TLS certificates are automatic.
  `src/config/swagger.js` lists placeholder servers, so update them if you want
  the docs page to show the Render host.

## Gotchas

- **Cold starts** on the free plan; upgrade to `starter` if the API must stay warm.
- **Uploads live in Postgres** (`bytea` for documents and headshots), so there is
  no object storage or persistent disk to configure and Render's ephemeral
  filesystem is not a problem.
- **Schema changes stay manual**: `sequelize.sync()` never runs `ALTER`. Run the
  scripts in `scripts/` against the Render database when a migration is needed.
- **Email (important)**: Render blocks outbound SMTP ports (25, 465, 587), so
  the `BREVO_SMTP_*` values cannot connect from Render no matter how correct
  they are. Set `BREVO_API_KEY` and the mailer sends over HTTPS on 443 instead.
  With no API key it falls back to SMTP, which is fine locally. The sender
  address must also be verified in Brevo or the API answers `sender not valid`.
- **Diagnosing email**: run `node scripts/check-email.js your@email.com` to
  confirm the key, the account plan and the verified senders before deploying.
- **SSL**: `src/config/database.js` enables SSL for any non-local `DATABASE_URL`
  without an explicit `sslmode`, which is what Render needs.
