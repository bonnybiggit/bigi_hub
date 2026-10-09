# AI Post Assistant foundation

Admin URL: `/ai-post-assistant`. All nine types (Job, Scholarship, Grant, Fellowship, Internship, Training, Competition, Event, Other) use the separate `assistantposts` MongoDB collection, as requested. Publishing records an approved assistant-managed post; there is no public frontend connection, Jobs conversion, or Opportunities/Scholarships CRUD in this foundation. Existing authentication is reused without changes.

## Workflow and provenance

Upload a PNG/JPEG/WebP flyer up to 4MB, paste up to 20,000 characters, or supply both. Analyze returns a persisted **review** draft, never a publication. The original copied text (including whitespace), original image bytes, SHA-256, name, MIME type, AI transcription, extraction and supporting quotes are retained. Images live in MongoDB, so no local filesystem upload directory or public image URL is needed. List responses exclude image bytes; authenticated detail responses include the original as a data URL.

All specified Job fields are editable for every initial post type. Missing values are stored empty and shown as **Not specified**. The provider is instructed to preserve source wording and not infer facts. Every extracted value must be supported by a quote in the copied text or image transcript; unsupported values are removed. Classification without a source quote becomes Other. This is a guardrail, not a guarantee of factual correctness: image transcription and classification can be wrong, and a model can produce an inaccurate transcript. Original-source review is mandatory before approval. Source text is untrusted data, never executable instructions. Provider errors, refusals and incomplete output do not create fabricated drafts.

Save review validates email/URL, field lengths and deadlines. Approval requires an explicit source-review confirmation. It does not publish. Publishing requires a separately approved, unchanged revision. Editing an approved draft clears its approval. Atomic revision checks reject stale edits, double publish and approval bypasses. Published/archived posts are read-only in this foundation.

## Expiry

A real application deadline expires at 23:59:59.999 on that date in Africa/Lagos. ISO and unambiguous dates with spelled-out months and explicit years can be normalized. Missing years and ambiguous numeric dates are never inferred: the admin must confirm a source deadline's calendar date before approval. A confirmed date must match a parseable stated deadline. Event dates are not application deadlines.

With no deadline, expiry is **three calendar months after publication**, preserving the publication time and clamping month-end dates (e.g. November 30 to February 28). A post published with a past deadline is immediately archived. A background sweep runs on startup after database connection and every minute. Assistant list/detail reads also archive expired publications. Content and image bytes are retained. No TTL/deletion index is used. The scheduler is stopped during server shutdown.

## API and protection

All `/api/admin/ai-posts` routes use the existing active-admin cookie authentication and no-store responses. Mutations also require the existing trusted Admin Origin. The protected assistant router alone uses a 6MB JSON limit; existing Jobs request limits remain unchanged. Image size, MIME signature and base64 encoding are checked server-side. SVG, remote image URLs and arbitrary filesystem paths are not accepted. No authentication files, public frontend files or existing Jobs handlers/models/services are changed for this feature.

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
