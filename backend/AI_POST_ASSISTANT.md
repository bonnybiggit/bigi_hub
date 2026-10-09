# AI Post Assistant

Admin URL: /ai-post-assistant. AI classification never selects the public destination. After analysis, explicitly choose Jobs, Opportunities or Scholarships in review. Opportunities additionally require one of the existing public category values. Saving these choices persists them on the assistant draft, increments its revision, and clears any approval. Selection is required server-side at approval and publication; older drafts must be edited and reapproved.

Publication writes a schema-valid record to the explicitly selected jobs, opportunities or scholarships collection. All nine AI classifications remain available; Event/Other do not have their own public collections but can publish only to a destination explicitly selected by the admin with its required metadata. Required title and one supported country in reviewed location must be confirmed from the source. No default country is invented. The draft retains its source flyer and now stores destination, publicRecordId and publicSlug. Public records store assistantPostId. Deterministic IDs and slugs prevent duplicate insertion.

When transactions are supported, publication is atomic. On standalone MongoDB, publication uses resumable phases: lock/link the approved draft; upsert a hidden public record; finalize the linked assistant publication; activate the public record; mark completion. Pending records are excluded by both list and detail APIs, and the linked draft cannot be edited or deleted until resumed. Retry Publish/Resume publication after an interrupted write. Existing records are never overwritten during a duplicate conflict. The authenticated configuration API performs a real read-only transaction probe and reports supported/unsupported/unknown without exposing connection information.

Delete assistant record only requires native confirmation in the UI and confirmed=true, scope=assistant-only plus the current revision server-side. This permanently deletes that assistant record and original flyer. It NEVER removes or archives its public listing; the public record remains available through its own API/management flow. Published records display their public link and this distinction explicitly. No public-listing delete endpoint is added here.

