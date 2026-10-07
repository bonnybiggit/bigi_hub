import assert from 'node:assert/strict'
import { once } from 'node:events'
import test from 'node:test'
import Job from '../src/models/Job.js'
import Opportunity from '../src/models/Opportunity.js'
import Scholarship from '../src/models/Scholarship.js'
import { errorHandler } from '../src/middleware/error-handler.js'
import { DATABASE_MAX_TIME_MS, DATABASE_TIMEOUT_MS } from '../src/validation/listings.js'

process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/bigi_hub_validation_tests'
const { default: app } = await import('../src/app.js')

const resources = [
  ['jobs', Job, { jobType: 'Full-time' }, ['location', 'jobType', 'workType', 'experience']],
  ['opportunities', Opportunity, { category: 'Grants' }, ['category', 'location', 'eligibility', 'countryCode']],
  ['scholarships', Scholarship, {}, ['country', 'eligibility', 'location', 'level']],
]
const valid = {
  title: 'Valid listing', slug: 'valid-listing-2026', organization: 'Organization',
  description: 'Description', location: 'Lagos, Nigeria', countryCode: 'NG', deadline: '2026-10-15',
}

async function serve(t) {
  const server = app.listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve())))
  return `http://127.0.0.1:${server.address().port}`
}

for (const [resource, Model, extra, filterKeys] of resources) {
  test(`${resource}: application URL validation`, () => {
    for (const applyUrl of [undefined, null, '', 'https://example.com/apply?a=1#form', 'http://example.com', 'HTTPS://example.com/apply']) {
      assert.equal(new Model({ ...valid, ...extra, applyUrl }).validateSync(), undefined)
    }
    for (const applyUrl of ['javascript:alert(1)', 'data:text/html,test', 'file:///tmp/file', 'ftp://example.com', '//example.com', '/apply', 'https://', 'https://user:password@example.com', 'https://example.com/a b', 'https://example.com\\evil', 'https://example.com/a\nb']) {
      assert.ok(new Model({ ...valid, ...extra, applyUrl }).validateSync()?.errors.applyUrl, applyUrl)
    }
  })

  test(`${resource}: slug validation`, () => {
    for (const slug of ['role', 'role-2026', 'a'.repeat(200)]) {
      assert.equal(new Model({ ...valid, ...extra, slug }).validateSync(), undefined)
    }
    for (const slug of ['', 'a/b', 'a?b', 'a#b', 'two words', '-role', 'role-', 'role--name', 'role_name', 'a'.repeat(201)]) {
      assert.ok(new Model({ ...valid, ...extra, slug }).validateSync()?.errors.slug, slug)
    }
  })

  test(`${resource}: malformed and excessive queries return 400 before database access`, async t => {
    t.mock.method(Model.collection, 'find', () => { throw new Error('Database must not be queried') })
    t.mock.method(Model.collection, 'countDocuments', () => { throw new Error('Database must not be queried') })
    const base = await serve(t)
    const queries = [
      'unknown=value', 'page[]=1', 'page[x]=1', 'page=1&page=2', 'limit=1&limit=2',
      'search[x]=value', 'search[]=value', 'search=a&search=b', 'location[x]=value',
      `search=${'a'.repeat(201)}`, `search=${'%20'.repeat(201)}`,
    ]
    for (const key of ['page', 'limit']) {
      for (const value of ['', '0', '-1', '1.5', '1e2', '0x10', '01', '%201', 'Infinity', '9007199254740993']) queries.push(`${key}=${value}`)
    }
    queries.push('page=10001', 'limit=101')
    for (const key of filterKeys) queries.push(`${key}=`, `${key}=a&${key}=b`, `${key}=${'a'.repeat(201)}`)
    for (const query of queries) {
      const response = await fetch(`${base}/api/${resource}?${query}`)
      assert.equal(response.status, 400, query)
      const body = await response.json()
      assert.equal(body.status, 'error')
      assert.equal(typeof body.message, 'string')
    }
    assert.equal(Model.collection.find.mock.callCount(), 0)
    assert.equal(Model.collection.countDocuments.mock.callCount(), 0)
  })

  test(`${resource}: valid requests preserve response, literal search, and query deadlines`, async t => {
    const calls = []
    t.mock.method(Model.collection, 'find', (filter, options) => {
      calls.push({ filter, options })
      return { toArray: async () => [] }
    })
    t.mock.method(Model.collection, 'countDocuments', async (filter, options) => {
      calls.push({ filter, options })
      return 0
    })
    const base = await serve(t)
    for (const query of ['', 'page=10000&limit=100', `search=${'a'.repeat(200)}`, 'search=', 'search=a%2B%28b%29&location=Lagos']) {
      const response = await fetch(`${base}/api/${resource}?${query}`)
      assert.equal(response.status, 200, query)
      const body = await response.json()
      assert.equal(body.status, 'ok')
      assert.deepEqual(body.data, [])
      assert.equal(body.pagination.totalPages, 0)
    }
    for (const { options } of calls) {
      assert.equal(options.maxTimeMS, DATABASE_MAX_TIME_MS)
      assert.equal(options.timeoutMS, DATABASE_TIMEOUT_MS)
    }
    assert.equal(calls.at(-1).filter.$and[0].$or[0].title.$regex, 'a\\+\\(b\\)')
    assert.equal(Model.schema.options.bufferTimeoutMS, DATABASE_TIMEOUT_MS)
  })

  test(`${resource}: database timeout returns safe retryable 503`, async t => {
    t.mock.method(console, 'error', () => {})
    t.mock.method(Model.collection, 'find', () => { throw Object.assign(new Error('private database details'), { code: 50 }) })
    t.mock.method(Model.collection, 'countDocuments', async () => 0)
    const base = await serve(t)
    const response = await fetch(`${base}/api/${resource}`)
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { status: 'error', message: 'Database request timed out. Please try again.' })
  })
}

