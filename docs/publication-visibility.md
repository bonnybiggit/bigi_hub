# Public publication visibility

The remaining observed production failure was CORS, not collection routing.
Read-only verification found a linked, complete, non-expired published assistant job
in Jobs. Render's Jobs list and slug detail API returned that same record, but requests
with `Origin: https://bigihub.netlify.app` had no `Access-Control-Allow-Origin` header.
Node/server clients can read such responses; a browser on the public website cannot.
The deployed website bundle already pointed to the correct Render API and used live
homepage highlights. Opportunities and Scholarships returned valid empty envelopes;
no live publications in those collections were established by this check.

The backend now includes the existing public website's exact HTTPS origin in its
CORS allowlist, independently of stale local `CORS_ORIGINS` settings. Custom origins
remain configurable. `ADMIN_ORIGINS`, admin sessions, approval, CSRF/trusted-origin
checks and publication safeguards are unchanged. Public-origin CORS access does not
authorize admin writes. No record was created, modified, deleted or republished during
the production audit. A slow initial API request was also observed, but CORS was the
confirmed browser-read blocker; successful follow-up responses still lacked the header.

## Deploy and verify

1. Deploy the backend commit. In Render, set `CORS_ORIGINS` to the exact public and
   admin origins: `https://bigihub.netlify.app,https://bigihubadmin.netlify.app`.
   Preserve the existing production `ADMIN_ORIGINS` value and private secrets.
   If custom domains are used, add their exact origins as well, without trailing slashes.
2. Keep frontend `VITE_API_BASE_URL=https://bigi-hub-api.onrender.com/api`. Rebuild and
   deploy the public/admin apps if their source or build environment changed.
3. In the assistant, explicitly select Jobs, Opportunities (with subtype), or
   Scholarships; review source-backed facts and a future deadline or no deadline,
   approve and publish once. Keep its `publicRecordId`, `destination` and `publicSlug`.
   Existing published posts should not be republished to solve a CORS problem.
4. On the public website, open browser Developer Tools → Network. Open the selected
   section with filters cleared. Confirm its GET to
   `https://bigi-hub-api.onrender.com/api/<destination>?...` returns HTTP 200,
   `{status:"ok",data:[...],pagination:{...}}`, includes the recorded `_id`, and has
   `Access-Control-Allow-Origin: https://bigihub.netlify.app`. An address-bar/API-only
   check without an Origin header cannot establish browser CORS success.
5. For Jobs/Opportunities, allow visible polling or refocus the tab. For Scholarships,
   use the first results page and clear filters. Follow the card's slug detail link;
   its API must return the same `_id` and CORS header. Verify title, facts and bookmark
   behavior. A legitimate user-selected filter may exclude a record; blank optional
   work type should not exclude it when filters are cleared.
6. Check homepage highlights separately. They show only three newest fetched records
   across destinations; absence from highlights is not proof that a listing is missing.
   Check search independently. Confirm expired/staged records remain excluded.
7. Repeat with real approved content for the other destinations when available, and
   confirm a duplicate publication attempt is rejected. Do not create dummy records.

Automated regression tests simulate publishing into the real model classes with mocked
storage, then check list/detail IDs and browser-origin CORS headers for all destinations.
They also confirm public-origin admin writes and unknown-origin CORS are denied, and
that default frontend filters retain source-backed records with missing optional facts.
These tests do not verify a deployed fix or a completed browser workflow.
