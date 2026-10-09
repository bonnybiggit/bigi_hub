import { createHash } from 'node:crypto'
import AssistantPost from '../models/AssistantPost.js'
import { POST_FIELDS } from '../validation/ai-posts.js'

const providerError = message => Object.assign(new Error(message), { status: 502 })
const text = (value, maximum) => typeof value === 'string' && value.length <= maximum ? value.trim() : ''

async function fetchSportsStories() {
  const key = process.env.THE_NEWS_API_KEY?.trim()
  if (!key) throw Object.assign(new Error('Sports news collection is not configured. Set THE_NEWS_API_KEY on the backend.'), { status: 503 })
  const url = new URL('https://api.thenewsapi.com/v1/news/top')
  url.search = new URLSearchParams({ api_token: key, categories: 'sports', language: 'en', limit: '3', page: '1' }).toString()
  let response, payload
  try {
    // Never attach provider errors/URLs as causes: the request URL contains the key.
    response = await fetch(url, { signal: AbortSignal.timeout(15000), redirect: 'error' })
    if (response.ok) payload = await response.json()
  } catch {
    throw providerError('The News API request failed or returned invalid JSON. Try again later.')
  }
  if (!response.ok) {
    const message = [401, 403].includes(response.status) ? 'The News API rejected the backend credentials or plan access.'
      : response.status === 429 ? 'The News API request quota or rate limit was reached. Try again later.'
        : 'The News API is unavailable. Try again later.'
    throw providerError(message)
  }
  if (payload?.error || !Array.isArray(payload?.data)) throw providerError('The News API returned an invalid sports response.')
  // Do not store accidental provider echoes of the secret in article content.
  return { stories: payload.data.slice(0, 3), key }
}

function draftForStory(story, adminId, fetchedAt, key) {
  if (!story || typeof story !== 'object' || !Array.isArray(story.categories) || !story.categories.includes('sports')) return null
  const externalId = text(story.uuid, 200), title = text(story.title, POST_FIELDS.title)
  const attribution = text(story.source, 500), originalUrl = text(story.url, 2000)
  if (!externalId || !title || !attribution || !originalUrl || JSON.stringify(story).includes(key)) return null
  let sourceUrl
  try {
    sourceUrl = new URL(originalUrl)
    if (!['http:', 'https:'].includes(sourceUrl.protocol) || sourceUrl.username || sourceUrl.password) return null
    sourceUrl.hash = ''
  } catch { return null }
  if (!text(story.published_at, 100) || !Number.isFinite(Date.parse(story.published_at))) return null
  const description = text(story.description, 5000), snippet = text(story.snippet, 5000)
  const fields = Object.fromEntries(Object.keys(POST_FIELDS).map(field => [field, '']))
  Object.assign(fields, { title, description: [description, snippet].filter(Boolean).join('\n\n') })
  const sourceText = [title, description, snippet, `Source: ${attribution}`, `Original article: ${originalUrl}`, 'Collected via The News API.', `Published: ${story.published_at}`].filter(Boolean).join('\n\n')
  return new AssistantPost({
    importKey: `thenewsapi:${createHash('sha256').update(externalId).digest('hex')}`,
    sourceMetadata: { provider: 'thenewsapi', externalId, url: sourceUrl.href, attribution,
      category: 'sports', publishedAt: new Date(story.published_at), fetchedAt },
    postType: 'Other', destination: '', opportunityCategory: '', status: 'review', revision: 0,
    fields, extractedFields: fields, evidence: { title, ...(fields.description ? { description: fields.description } : {}) },
    sourceText, createdBy: adminId, createdAt: fetchedAt, updatedAt: fetchedAt,
    warnings: ['Sports news imported for review only. Select Sports News and review a short summary before approval.', 'Verify the original publisher, attribution and reuse rights before publication.'],
  })
}

export async function importSportsNews(adminId) {
  const { stories, key } = await fetchSportsStories()
  const result = { fetched: stories.length, imported: 0, duplicates: 0, skipped: 0 }
  const fetchedAt = new Date()
  // Wait for automatic index creation before allowing concurrent upserts.
  await AssistantPost.init()
  for (const story of stories) {
    const draft = draftForStory(story, adminId, fetchedAt, key)
    if (!draft) { result.skipped++; continue }
    await draft.validate()
    try {
      // Insert only: timestamps:false also prevents changing an existing updatedAt.
      const write = await AssistantPost.updateOne({ $or: [
        { importKey: draft.importKey },
        { 'sourceMetadata.provider': 'thenewsapi', 'sourceMetadata.url': draft.sourceMetadata.url },
      ] }, { $setOnInsert: draft.toObject() }, {
        upsert: true, runValidators: true, timestamps: false, maxTimeMS: 3000, timeoutMS: 5000,
      })
      if (write.upsertedCount === 1) result.imported++
      else result.duplicates++
    } catch (error) {
      // Unique indexes arbitrate concurrent imports of the same UUID or URL.
      if (error.code === 11000) result.duplicates++
      else throw error
    }
  }
  return result
}
