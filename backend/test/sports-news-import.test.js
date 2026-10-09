import assert from 'node:assert/strict'
import test from 'node:test'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import Admin from '../src/models/Admin.js'
import AssistantPost from '../src/models/AssistantPost.js'
import Job from '../src/models/Job.js'
import Opportunity from '../src/models/Opportunity.js'
import Scholarship from '../src/models/Scholarship.js'
import { importSportsNews } from '../src/services/sports-news-import.js'

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/bigi_hub_sports_tests'
process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
process.env.ADMIN_ORIGINS = 'http://localhost:5174'
const { default: app } = await import('../src/app.js')
const { COOKIE_NAME, issueToken } = await import('../src/auth/session.js')
const admin = { _id: '0123456789abcdef01234567', active: true, sessionVersion: 0 }
const story = (overrides = {}) => ({ uuid: 'sports-story-1', title: 'Sports headline',
  description: 'Publisher description', snippet: 'Publisher snippet', source: 'publisher.example',
  url: 'https://publisher.example/sports/story', categories: ['sports'], published_at: '2026-10-09T10:00:00Z', ...overrides })

function setup(t, data = [story()], status = 200) {
  const previous = process.env.THE_NEWS_API_KEY
  process.env.THE_NEWS_API_KEY = 'test-only-news-key'
  t.after(() => { if (previous === undefined) delete process.env.THE_NEWS_API_KEY; else process.env.THE_NEWS_API_KEY = previous })
  const requests = [], records = new Map(), nativeFetch = globalThis.fetch
  t.mock.method(AssistantPost, 'init', async () => AssistantPost)
  const provider = t.mock.method(globalThis, 'fetch', async (url, options) => {
    if (!String(url).startsWith('https://api.thenewsapi.com/')) return nativeFetch(url, options)
    requests.push({ url: new URL(url), options })
    return new Response(JSON.stringify({ data }), { status, headers: { 'Content-Type': 'application/json' } })
  })
  const writes = t.mock.method(AssistantPost, 'updateOne', async (filter, update, options) => {
    assert.equal(options.upsert, true)
    assert.equal(options.timestamps, false)
    assert.deepEqual(Object.keys(update), ['$setOnInsert'])
    const record = update.$setOnInsert
    assert.deepEqual(filter.$or, [{ importKey: record.importKey }, { 'sourceMetadata.provider': 'thenewsapi', 'sourceMetadata.url': record.sourceMetadata.url }])
    if ([...records.values()].some(item => item.importKey === record.importKey || item.sourceMetadata.url === record.sourceMetadata.url)) return { upsertedCount: 0 }
    records.set(record.importKey, record)
    return { upsertedCount: 1 }
  })
  for (const Model of [Job, Opportunity, Scholarship]) {
    t.mock.method(Model.prototype, 'save', () => { throw new Error('Must not publish') })
    t.mock.method(Model, 'updateOne', () => { throw new Error('Must not publish') })
  }
  return { requests, records, writes, provider }
}

test('missing news key fails without provider requests or draft writes', async t => {
  const { requests, writes } = setup(t)
  delete process.env.THE_NEWS_API_KEY
  await assert.rejects(importSportsNews(admin._id), error => error.status === 503 && /THE_NEWS_API_KEY/.test(error.message))
  assert.equal(requests.length, 0)
  assert.equal(writes.mock.callCount(), 0)
})

for (const status of [401, 403, 429, 500]) {
  test(`provider HTTP ${status} stores nothing and exposes no provider secrets`, async t => {
    const { writes, provider } = setup(t)
    provider.mock.mockImplementation(async () => new Response('test-only-news-key PRIVATE_PROVIDER_ERROR', { status }))
    await assert.rejects(importSportsNews(admin._id), error => {
      assert.equal(error.status, 502)
      assert.doesNotMatch(error.message, /test-only-news-key|PRIVATE_PROVIDER_ERROR/)
      assert.equal(error.cause, undefined)
      return true
    })
    assert.equal(writes.mock.callCount(), 0)
  })
}

