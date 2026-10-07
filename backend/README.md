# Bigi_Hub Backend

Node.js and Express API with MongoDB connectivity through Mongoose. This service is
separate from the frontend; it does not connect to the frontend or include
authentication or admin functionality.

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
