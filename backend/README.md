# Bigi_Hub Backend

Node.js and Express API with MongoDB connectivity through Mongoose. This service is
separate from the frontend and includes authenticated Admin Jobs management.

## Setup

1. Install Node.js 20 or newer and MongoDB.
2. Copy `.env.example` to `.env` and set `MONGODB_URI` and any deployment-specific
   `CORS_ORIGINS` values (comma-separated origins).
3. From this directory, run `npm install`.
4. Start MongoDB, then run `npm run dev` for development or `npm start`.

The API listens on `PORT` (5000 by default). `GET /api/health` reports the
service and MongoDB connection state; it returns HTTP 503 until MongoDB is
connected.

## Models

Initial Mongoose models are provided for jobs, opportunities, and
scholarships. No listing records are included.

## Jobs API

`GET /api/jobs` reads jobs from MongoDB. Optional query parameters:

- `search`: case-insensitive search across title, organization, description, and location.
- `location`, `jobType`, `workType`, `experience`: case-insensitive filters; `experience`
  maps to the model's `experienceLevel` field.
- `page`: one-based page number (default `1`).
- `limit`: results per page, from `1` to `100` (default `10`).

The JSON response contains `status`, a `data` array, and pagination totals.
Invalid pagination or empty filter values return HTTP 400.

`GET /api/opportunities` reads opportunities from MongoDB. It accepts
`search` (title, organization, description, location, eligibility, funding, and
benefit), `category`, `location`, `eligibility`, and `countryCode` filters,
along with the same `page` and `limit` pagination parameters and response shape.

## Scholarships API

`GET /api/scholarships` reads scholarships from MongoDB. Optional query
parameters:

- `search`: case-insensitive search across title, organization, description,
  location, eligibility, and funding.
- `country`, `eligibility`, `location`, `level`: case-insensitive filters;
  `country` maps to the model's `countryCode` field.
- `page`: one-based page number (default `1`).
- `limit`: results per page, from `1` to `100` (default `10`).

The JSON response contains `status`, a `data` array, and pagination totals.
Invalid pagination or empty filter values return HTTP 400.

## Checks

Run `npm run check` for Node.js syntax validation. There is no frontend build
step for this standalone API.

## Admin authentication

Set ADMIN_JWT_SECRET to a randomly generated value of at least 32 characters in the backend environment. Set ADMIN_ORIGINS to the exact admin URL (development: http://localhost:5174). Production requires HTTPS and a configured secret. Never put these secrets in Vite variables.

To create the initial account, set INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD (12–128 characters), then start the backend with MongoDB available. Provisioning creates the account once and stores only a salted scrypt hash; it never resets an existing account. Remove both provisioning variables after success. No public registration endpoint exists.

Endpoints: POST /api/admin/auth/login, GET /api/admin/auth/me, POST /api/admin/auth/logout. Login accepts JSON email/password. Login/logout require an allowed Origin. JWTs expire after one hour and live only in an HttpOnly, SameSite=Strict cookie (Secure in production). Admin and API must be deployed on the same site for these cookies; use the same hostname during local development. Logout revokes all sessions for that admin. Future admin APIs must use authConfigured and requireAdmin, plus origin validation for writes; public listing APIs remain public.

Login allows 10 attempts per IP per 15 minutes. The limiter is in memory; multiple API processes require a shared limiter before production scaling. Behind a proxy, configure a trusted proxy explicitly before deployment rather than trusting arbitrary forwarding headers.

Run npm run check and npm test. Authentication tests use a mocked database and randomly generated test secrets; they do not provision real accounts.

### Real Atlas provisioning verification

Required backend/.env variables for first provisioning and verification: MONGODB_URI (Atlas URI), ADMIN_JWT_SECRET (random, at least 32 characters), INITIAL_ADMIN_EMAIL, and INITIAL_ADMIN_PASSWORD (12â€“128 characters). ADMIN_ORIGINS defaults to http://localhost:5174; set the exact admin origin explicitly for deployment. NODE_ENV=production requires HTTPS admin origins. PORT and CORS_ORIGINS retain the documented defaults.

Run npm run verify:admin from backend/. The command uses the existing provisioning function, confirms the stored password hash, checks that repeated provisioning preserves one account, and exercises login, /me, logout, and rejection of the revoked token against the real database. It prints only stage results. Logout revokes all sessions for the configured admin. Remove INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD after successful provisioning; they are needed only when running this provisioning verification again.

See [Admin Jobs API and real MongoDB CRUD verification](ADMIN_JOBS.md).
