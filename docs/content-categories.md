# Content categories

`backend/src/config/content-categories.js` is the authoritative, public-only registry.
The backend owns it so a deployment rooted at `backend/` remains self-contained.
Admin and frontend import this file at build time from the same repository checkout.
It contains IDs, labels, URL slugs, visibility, API/model mappings, public model fields
and supported query filters. Never put credentials or backend environment imports in it.

## Existing architecture

Jobs, Opportunities and Scholarships retain their collections, schemas, public list
and slug detail APIs. Public routes are mounted from the registry with explicit router
adapters. Frontend routes similarly retain their existing page adapters, bookmark
state and designs. All three services share response validation and detail fetching.
Header/footer, homepage category links, search groups, admin destinations and admin
section labels use the registry. Opportunity subtype labels feed the existing schema
enum, admin category selector and public filters. They are not independent destinations.

AI classification is a separate nine-value vocabulary. Classification never selects
a destination. The admin explicitly chooses a destination and, for Opportunities, a
supported subtype; the server validates both. Approval preflights the target record.
Publication retains the existing transaction/resumable staging, revision, expiry and
duplicate safeguards. Public APIs hide staged/expired records; Jobs also hides archives.

The registry's `fields` describe public schema fields, not a dynamic schema or AI
extraction form. Extraction retains its established fields and source evidence checks.
The existing Job/Opportunity cards and Pagination components are reused. The distinct
listing/detail pages remain intentional because Jobs and Scholarships have different
fields, filters and layouts; adding metadata does not implement a new page automatically.
Homepage highlights fetch eligible live API records and refresh on focus and visible
polling. Events has no supported Opportunity enum value or separate model/API. It is
not advertised as a supported category. Static editorial previews are unrelated.

## Add a subtype using Opportunities

1. Confirm the existing Opportunity fields and deadline-based expiry fit the content.
   Grants, fellowships, internships, training and competitions already fit this path.
2. Add a unique `id` and stable label to `OPPORTUNITY_TYPES`. Keep existing enum labels
   unchanged: stored records use those exact labels. Leave navigation hidden; this
   change adds an admin choice and a public filter without a new collection or URL.
3. If the AI must classify a new type, separately update its classification vocabulary,
   schema/prompt, admin classification labels and extraction tests. This is optional
   for publishing: an existing classification can use the chosen subtype.
4. Add a publication regression for the subtype: approve a source-backed draft, publish
   once into Opportunity, verify list/detail visibility and duplicate rejection.
5. Deploy backend first (enum/validation), then rebuild/deploy admin and frontend from
   the same commit. No migration is needed for a new enum label unless old records must
   be recategorized. Any recategorization requires a reviewed, backed-up migration.

## Add a distinct destination

1. Design required/optional fields, validation, expiry/archive policy and approval rules.
   An event's event date, venue or capacity may need a new schema; do not silently map
   these to a scholarship or funding deadline. Decide explicitly whether to reuse a
   model or add one. Reusing Opportunity with a dedicated listing requires subtype
   filtering in both list and detail API adapters to prevent cross-category leakage.
2. Add the model/schema/indexes and reviewed migration only if needed. Plan compatibility
   with existing records and rollback; do not rename existing collections or slugs.
3. Implement authenticated publication field mapping and model adapter in
   `post-publication.js`, including standalone resume/legacy checks where applicable.
   Never let an unknown adapter fall through to another model. Add the public list and
   slug detail router with active/non-expired criteria, no-store and existing envelopes.
4. Add a `PUBLIC_CATEGORIES` entry with unique ID/slug, label, singular label, API path,
   model, accurate fields/filters and visibility flags. Register its router explicitly
   in `api.routes.js`. Unknown routes/models must fail rather than misroute content.
5. Register compatible listing/detail page adapters in `frontend/src/App.jsx` and a
   search fetcher in `Search.jsx`. Reuse shared listing services, cards and pagination
   where compatible. Add any required filter-to-field mapping on the backend. Wire
   homepage data loading/icon and highlights explicitly if the category is featured.
   Add admin management pages/routes only if needed; registry labels do not implement
   management CRUD. Update SEO metadata for new public URLs.
6. Test configuration/schema compatibility, authenticated destination validation,
   approval, publication, duplicates, staging/failures, list/detail visibility, expiry,
   search, links, bookmarks and unknown IDs. Run backend `npm test`/`npm run check`,
   admin lint/build, and frontend test/lint/build.
7. Deploy backend changes before admin/public builds. Render's backend root can remain
   `backend`; frontend/admin builds need the repository's `backend/src/config` file.
   Vite development permits only the shared metadata file beyond each app workspace.
   Keep `VITE_API_BASE_URL=https://bigi-hub-api.onrender.com/api` in production and
   rebuild after environment changes. Verify trusted admin/public origins, SPA fallback
   for detail URLs, and any new indexes/migrations. No secrets belong in Vite variables.
8. On the deployed site, publish a real approved non-expired post, check its target
   list API and slug detail API, then its section, homepage if featured, search, bookmark
   and detail page. Check expiry and refresh. Local mocked database tests do not prove
   deployment success; enabling navigation should follow these checks.

## Limitations

Adding a new destination is deliberately a reviewed code change, not a registry-only
switch. The registry centralizes metadata but does not generate models or field mapping.
Admin Opportunities/Scholarships management screens retain their current functionality.
Runtime registry edits require redeploying all consumers. Detail APIs remain slug-based.
The homepage uses three newest fetched records across existing destinations. No production
write or newly deployed browser workflow is established by local test results.
