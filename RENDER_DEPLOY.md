# Deploying StaffSync Backend on Render

`render.yaml` in the repo root is a Render Blueprint: it declares the Postgres
database and the web service, so a fresh deploy needs almost no manual setup.
The app reads `PORT`, `DATABASE_URL` and everything else from environment
variables, so nothing in the code is environment-specific.

## 1. Before you start

- A Render account with this GitHub repo connected (`TaslimYusuf2210/EMS-Backend`).
- PostgreSQL client tools 16 or newer on your machine (`pg_dump`, `pg_restore`,
  `psql`) - only needed if you are importing an existing database.
- The values your deployment needs: SMTP credentials, the frontend origin, and
  the `JWT_SECRET` that existing user tokens were signed with.

## 2. Create the resources

Render Dashboard -> **New** -> **Blueprint** -> pick this repo -> **Apply**.
Render reads `render.yaml` and creates:

- `staffsync-db` - the Postgres database
- `staffsync-api` - the web service (build `npm ci`, start `npm start`, health
  check `/api/health`)

During the import Render prompts for the env vars marked `sync: false`
(`JWT_SECRET`, `CORS_ORIGIN`, `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`,
`BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, `BREVO_FROM_EMAIL`); step 3 lists them.

Prefer to set it up by hand? Create a Postgres instance, then a Web Service:

| Setting | Value |
| --- | --- |
| Runtime | Node (pinned by `.node-version`) |
| Build command | `npm ci` |
| Start command | `npm start` |
| Health check path | `/api/health` |
| Region | same region as the database |

Then add `DATABASE_URL` using the database's **Internal Database URL**.

Plan notes: the service runs on `free` (spins down after ~15 min idle, so the
next request takes ~30-60s). The database is `basic-256mb` (~$6 per month);
switch it to `free` in `render.yaml` if your account still has free Postgres
access.

## 3. Environment variables

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | injected from the Render database (internal URL) |
| `JWT_SECRET` | the secret your existing user tokens were signed with |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | frontend origin, e.g. `https://app.example.com` (blank = allow all) |
| `BREVO_SMTP_HOST` | your SMTP host (currently `smtp.gmail.com`) |
| `BREVO_SMTP_PORT` | `465` |
| `BREVO_SMTP_USER` | your Brevo SMTP login |
| `BREVO_SMTP_PASS` | your Brevo SMTP key |
| `BREVO_FROM_EMAIL` | the address OTP mail is sent from |

Do **not** set `PORT` - Render injects it and `src/config/index.js` already reads
`process.env.PORT`. Never commit `.env`; it is gitignored and Render takes these
values from the dashboard.

## 4. Get data in

`sequelize.sync()` on boot only creates missing tables - it never copies rows.

**Option A - import an existing database.** Grab that database's connection
string, then run:

```powershell
pg_dump '<SOURCE_DATABASE_URL>' --no-owner --no-acl --no-comments -Fc -f staffsync.dump
pg_restore --no-owner --no-acl --clean --if-exists -d '<RENDER_EXTERNAL_URL>' staffsync.dump
psql '<RENDER_EXTERNAL_URL>' -c 'select count(*) from employees;'
```

Use the **External Database URL** from the Render database's Info page, and
append `?sslmode=require` if it is not already there. `--clean --if-exists`
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
- **SMTP**: if OTP emails fail, set `BREVO_SMTP_PORT=587`; the mailer switches to
  STARTTLS automatically for any port other than 465.
- **SSL**: `src/config/database.js` enables SSL for any non-local `DATABASE_URL`
  without an explicit `sslmode`, which is what Render needs.
