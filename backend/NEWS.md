# News categories

News, Business, Technology and Health use the shared category registry and public routes `/news`, `/business`, `/technology` and `/health`, with `/:slug` detail routes. Their data endpoints are `/api/news`, `/api/business`, `/api/technology` and `/api/health-news` (plus `/:slug`). The `/api/health` health-check endpoint is preserved. Each article API filters to its own category and approved, published, non-staged records, returning only an attributed short summary. Sports retains its original collection, importer and comments; comments are not added to these four categories.

These categories use one separate `NewsArticle` collection, reusing the Sports article schema. No existing records need migration. Deploy the backend and both applications together.

Open the matching category in the admin sidebar to enter a title, short original summary (maximum 600 characters), publisher name, original URL and publication date. Save creates an `AssistantPost` in `review`, without AI or provider requests. Existing confirmation, revision checks, approval, explicit publication, transaction/staged recovery and assistant-only deletion safeguards apply. Public articles have no application deadline, images or full publisher article.

`POST /api/admin/ai-posts/news-drafts` requires the existing active admin session and trusted origin. It accepts only `category`, `title`, `summary`, `sourceName`, `sourceUrl` and `sourcePublishedAt` (YYYY-MM-DD). Caller-supplied approval/publication fields are rejected. The original source metadata and category remain fixed through review; correct inaccurate metadata by deleting the unpublished assistant draft and creating a corrected draft. Title and summary can be edited in the existing review interface, which clears approval.

No provider, key or paid service is added. Automatic collection for these four categories is not implemented; articles require manual entry and approval. The Sports importer remains Sports-only. Public pages remain empty until an admin explicitly publishes eligible drafts. Source reuse rights must be checked before approval; links are attribution, not permission to copy publisher content.