test('sports top stories become review drafts with original source, attribution and no publication', async t => {
  const { requests, records } = setup(t)
  assert.deepEqual(await importSportsNews(admin._id), { fetched: 1, imported: 1, duplicates: 0, skipped: 0 })
  const { url, options } = requests[0]
  assert.equal(url.origin + url.pathname, 'https://api.thenewsapi.com/v1/news/top')
  assert.equal(url.searchParams.get('categories'), 'sports')
  assert.equal(url.searchParams.get('api_token'), 'test-only-news-key')
  assert.equal(url.searchParams.get('limit'), '3')
  assert.equal(url.searchParams.get('language'), 'en')
  assert.equal(options.redirect, 'error')
  assert.ok(options.signal instanceof AbortSignal)
  const record = [...records.values()][0]
  assert.equal(record.status, 'review')
  assert.equal(record.postType, 'Other')
  assert.equal(record.destination, '')
  assert.equal(String(record.createdBy), admin._id)
  assert.equal(record.revision, 0)
  assert.equal(record.fields.title, story().title)
  assert.equal(record.fields.deadline, '')
  assert.equal(record.fields.applicationUrl, '')
  assert.equal(record.sourceMetadata.url, story().url)
  assert.equal(record.sourceMetadata.attribution, story().source)
  assert.equal(record.sourceMetadata.externalId, story().uuid)
  assert.ok(record.createdAt instanceof Date)
  assert.ok(record.sourceText.includes(story().url))
  assert.match(record.sourceText, /Collected via The News API/)
  for (const field of ['approvedBy', 'approvedAt', 'publishedBy', 'publishedAt', 'publicRecordId', 'publicationState']) assert.equal(record[field], undefined)
  assert.doesNotMatch(JSON.stringify(record), /test-only-news-key/)
})

test('duplicate UUIDs and source URLs never overwrite reviewed records or timestamps', async t => {
  const { records, provider } = setup(t, [story(), story()])
  assert.deepEqual(await importSportsNews(admin._id), { fetched: 2, imported: 1, duplicates: 1, skipped: 0 })
  const existing = [...records.values()][0]
  existing.status = 'approved'; existing.revision = 8; existing.fields.title = 'Admin reviewed title'
  const snapshot = structuredClone(existing)
  provider.mock.mockImplementation(async () => new Response(JSON.stringify({ data: [
    story({ title: 'Changed upstream title' }), story({ uuid: 'different-uuid' }),
    story({ url: 'https://publisher.example/sports/changed-url' }),
  ] })))
  assert.deepEqual(await importSportsNews(admin._id), { fetched: 3, imported: 0, duplicates: 3, skipped: 0 })
  assert.deepEqual(structuredClone([...records.values()]), [snapshot])
})

test('unique-index races count as duplicates and schema has both deduplication indexes', async t => {
  const { writes } = setup(t)
  writes.mock.mockImplementation(async () => { throw Object.assign(new Error('Duplicate key'), { code: 11000 }) })
  assert.equal((await importSportsNews(admin._id)).duplicates, 1)
  const indexes = AssistantPost.schema.indexes()
  assert.ok(indexes.some(([fields, options]) => fields.importKey === 1 && options.unique && options.sparse))
  assert.ok(indexes.some(([fields, options]) => fields['sourceMetadata.url'] === 1 && options.unique && options.partialFilterExpression['sourceMetadata.provider'] === 'thenewsapi'))
})

test('non-sports, unsafe URLs and missing required facts are skipped', async t => {
  const { records } = setup(t, [story({ categories: ['business'] }), story({ url: 'javascript:alert(1)' }), story({ title: '' })])
  assert.deepEqual(await importSportsNews(admin._id), { fetched: 3, imported: 0, duplicates: 0, skipped: 3 })
  assert.equal(records.size, 0)
})

test('invalid payloads, JSON and network failures do not leak raw errors or store records', async t => {
  const { provider, writes } = setup(t, null)
  await assert.rejects(importSportsNews(admin._id), /invalid sports response/)
  provider.mock.mockImplementation(async () => new Response('invalid JSON test-only-news-key'))
  await assert.rejects(importSportsNews(admin._id), /invalid JSON/)
  provider.mock.mockImplementation(async () => { throw new Error('https://api.thenewsapi.com/?api_token=test-only-news-key') })
  await assert.rejects(importSportsNews(admin._id), error => !error.message.includes('test-only-news-key') && !error.cause)
  assert.equal(writes.mock.callCount(), 0)
})

test('admin import route enforces login and trusted origin before fetching or saving', async t => {
  const { requests, writes } = setup(t)
  t.mock.method(Admin, 'findById', () => ({ maxTimeMS() { return this }, exec: async () => admin }))
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }))
  const endpoint = `http://127.0.0.1:${server.address().port}/api/admin/ai-posts/import/sports`
  const send = (cookie, origin = 'http://localhost:5174', body = {}) => fetch(endpoint, { method: 'POST', headers: {
    Origin: origin, 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}),
  }, body: JSON.stringify(body) })
  const cookie = COOKIE_NAME + '=' + issueToken(admin)
  assert.equal((await send()).status, 401)
  assert.equal((await send(COOKIE_NAME + '=forged')).status, 401)
  assert.equal((await send(cookie, 'https://untrusted.example')).status, 403)
  assert.equal((await send(cookie, undefined, { api_token: 'override' })).status, 400)
  assert.equal(requests.length, 0)
  assert.equal(writes.mock.callCount(), 0)
  const response = await send(cookie)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.data.imported, 1)
  assert.match(body.message, /nothing was approved or published/)
  assert.doesNotMatch(JSON.stringify(body), /test-only-news-key/)
})
