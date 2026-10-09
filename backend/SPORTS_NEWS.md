# Sports news collection

Set `THE_NEWS_API_KEY` in the backend environment (see `.env.example`). Never
put this key in a frontend/Vite variable. No Gemini key is needed for collection.
Provider documentation: https://www.thenewsapi.com/documentation.

An authenticated, active admin can send `POST /api/admin/ai-posts/import/sports`
with an empty JSON body `{}`, the existing admin session cookie, and an allowed
`Origin`. It requests one page of up to three English sports top stories using
built-in Node fetch. It returns `fetched`, `imported`, `duplicates` and `skipped`
counts. Missing configuration returns 503; provider authentication, quota,
network and invalid-response failures return a sanitized 502.

Eligible records require a sports category, title, provider UUID, publisher,
HTTP(S) source URL without credentials, and valid publication timestamp. The
provider supplies descriptions/snippets, not full articles; no original article
page or image is fetched. Source URL, publisher attribution, provider identity
and publication/fetch timestamps are preserved in `sourceMetadata` and source
text. Imported articles appear in the existing assistant queue with status
`review`, classification `Other`, and no destination or approval/publication.
Sports News is a separate publishing destination backed by SportsArticle.
Review the original source, publisher attribution and reuse rights; shorten the
reviewed description to a summary of at most 600 characters. Confirm your source
review, approve, then separately publish. Existing opportunity publishing rules
remain unchanged.

Unique import-key and provider/source-URL indexes prevent duplicate imports,
including concurrent requests. Legacy records without import metadata are
unaffected. Ensure these indexes exist before enabling collection when MongoDB
automatic index creation is disabled. Imports use insert-only upserts, leaving
all existing records and timestamps untouched. If a database write fails midway,
earlier imports remain in review; retrying skips them. Deleting an imported
assistant record removes its deduplication identity, allowing later reimport.
Collection is admin-triggered only, with no scheduling, automatic retries,
approval or publishing. Request quotas depend on your provider plan.

Verification:

```sh
node --test test/sports-news-import.test.js test/ai-posts.test.js test/post-publication.test.js test/content-categories.test.js
```

Tests mock provider/database calls; they do not spend API quota or create live
MongoDB records. Concurrent duplicate handling is tested through duplicate-key
errors and index definitions, rather than against a live MongoDB server.

## Sports interface and publication

Public pages are `/sports` and `/sports/:slug`, with matching read-only API
endpoints `/api/sports` and `/api/sports/:slug`. The public API reads only the
separate SportsArticle collection and returns a whitelist of headline, short
summary, source attribution/link and publication dates. Only published, approved
records with completed public activation are visible; drafts and staged records
are not returned. No full publisher content or images are published.

In the admin navigation, open **Sports News** (or **AI Post Assistant**) and
select **Import sports stories**. Loading, import counts and errors are displayed.
The **Sports stories only** filter includes existing imports whose destination
is still empty. Open a story, select Sports News, review the title and short
summary, follow its original-source link, and confirm source/reuse checks.
Approval and publication remain distinct revision-protected actions. Sports
uses the existing transaction or resumable staging mechanism. Sports stories
are kept as a news archive without application-deadline expiry.

The separate model, API, public pages and publication adapter are implemented.
Rebuild/deploy backend, admin and frontend together; deploy backend first. Existing
review drafts require no data migration and remain private until you approve
and publish them. No live imports or publications are needed for the tests.
# Comments

Visitors can submit a display name (1–60 characters) and plain-text comment (1–1000 characters) on any published Sports, News, Business, Technology or Health article at `POST /api/<category>/:slug/comments` (Health uses `/api/health-news`). No account is required. Comments are stored in the `SportsComment` collection, linked to the article, and are **published immediately** with no admin approval (`status: approved` is the stored value for visible comments). Unknown input fields, including a caller-supplied status, are rejected. No IP addresses are stored. Comments created before multi-category support have no `category` and are treated as Sports comments; legacy `pending` comments stay private until an admin restores them.

`GET /api/<category>/:slug/comments` returns only visible comments, paginated with `page` and `limit`. Both public endpoints require an approved, published, non-staged article in that category. Hidden, pending and deleted comments are never returned publicly. Comment text is rendered as text, without HTML interpretation.

Admins use **Comments & Moderation** in the sidebar to manage comments from every category in one place: filter by category and status, hide, restore, or permanently delete. The endpoints at `/api/admin/comments` (also served at the legacy `/api/admin/sports-comments`) require the existing active admin session; PATCH and DELETE also require the configured admin origin. Hiding removes a comment from the public API; deleting is permanent.

Anonymous submissions are limited to five attempts per IP per 15 minutes across all categories combined, including invalid submissions, with a `Retry-After` header. The limiter is bounded and in memory, matching the existing login limiter. It resets on restart and applies per backend process; multiple instances need a shared limiter or an upstream IP rate limit. Configure a trusted reverse proxy before relying on client IPs behind a proxy; arbitrary forwarded headers are not trusted by this implementation.

