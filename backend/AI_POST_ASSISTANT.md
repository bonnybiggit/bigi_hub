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

Set **OPENAI_API_KEY** in `backend/.env`, never in a Vite variable. **OPENAI_MODEL** defaults to `gpt-4o-mini`; use an account-accessible model that supports image inputs and strict structured outputs. Restart the backend after configuring it. No AI SDK/package is installed: native Node fetch calls the Responses API with `store: false`, strict JSON Schema and a 60-second timeout. Upload/paste analysis sends those inputs to OpenAI; the UI explains this before analysis.

Without a key, the UI shows configuration is required and analysis returns 503. Existing saved drafts can still be reviewed, approved and published. No fake AI mode exists in production. Tests inject controlled provider responses only within the test process. Live image/text analysis requires a real configured key and provider access; it cannot be verified without them.

Run Admin `npm run lint` and `npm run build`; run backend `npm run check` and `npm test`. Existing Jobs tests remain included. Official API references: [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses), [image inputs](https://developers.openai.com/api/docs/guides/images-vision).

## Files added or changed for this feature

Admin: `src/App.jsx`, `src/utils/navigation.js`, `src/styles/admin.css`, `src/pages/AIPostAssistant.jsx`, `src/components/PostSources.jsx`, `src/services/aiPosts.service.js`, `src/utils/assistantPost.js`, `README.md`.

Backend: `src/app.js`, `src/server.js`, `.env.example`, `package.json`, `src/models/AssistantPost.js`, `src/validation/ai-posts.js`, `src/services/post-analysis.js`, `src/services/post-expiry.js`, `src/routes/ai-posts.routes.js`, `test/ai-posts.test.js`, `AI_POST_ASSISTANT.md`.
