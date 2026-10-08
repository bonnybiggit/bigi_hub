# Admin Jobs management

Every `/api/admin/jobs` endpoint requires the existing admin session. Writes also require an allowed `ADMIN_ORIGINS` Origin. No bearer token or public write endpoint is added.

- `GET /api/admin/jobs`: paginated list. Supports the public Jobs query fields plus `status=all|active|archived`; admin search also matches slugs.
- `GET /api/admin/jobs/:id`: full job details.
- `POST /api/admin/jobs`: create a job.
- `PATCH /api/admin/jobs/:id`: update supplied fields; `{ "archived": true }` archives and `{ "archived": false }` restores.
- `DELETE /api/admin/jobs/:id`: permanently delete a job.

Required create fields: `title`, `slug`, `organization`, `description`, `location`, `countryCode`, `jobType`, `deadline` (YYYY-MM-DD). Optional: `workType`, `experienceLevel`, `compensation`, `applyUrl`, `requirements`, `benefits`. An empty work type clears it. Lists accept up to 20 non-empty strings of at most 500 characters. Country codes remain NG/GH/KE/ZA/RW/SN; slugs must be unique. Invalid data returns 400 with field errors; duplicate slugs return 409; missing jobs return 404. IDs, timestamps and raw archive dates cannot be written by clients. Requests retain the 10KB JSON limit.

Archived jobs remain accessible in Admin and are excluded from the public Jobs API. Legacy records without an archive field remain active. The public frontend source is unchanged.

Run `npm run check` and `npm test` for backend syntax and automated tests. Run `npm run verify:jobs` from backend to verify CRUD against the configured real MongoDB. It uses the existing admin credentials in the provisioning environment variables, creates one unique temporary job, checks persistence directly in MongoDB, tests validation/search/archive/restore/write protection, and deletes that temporary record in cleanup. It does not provision an account, change existing jobs, or revoke existing admin sessions. Only stage results are printed.

Real verification requires MONGODB_URI, ADMIN_JWT_SECRET, INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD in backend/.env. These are never frontend variables. A failed cleanup is reported explicitly; no existing records are deleted.
