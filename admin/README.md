# Bigi_Hub Admin

Separate React application built with Vite and React Router. Admin authentication is connected to the backend; content editing is not implemented.

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
- src/services: read-only JSON API helper using native fetch; not connected to placeholder pages
- src/utils: API error type
- src/styles: responsive desktop sidebar and mobile menu foundation

Protected routes: / (dashboard), /jobs, /opportunities, /scholarships, /articles, /users, /settings, /profile, and a not-found fallback. /login is public. Production hosting must route non-asset requests to index.html for BrowserRouter deep links.

## Checks

```sh
npm run lint
npm run build
```

The admin app is separate from the public frontend. Content management belongs to later steps.

## Authentication

/login is public; every other admin route requires a verified backend session. Session restoration uses an HttpOnly cookie and /api/admin/auth/me. No tokens or credentials are stored in browser storage. Configure the backend secret, initial provisioning variables, and ADMIN_ORIGINS as documented in backend/README.md. Use localhost for both apps during development. Production requires same-site HTTPS hosting and the API base URL in .env.

Logout revokes backend sessions. API 401 responses clear local auth state and redirect protected pages to login. A failed session check shows a retry state instead of granting access. Listing workspaces remain placeholders; no CRUD is implemented.

## Dashboard shell

The protected shell provides a desktop/tablet sidebar, collapsible mobile navigation, a sticky top header, account profile, and logout. Dashboard statistics are explicitly marked as placeholders; no live counts or CRUD are connected. Jobs, Opportunities, Scholarships, Articles, Users, and Settings are prepared workspaces. Profile displays the currently authenticated account without editing controls.
