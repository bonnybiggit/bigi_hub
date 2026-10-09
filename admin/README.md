# Bigi_Hub Admin

Separate React application built with Vite and React Router. Admin authentication and Jobs management connect to the backend.

## Run

Use Node.js 22.12+ (Node.js 24 is used for verification).

```sh
cd admin
npm install
npm run dev
```

Development runs at http://localhost:5174, separate from the public frontend. Copy .env.example to .env when configuring the API. VITE_API_BASE_URL defaults to http://localhost:5000/api. Vite variables are public; do not store secrets in them.

## Structure

- src/pages: overview, prepared listing workspaces, and not-found page
- src/layouts: shared admin shell with nested routes
- src/components: header, navigation, page heading, empty state
- src/context: UI state provider and context
- src/hooks: UI access and page titles
- src/services: authenticated JSON API helper using native fetch, authentication and Jobs services
- src/utils: API error type
- src/styles: responsive desktop sidebar and mobile menu foundation

Protected routes: / (dashboard), /jobs, /opportunities, /scholarships, /articles, /users, /settings, /profile, and a not-found fallback. /login is public. Production hosting must route non-asset requests to index.html for BrowserRouter deep links.

## Checks

```sh
npm run lint
npm run build
```

The admin app is separate from the public frontend. Jobs management is implemented; other content workspaces remain prepared for later steps.

## Authentication

/login is public; every other admin route requires a verified backend session. Session restoration uses an HttpOnly cookie and /api/admin/auth/me. No tokens or credentials are stored in browser storage. Configure the backend secret, initial provisioning variables, and ADMIN_ORIGINS as documented in backend/README.md. Use localhost for both apps during development. Production requires same-site HTTPS hosting and the API base URL in .env.

Logout revokes backend sessions. API 401 responses clear local auth state and redirect protected pages to login. A failed session check shows a retry state instead of granting access.

## Dashboard shell

The protected shell provides a desktop/tablet sidebar, collapsible mobile navigation, a sticky top header, account profile, and logout. Dashboard statistics remain placeholders. Jobs is connected; Opportunities, Scholarships, Articles, Users, and Settings remain prepared workspaces. Profile displays the currently authenticated account without editing controls.

## Jobs management

The Jobs workspace uses `/api/admin/jobs` and the existing authenticated session. It includes search/filter, pagination, create/edit forms, archive/restore and confirmed permanent deletion. Loading, retryable errors, field validation and success feedback are included. Requirements and benefits use one item per line. Required fields are marked; deadlines use calendar dates in UTC. Backend validation also enforces the field whitelist, types, lengths and unique slugs.

See [Admin Jobs API](../backend/ADMIN_JOBS.md) for routes and real MongoDB verification.

## AI Post Assistant

Open `/ai-post-assistant` from the admin sidebar. Upload/paste, analyze, review/edit, approve, then explicitly publish. All nine types retain assistant drafts; publication saves Jobs, Scholarships and the five supported Opportunity types to their public collections. Event and Other have no public destination. Original text and flyer are preserved; missing facts show Not specified. Expired publications are archived, never deleted. Backend GEMINI_API_KEY is required for live analysis; no key belongs in Vite variables. See [configuration, workflow, API and file list](../backend/AI_POST_ASSISTANT.md).
