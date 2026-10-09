# Bigi_Hub public frontend

Category registry and extension process: [content categories](../docs/content-categories.md).

Production uses `VITE_API_BASE_URL=https://bigi-hub-api.onrender.com/api`.
The checked-in `.env.production` and API client production fallback point to this API.
Configure the same value in the frontend hosting build environment and redeploy;
Vite environment changes take effect when the site is rebuilt. For a local backend,
set `VITE_API_BASE_URL=http://localhost:5000/api` in `.env.local` during development.

After publishing a reviewed post, check `/api/jobs`, `/api/opportunities`, or
`/api/scholarships` on the API host for its `_id` and `slug`. Open the corresponding
website section with filters cleared, then follow its card to `/<section>/<slug>`.
The detail API uses slugs, not MongoDB IDs. Expired or pending records are hidden by
the existing backend. Listings refresh on focus and every 30 seconds while visible.
The homepage shows the three newest live records across these sections.

Run `npm test`, `npm run lint`, and `npm run build` before deployment.

## Vite setup

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