Public list APIs and GET /api/jobs/:slug, /api/opportunities/:slug, /api/scholarships/:slug exclude pending and expired records. Frontend detail pages use these endpoints; the admin verifies the created public ID through the corresponding detail API and offers the public detail-page link. VITE_PUBLIC_SITE_URL may override the admin link origin (default https://bigihub.netlify.app). Public/admin apps must target the same deployed backend.

Run npm run verify:ai-publication for a read-only topology check. Run npm run verify:ai-publication -- --write-fixtures for real models, approval/publication, public list/detail API and assistant-only deletion checks in a uniquely named temporary database on the configured server. That temporary database is removed afterward; production database writes are never used for this script. This requires permissions to create/use/drop that temporary database. A permission failure is not a successful live-publication verification. Confirm Render uses the checked database, redeploy, then manually verify the browser detail pages. Previously published assistant-only records are not automatically backfilled. Use the confirmed Return assistant-only publication to review action to retain the source, explicitly select a destination and approve again. The server checks all three public collections for the same ID before allowing this reset; an existing public record prevents it.

## Workflow and provenance

Upload a PNG/JPEG/WebP flyer up to 4MB, paste up to 20,000 characters, or supply both. Analyze returns a persisted **review** draft, never a publication. The original copied text (including whitespace), original image bytes, SHA-256, name, MIME type, AI transcription, extraction and supporting quotes are retained. Images live in MongoDB, so no local filesystem upload directory or public image URL is needed. List responses exclude image bytes; authenticated detail responses include the original as a data URL.

All specified Job fields are editable for every initial post type. Missing values are stored empty and shown as **Not specified**. The provider is instructed to preserve source wording and not infer facts. Every extracted value must be supported by a quote in the copied text or image transcript; unsupported values are removed. Classification without a source quote becomes Other. This is a guardrail, not a guarantee of factual correctness: image transcription and classification can be wrong, and a model can produce an inaccurate transcript. Original-source review is mandatory before approval. Source text is untrusted data, never executable instructions. Provider errors, refusals and incomplete output do not create fabricated drafts.

Save review validates email/URL, field lengths and deadlines. Approval requires an explicit source-review confirmation. It does not publish. Publishing requires a separately approved, unchanged revision. Editing an approved draft clears its approval. Atomic revision checks reject stale edits, double publish and approval bypasses. Published/archived posts are read-only in this foundation.

## Expiry

A real application deadline expires at 23:59:59.999 on that date in Africa/Lagos. ISO and unambiguous dates with spelled-out months and explicit years can be normalized. Missing years and ambiguous numeric dates are never inferred: the admin must confirm a source deadline's calendar date before approval. A confirmed date must match a parseable stated deadline. Event dates are not application deadlines.

With no deadline, expiry is **three calendar months after publication**, preserving the publication time and clamping month-end dates (e.g. November 30 to February 28). A post published with a past deadline is immediately archived. A background sweep runs on startup after database connection and every minute. Assistant list/detail reads also archive expired publications. Content and image bytes are retained. No TTL/deletion index is used. The scheduler is stopped during server shutdown.

## API and protection

All `/api/admin/ai-posts` routes use the existing active-admin cookie authentication and no-store responses. Mutations also require the existing trusted Admin Origin. The protected assistant router alone uses a 6MB JSON limit; existing Jobs request limits remain unchanged. Image size, MIME signature and base64 encoding are checked server-side. SVG, remote image URLs and arbitrary filesystem paths are not accepted. Authentication and database schemas are unchanged. Public listing query/refresh behavior is connected to the publication flow.

- `GET /configuration`: whether the backend key is configured; no secret is returned.
- `GET /`: paginated assistant records; optional status filter (review, approved, published, archived).
- `POST /analyze`: `{ text, image: { name, dataUrl } }`; either input may be omitted. Creates a review draft.
- `GET /:id`: source and review details, including original flyer.
- `PATCH /:id`: `{ revision, postType, fields, deadlineDate }`; source and extracted originals are immutable.
- `POST /:id/approve`: `{ revision, confirmed: true }`.
- `POST /:id/publish`: `{ revision }`.

## Configuration and checks

Set **GEMINI_API_KEY** privately in Render's backend environment (or locally in backend/.env), never in a Vite variable. **GEMINI_MODEL** defaults to **gemini-3.5-flash-lite**, a stable model supporting image input and structured JSON output with a free API tier. Actual model access and quotas depend on your Google AI Studio project and region. Restart/redeploy the backend after configuring it. The official **@google/genai** SDK sends text and inline base64 PNG/JPEG/WebP images using the existing JSON Schema. Original image bytes remain unchanged and are saved only after successful extraction; oversized images (over 4MB), unsupported MIME types, invalid base64 and mismatched signatures are rejected locally. Gemini rejects undecodable images with a safe input error.

Each provider attempt has a 25-second timeout. SDK automatic retries are disabled; the service makes at most two attempts total. Only temporary server/network failures and rate limits with an explicit retry delay of at most two seconds are retried once. Daily/zero quota, authentication, model/input errors and unusable responses are never retried. Provider error bodies, keys and request contents are never logged or returned. Local schema validation and the existing evidence checks reject malformed or unsupported extractions. Missing facts stay empty in storage and display as **Not specified** in the existing admin review. Upload/paste analysis sends those inputs to Gemini; the UI explains this before analysis.

Render setup: install backend dependencies from the updated lockfile, set GEMINI_API_KEY and GEMINI_MODEL=gemini-3.5-flash-lite, remove obsolete OPENAI_API_KEY/OPENAI_MODEL environment settings, and redeploy. Verify a real flyer and pasted text in the admin assistant, then review before approving/publishing. No credentials are included in the example environment file.

Without a key, the UI shows configuration is required and analysis returns 503. Existing saved drafts can still be reviewed, approved and published. No fake AI mode exists in production. Tests inject controlled provider responses only within the test process. Live image/text analysis requires a real configured key and provider access; it cannot be verified without them.

Run Admin `npm run lint` and `npm run build`; run backend `npm run check` and `npm test`. Existing Jobs tests remain included. Official API references: [structured outputs](https://ai.google.dev/gemini-api/docs/structured-output), [image inputs](https://ai.google.dev/gemini-api/docs/image-understanding).

## Files added or changed for this feature

Admin: `src/App.jsx`, `src/utils/navigation.js`, `src/styles/admin.css`, `src/pages/AIPostAssistant.jsx`, `src/components/PostSources.jsx`, `src/services/aiPosts.service.js`, `src/utils/assistantPost.js`, `README.md`.

Backend: `src/app.js`, `src/server.js`, `.env.example`, `package.json`, `src/models/AssistantPost.js`, `src/validation/ai-posts.js`, `src/services/post-analysis.js`, `src/services/post-expiry.js`, `src/routes/ai-posts.routes.js`, `test/ai-posts.test.js`, `AI_POST_ASSISTANT.md`.
