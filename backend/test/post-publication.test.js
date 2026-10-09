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
    approvedBy: admin._id, approvedAt: new Date(), status: 'approved', revision: 3,
    sourceText: 'Original flyer source', sourceImage: { name: 'flyer.png', mimeType: 'image/png', data: Buffer.from('original bytes') }, ...overrides })
}
async function harness(t) {
  const drafts = new Map(), records = new Map(), session = { testSession: true }
  let failSave = false, loseClaim = false
  t.mock.method(Admin, 'findById', () => query(admin))
  t.mock.method(AssistantPost, 'updateMany', async () => ({ modifiedCount: 0 }))
  t.mock.method(AssistantPost, 'findOne', filter => query([...drafts.values()].find(post => matches(post, filter)) || null))
  t.mock.method(AssistantPost, 'findOneAndUpdate', (filter, update, options) => {
    assert.equal(options.session, session); assert.equal(options.runValidators, true)
    const post = [...drafts.values()].find(value => matches(value, filter))
    if (!post || loseClaim) return query(null)
    post.set(update.$set); post.revision += update.$inc.revision
    return query(post)
  })
  // Simulate transactional writes/rollback while keeping schema validation real.
  t.mock.method(mongoose.connection, 'transaction', async action => {
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
    const filtered = filter => [...records.get(Model.modelName).values()].filter(value => matches(value, filter))
    t.mock.method(Model, 'find', filter => query(filtered(filter)))
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
  return { drafts, records, publish, add, list: resource => fetch(`${base}/${resource}`),
    failWrite: () => { failSave = true }, loseClaim: () => { loseClaim = true } }
}

for (const [type, Model, resource, category] of destinations) {
  test(`${type} publishes once into ${resource} and is visible through the public API`, async t => {
    const h = await harness(t), post = h.add(draft(type)), revision = post.revision
    const response = await h.publish(post)
    assert.equal(response.status, 200)
    const assistant = (await response.json()).data
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

test('Event, Other and invalid types do not write any public record', async t => {
  const h = await harness(t)
  for (const type of ['Event', 'Other', 'Invalid']) {
    const post = h.add(draft(type)), response = await h.publish(post)
    assert.equal(response.status, 400)
    assert.equal(h.drafts.get(String(post._id)).status, 'approved')
  }
  for (const bucket of h.records.values()) assert.equal(bucket.size, 0)
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
    const post = draft(type, { deadlineDate: '2000-01-31' }); post.fields.deadline = '2000-01-31'; h.add(post)
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
