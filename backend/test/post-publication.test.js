import assert from 'node:assert/strict'
import { once } from 'node:events'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import mongoose from 'mongoose'
import Admin from '../src/models/Admin.js'
import AssistantPost from '../src/models/AssistantPost.js'
import Job from '../src/models/Job.js'
import Scholarship from '../src/models/Scholarship.js'
import Opportunity from '../src/models/Opportunity.js'
import { POST_FIELDS } from '../src/validation/ai-posts.js'
import { expiryDate } from '../src/services/post-expiry.js'

process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/bigi_hub_publication_tests'
process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
process.env.ADMIN_ORIGINS = 'http://localhost:5174'
const { default: app } = await import('../src/app.js')
const { COOKIE_NAME, issueToken } = await import('../src/auth/session.js')
const admin = { _id: '0123456789abcdef01234567', active: true, sessionVersion: 0 }
const destinations = [
  ['Job', Job, 'jobs'], ['Scholarship', Scholarship, 'scholarships'],
  ['Grant', Opportunity, 'opportunities', 'Grants'], ['Fellowship', Opportunity, 'opportunities', 'Fellowships'],
  ['Internship', Opportunity, 'opportunities', 'Internships'], ['Training', Opportunity, 'opportunities', 'Training'],
  ['Competition', Opportunity, 'opportunities', 'Competitions'],
]
function matches(value, filter) {
  return Object.entries(filter).every(([key, wanted]) => {
    if (key === '$and') return wanted.every(child => matches(value, child))
    if (key === '$or') return wanted.some(child => matches(value, child))
    const actual = value[key]
    if (wanted === null) return actual == null
    if (wanted && Object.hasOwn(wanted, '$ne')) return String(actual) !== String(wanted.$ne)
    if (wanted?.$in) return wanted.$in.includes(actual)
    if (wanted?.$gt) return new Date(actual) > wanted.$gt
    if (wanted?.$regex !== undefined) return new RegExp(wanted.$regex, wanted.$options).test(actual || '')
    return String(actual) === String(wanted)
  })
}
function query(value) {
  return { select() { return this }, sort() { return this }, skip() { return this }, limit() { return this }, lean() { return this },
    maxTimeMS() { return this }, setOptions() { return this }, exec: async () => value,
    then(resolve, reject) { return Promise.resolve(value).then(resolve, reject) } }
}
function draft(type = 'Job', overrides = {}) {
  const fields = { ...Object.fromEntries(Object.keys(POST_FIELDS).map(key => [key, ''])),
    title: 'Reviewed title', organization: 'Source organization', location: 'Lagos, Nigeria',
    description: 'Source description', jobType: 'Full-time', workType: 'Remote', experience: 'Entry level',
    salary: 'Source funding', requirements: 'Source requirements', howToApply: 'Use the form',
    applicationUrl: 'https://example.com/apply', applicationEmail: 'apply@example.com' }
  return new AssistantPost({ postType: type, fields, extractedFields: fields, createdBy: admin._id,
    destination: 'jobs', opportunityCategory: '', approvedBy: admin._id, approvedAt: new Date(), status: 'approved', revision: 3,
    sourceText: 'Original flyer source', sourceImage: { name: 'flyer.png', mimeType: 'image/png', data: Buffer.from('original bytes') }, ...overrides })
}
async function harness(t) {
  const drafts = new Map(), records = new Map(), session = { testSession: true }
  let failSave = false, loseClaim = false, standalone = false, failActivation = false
  t.mock.method(Admin, 'findById', () => query(admin))
  t.mock.method(AssistantPost, 'updateMany', async () => ({ modifiedCount: 0 }))
  t.mock.method(AssistantPost, 'findOne', filter => query([...drafts.values()].find(post => matches(post, filter)) || null))
  t.mock.method(AssistantPost, 'findOneAndUpdate', (filter, update, options) => {
    if (options.session) assert.equal(options.session, session); assert.equal(options.runValidators, true)
    const post = [...drafts.values()].find(value => matches(value, filter))
    if (!post || loseClaim) return query(null)
    post.set(update.$set); for (const key of Object.keys(update.$unset || {})) post.set(key, undefined); post.revision += update.$inc?.revision || 0
    return query(post)
  })
  t.mock.method(AssistantPost, 'findOneAndDelete', filter => { const post = [...drafts.values()].find(value => matches(value, filter)); if (post) drafts.delete(String(post._id)); return query(post || null) })
  // Simulate transactional writes/rollback while keeping schema validation real.
  t.mock.method(mongoose.connection, 'transaction', async action => {
    if (standalone) throw Object.assign(new Error('Transactions unsupported'), { code: 20 })
    const originals = [...drafts].map(([id, post]) => [id, post.toObject()])
    const previous = new Map([...records].map(([name, values]) => [name, new Map(values)]))
    try { return await action(session) } catch (error) {
      drafts.clear(); for (const [id, value] of originals) drafts.set(id, new AssistantPost(value))
      records.clear(); for (const [name, values] of previous) records.set(name, values)
      throw error
    }
  })
  for (const Model of [Job, Scholarship, Opportunity]) {
    records.set(Model.modelName, new Map())
    t.mock.method(Model.prototype, 'save', async function(options) {
      assert.equal(options.session, session)
      await this.validate()
      if (failSave) throw Object.assign(new Error('Simulated write failure'), { code: 50 })
      const bucket = records.get(Model.modelName)
      if (bucket.has(String(this._id))) throw Object.assign(new Error('Duplicate'), { code: 11000 })
      bucket.set(String(this._id), this.toObject()); return this
    })
    t.mock.method(Model, 'updateOne', async (filter, update) => {
      if (failSave || (failActivation && update.$set?.publicationPending === false)) throw Object.assign(new Error('Write failed'), { code: 50 })
      const bucket = records.get(Model.modelName), id = String(filter._id), existing = bucket.get(id)
      if (existing && !matches(existing, filter)) throw Object.assign(new Error('Duplicate'), { code: 11000 })
      if (!existing && update.$setOnInsert) { const doc = new Model(update.$setOnInsert); await doc.validate(); bucket.set(id, doc.toObject()) }
      if (existing && update.$set) Object.assign(existing, update.$set)
      return { matchedCount: existing ? 1 : 0, modifiedCount: existing ? 1 : 0 }
    })
    const filtered = filter => [...records.get(Model.modelName).values()].filter(value => matches(value, filter))
    t.mock.method(Model, 'find', filter => query(filtered(filter)))
    t.mock.method(Model, 'findOne', filter => query(filtered(filter)[0] || null))
    t.mock.method(Model, 'countDocuments', filter => query(filtered(filter).length))
  }
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }))
  const base = `http://127.0.0.1:${server.address().port}/api`
  const publish = (post, options = {}) => fetch(`${base}/admin/ai-posts/${post._id}/publish`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: options.origin || 'http://localhost:5174',
      ...(options.guest ? {} : { Cookie: COOKIE_NAME + '=' + issueToken(admin) }) },
    body: JSON.stringify({ revision: options.revision ?? post.revision }),
  })
  const add = post => { drafts.set(String(post._id), post); return post }
  return { drafts, records, publish, add, reopen: post => fetch(`${base}/admin/ai-posts/${post._id}/reopen`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5174', Cookie: COOKIE_NAME + '=' + issueToken(admin) }, body: JSON.stringify({ revision: post.revision, confirmed: true }) }), edit: (post, body) => fetch(`${base}/admin/ai-posts/${post._id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5174', Cookie: COOKIE_NAME + '=' + issueToken(admin) }, body: JSON.stringify(body) }), remove: (post, body = { revision: post.revision, confirmed: true, scope: 'assistant-only' }, options = {}) => fetch(`${base}/admin/ai-posts/${post._id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json', Origin: options.origin || 'http://localhost:5174', ...(options.guest ? {} : { Cookie: COOKIE_NAME + '=' + issueToken(admin) }) }, body: JSON.stringify(body) }), detail: (resource, slug) => fetch(`${base}/${resource}/${slug}`), list: resource => fetch(`${base}/${resource}`),
    standalone: () => { standalone = true }, failActivation: () => { failActivation = true }, recover: () => { failSave = false; failActivation = false }, failWrite: () => { failSave = true }, loseClaim: () => { loseClaim = true } }
}

for (const [type, Model, resource, category] of destinations) {
  test(`${type} publishes once into ${resource} and is visible through the public API`, async t => {
    const h = await harness(t), post = h.add(draft(type, { destination: resource, opportunityCategory: category || '' })), revision = post.revision
    const response = await h.publish(post)
    assert.equal(response.status, 200)
    const assistant = (await response.json()).data
    assert.equal(assistant.destination, resource); assert.equal(assistant.publicRecordId, String(post._id)); assert.equal(assistant.publicSlug, 'reviewed-title-' + post._id)
    const detail = await h.detail(resource, assistant.publicSlug); assert.equal(detail.status, 200); assert.equal((await detail.json()).data._id, String(post._id))
    assert.equal(assistant.status, 'published'); assert.equal(assistant.revision, revision + 1)
    assert.equal(assistant.sourceImage.dataUrl, 'data:image/png;base64,' + Buffer.from('original bytes').toString('base64'))
    const publicResponse = await h.list(resource)
    assert.equal(publicResponse.headers.get('cache-control'), 'no-store')
    const body = await publicResponse.json()
    assert.equal(body.pagination.total, 1); assert.equal(body.data.length, 1)
    const listing = body.data[0]
    assert.equal(listing._id, String(post._id)); assert.equal(listing.countryCode, 'NG')
    assert.equal(listing.slug, 'reviewed-title-' + post._id)
    assert.equal(listing.deadline, assistant.expiresAt)
    assert.equal(listing.deadline, expiryDate(new Date(assistant.publishedAt), '').toISOString())
    assert.equal(listing.applyUrl, post.fields.applicationUrl)
    assert.match(listing.description, /Use the form/); assert.match(listing.description, /apply@example.com/)
    assert.equal(new Model(listing).validateSync(), undefined)
    assert.equal(listing.sourceImage, undefined); assert.equal(listing.evidence, undefined)
    if (category) assert.equal(listing.category, category)
    if (type === 'Job') { assert.equal(listing.archivedAt, null); assert.equal(listing.workType, 'Remote'); assert.deepEqual(listing.requirements, ['Source requirements']) }
    for (const other of ['jobs', 'scholarships', 'opportunities'].filter(value => value !== resource)) assert.equal((await (await h.list(other)).json()).pagination.total, 0)
    assert.equal((await h.publish(post, { revision })).status, 409)
    assert.equal(h.records.get(Model.modelName).size, 1)
    assert.equal((await h.publish(post)).status, 409)
  })
}

test('missing/invalid destination and missing/invalid opportunity category cannot publish', async t => {
  const h = await harness(t)
  for (const override of [{ destination: '' }, { destination: 'events' }, { destination: 'Jobs' }, { destination: 'opportunities' }, { destination: 'opportunities', opportunityCategory: 'Events' }]) {
    const post = h.add(draft('Job', override)); assert.equal((await h.publish(post)).status, 400)
    assert.equal(h.drafts.get(String(post._id)).status, 'approved')
  }
  for (const bucket of h.records.values()) assert.equal(bucket.size, 0)
})

test('destination is independent of AI classification, including Event and Other', async t => {
  const h = await harness(t)
  for (const [destination, Model] of [['jobs', Job], ['scholarships', Scholarship], ['opportunities', Opportunity]]) {
    const post = h.add(draft('Other', { destination, opportunityCategory: 'Training' }))
    assert.equal((await h.publish(post)).status, 200)
    assert.equal(h.records.get(Model.modelName).size, 1)
  }
  const invalid = h.add(draft('Invalid', { destination: 'jobs' })); assert.equal((await h.publish(invalid)).status, 400)
})

test('public publication validates required metadata instead of inventing a country', async t => {
  const h = await harness(t)
  for (const patch of [{ location: '' }, { location: 'Remote' }, { location: 'Nigeria or Ghana' }, { title: '' }, { workType: 'Unknown' }, { applicationUrl: 'javascript:alert(1)' }]) {
    const post = draft(); post.fields.set(patch); h.add(post)
    assert.equal((await h.publish(post)).status, 400)
    assert.equal(h.drafts.get(String(post._id)).status, 'approved')
  }
  assert.equal(h.records.get('Job').size, 0)
})

test('confirmed expiry is shared by assistant and all public destinations; expired records are retained and hidden', async t => {
  const h = await harness(t)
  for (const [type, Model, resource] of destinations) {
    const post = draft(type, { destination: resource, opportunityCategory: type === 'Scholarship' ? '' : { Grant: 'Grants', Fellowship: 'Fellowships', Internship: 'Internships', Training: 'Training', Competition: 'Competitions' }[type] || '', deadlineDate: '2000-01-31' }); post.fields.deadline = '2000-01-31'; h.add(post)
    const response = await h.publish(post)
    assert.equal(response.status, 200)
    const assistant = (await response.json()).data
    assert.equal(assistant.status, 'archived'); assert.equal(assistant.expiresAt, '2000-01-31T22:59:59.999Z')
    assert.equal(h.records.get(Model.modelName).get(String(post._id)).deadline.toISOString(), assistant.expiresAt)
    assert.equal((await (await h.list(resource)).json()).pagination.total, 0)
    assert.ok(h.drafts.get(String(post._id)).sourceImage.data)
  }
})

test('publication requires authentication, trusted origin and the approved current revision', async t => {
  const h = await harness(t), post = h.add(draft())
  assert.equal((await h.publish(post, { guest: true })).status, 401)
  assert.equal((await h.publish(post, { origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await h.publish(post, { revision: 1 })).status, 409)
  post.status = 'review'; assert.equal((await h.publish(post)).status, 409)
  assert.equal(h.records.get('Job').size, 0)
})

test('failed public insertion rolls back assistant publication; duplicate IDs never create another record', async t => {
  const h = await harness(t), post = h.add(draft()), originalRevision = post.revision
  h.records.get('Job').set(String(post._id), { _id: post._id, title: 'Existing record' })
  const response = await h.publish(post)
  assert.equal(response.status, 409); assert.equal(h.records.get('Job').size, 1)
  assert.equal(h.drafts.get(String(post._id)).status, 'approved')
  assert.equal(h.drafts.get(String(post._id)).revision, originalRevision)
  assert.equal(h.records.get('Job').get(String(post._id)).title, 'Existing record')
})

test('write failures and a concurrent lost approval claim do not leave published assistant records', async t => {
  t.mock.method(console, 'error', () => {})
  const h = await harness(t), post = h.add(draft())
  h.failWrite(); assert.equal((await h.publish(post)).status, 503)
  assert.equal(h.drafts.get(String(post._id)).status, 'approved'); assert.equal(h.records.get('Job').size, 0)
  h.loseClaim(); assert.equal((await h.publish(h.drafts.get(String(post._id)))).status, 409)
  assert.equal(h.records.get('Job').size, 0)
})

test('confirmed deletion removes only the assistant record and preserves its public listing', async t => {
  const h = await harness(t), post = h.add(draft())
  const published = await h.publish(post); assert.equal(published.status, 200)
  const assistant = (await published.json()).data
  const response = await h.remove(assistant); assert.equal(response.status, 200)
  assert.equal(h.drafts.size, 0); assert.equal(h.records.get('Job').size, 1)
  assert.equal((await h.detail('jobs', assistant.publicSlug)).status, 200)
  assert.match((await response.json()).message, /public listing remains unchanged/)
})

test('draft deletion requires confirmation, scope, authentication and the current revision', async t => {
  const h = await harness(t), post = h.add(draft('Job', { status: 'review' }))
  for (const body of [{ revision: post.revision }, { revision: post.revision, confirmed: false, scope: 'assistant-only' }, { revision: post.revision, confirmed: true, scope: 'public-listing' }]) assert.equal((await h.remove(post, body)).status, 400)
  const confirmed = { revision: post.revision, confirmed: true, scope: 'assistant-only' }
  assert.equal((await h.remove(post, confirmed, { guest: true })).status, 401)
  assert.equal((await h.remove(post, confirmed, { origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await h.remove(post, { ...confirmed, revision: 0 })).status, 409)
  assert.equal(h.drafts.size, 1)
  assert.equal((await h.remove(post)).status, 200); assert.equal(h.drafts.size, 0)
  assert.equal((await h.remove(post)).status, 409)
})

test('standalone publication safely resumes hidden linked records after activation failure', async t => {
  t.mock.method(console, 'error', () => {})
  const h = await harness(t), post = h.add(draft()), revision = post.revision
  h.standalone(); h.failActivation()
  assert.equal((await h.publish(post)).status, 503)
  const pending = h.drafts.get(String(post._id))
  assert.equal(pending.publicationState, 'pending'); assert.equal(String(pending.publicRecordId), String(post._id))
  assert.equal(h.records.get('Job').size, 1)
  assert.equal((await (await h.list('jobs')).json()).pagination.total, 0)
  assert.equal((await h.remove(pending)).status, 409)
  h.recover()
  assert.equal((await h.publish(pending, { revision })).status, 200)
  assert.equal(h.records.get('Job').size, 1)
  assert.equal((await (await h.list('jobs')).json()).pagination.total, 1)
  assert.equal(h.drafts.get(String(post._id)).publicationState, 'complete')
  assert.equal((await h.publish(pending)).status, 409)
})

test('standalone insert failure preserves a resumable draft without orphan public records', async t => {
  t.mock.method(console, 'error', () => {})
  const h = await harness(t), post = h.add(draft())
  h.standalone(); h.failWrite(); assert.equal((await h.publish(post)).status, 503)
  assert.equal(h.records.get('Job').size, 0); assert.equal(h.drafts.get(String(post._id)).publicationState, 'pending')
  h.recover(); assert.equal((await h.publish(h.drafts.get(String(post._id)))).status, 200)
  assert.equal(h.records.get('Job').size, 1)
})

test('explicit destination is saved on review and changing it clears approval', async t => {
  const h = await harness(t), post = h.add(draft('Other'))
  const response = await h.edit(post, { revision: post.revision, postType: post.postType, fields: post.fields.toObject(), deadlineDate: '', destination: 'scholarships', opportunityCategory: '' })
  assert.equal(response.status, 200)
  const saved = (await response.json()).data
  assert.equal(saved.destination, 'scholarships'); assert.equal(saved.status, 'review')
  assert.equal((await h.publish(saved)).status, 409)
  assert.equal((await h.edit(saved, { revision: saved.revision, postType: saved.postType, fields: saved.fields, deadlineDate: '', destination: 'events' })).status, 400)
})

test('pending and expired records do not resolve through a public detail endpoint', async t => {
  const h = await harness(t)
  h.records.get('Job').set('pending', { slug: 'pending', deadline: new Date('2099-01-01'), publicationPending: true })
  h.records.get('Job').set('expired', { slug: 'expired', deadline: new Date('2000-01-01'), publicationPending: false })
  assert.equal((await h.detail('jobs', 'pending')).status, 404)
  assert.equal((await h.detail('jobs', 'expired')).status, 404)
  assert.equal((await h.detail('jobs', 'invalid_slug')).status, 400)
})

test('delete database failures return an error and preserve both records', async t => {
  const h = await harness(t), post = h.add(draft())
  t.mock.method(console, 'error', () => {})
  AssistantPost.findOneAndDelete.mock.mockImplementation(() => { throw Object.assign(new Error('Private error'), { code: 50 }) })
  assert.equal((await h.remove(post)).status, 503); assert.equal(h.drafts.size, 1)
})

test('legacy assistant-only publication can return to review without losing its flyer or bypassing approval', async t => {
  const h = await harness(t), post = h.add(draft('Other', { status: 'published', destination: '' }))
  const response = await h.reopen(post); assert.equal(response.status, 200)
  const reopened = (await response.json()).data
  assert.equal(reopened.status, 'review'); assert.equal(reopened.destination, '')
  assert.equal(reopened.approvedBy, undefined); assert.equal(reopened.approvedAt, undefined)
  assert.ok(reopened.sourceImage.dataUrl)
  assert.equal((await h.publish(reopened)).status, 409)
})

test('a legacy publication with an existing public record cannot be reset or duplicated', async t => {
  const h = await harness(t), post = h.add(draft('Other', { status: 'published', destination: '' }))
  h.records.get('Scholarship').set(String(post._id), { _id: post._id, title: 'Existing public listing' })
  assert.equal((await h.reopen(post)).status, 409)
  assert.equal(h.drafts.get(String(post._id)).status, 'published'); assert.equal(h.records.get('Scholarship').size, 1)
})