test('production hides unexpected error details for client and server errors', t => {
  t.mock.method(console, 'error', () => {})
  const previous = process.env.NODE_ENV
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous })
  for (const mode of ['production', ' Production ']) {
    process.env.NODE_ENV = mode
    for (const status of [400, 413, 500, 503, 200, 999]) {
      let actualStatus, body
      const response = { status(value) { actualStatus = value; return this }, json(value) { body = value } }
      errorHandler(Object.assign(new Error('secret query / credentials / body'), { status }), {}, response, () => {})
      assert.ok(actualStatus >= 400 && actualStatus <= 599)
      assert.equal(body.message, actualStatus >= 500 ? 'Internal server error.' : 'Invalid request.')
    }
  }
})

test('all supported timeout types are sanitized', t => {
  t.mock.method(console, 'error', () => {})
  for (const name of ['MongoOperationTimeoutError', 'MongoNetworkTimeoutError', 'MongoServerSelectionError', 'MongooseServerSelectionError', 'MongooseError']) {
    let body, status
    const response = { status(value) { status = value; return this }, json(value) { body = value } }
    errorHandler(Object.assign(new Error('private buffering timed out details'), { name }), {}, response, () => {})
    assert.equal(status, 503)
    assert.equal(body.message, 'Database request timed out. Please try again.')
  }
})

test('production API errors and malformed JSON never expose internal details', async t => {
  t.mock.method(console, 'error', () => {})
  const previous = process.env.NODE_ENV
  process.env.NODE_ENV = 'production'
  t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous })
  const base = await serve(t)
  for (const [resource, Model] of resources) {
    t.mock.method(Model.collection, 'find', () => { throw new Error('private database credentials') })
    t.mock.method(Model.collection, 'countDocuments', async () => 0)
    const response = await fetch(`${base}/api/${resource}`)
    assert.equal(response.status, 500)
    assert.deepEqual(await response.json(), { status: 'error', message: 'Internal server error.' })
    const malformed = await fetch(`${base}/api/${resource}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"private":',
    })
    assert.equal(malformed.status, 400)
    assert.deepEqual(await malformed.json(), { status: 'error', message: 'Invalid request.' })
  }
})

test('disconnected MongoDB buffering is bounded across all listing APIs', async t => {
  t.mock.method(console, 'error', () => {})
  const base = await serve(t)
  const started = Date.now()
  await Promise.all(resources.map(async ([resource]) => {
    const response = await fetch(`${base}/api/${resource}`, { signal: AbortSignal.timeout(DATABASE_TIMEOUT_MS + 3000) })
    assert.equal(response.status, 503)
    assert.deepEqual(await response.json(), { status: 'error', message: 'Database request timed out. Please try again.' })
  }))
  assert.ok(Date.now() - started < DATABASE_TIMEOUT_MS + 3000)
})
