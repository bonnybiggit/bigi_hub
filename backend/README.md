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

Initial Mongoose models are provided for jobs and opportunities. No listing
records or CRUD endpoints are included.

## Checks

Run `npm run check` for Node.js syntax validation. There is no frontend build
step for this standalone API.
