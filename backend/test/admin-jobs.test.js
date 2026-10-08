import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import test from 'node:test'
import Admin from '../src/models/Admin.js'
import Job from '../src/models/Job.js'
import { validateJobBody, jobFilter } from '../src/validation/jobs.js'
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/bigi_hub_jobs_tests'
process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
process.env.ADMIN_ORIGINS = 'http://localhost:5174'
const { default: app } = await import('../src/app.js')
const { issueToken, COOKIE_NAME } = await import('../src/auth/session.js')
const admin = { _id: '0123456789abcdef01234567', active: true, sessionVersion: 0 }
const id = '123456789abcdef012345678'
const valid = { title: 'Software engineer', slug: 'software-engineer', organization: 'Test organization', description: 'Build software.', location: 'Lagos', countryCode: 'NG', jobType: 'Full-time', deadline: '2027-01-20', applyUrl: 'https://example.com/apply', requirements: ['JavaScript'], benefits: ['Training'] }
function query(value) {
  return { select() { return this }, sort() { return this }, skip() { return this }, limit() { return this }, lean() { return this },
    maxTimeMS(ms) { assert.equal(ms, 3000); return this }, setOptions(options) { assert.equal(options.timeoutMS, 5000); return this }, exec: async () => value }
}
async function serve(t) {
  t.mock.method(Admin, 'findById', () => query(admin))
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) }))
  const base = `http://127.0.0.1:${server.address().port}/api/admin/jobs`
  const cookie = COOKIE_NAME + '=' + issueToken(admin)
  return (path = '', method = 'GET', body, options = {}) => fetch(base + path, {
    method, headers: { Origin: options.origin ?? 'http://localhost:5174', ...(options.guest ? {} : { Cookie: options.cookie ?? cookie }), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })
}
test('job input: required fields, strict types, lengths, dates, URLs, arrays and patch whitelist', () => {
  assert.deepEqual(validateJobBody(valid).errors, {})
  assert.deepEqual(validateJobBody({ title: 'Updated title' }, true).data, { title: 'Updated title' })
  assert.equal(validateJobBody({ ...valid, countryCode: 'ng' }).data.countryCode, 'NG')
  assert.equal(validateJobBody({ ...valid, deadline: '2028-02-29' }).errors.deadline, undefined)
  for (const field of ['title', 'slug', 'organization', 'description', 'location', 'countryCode', 'jobType', 'deadline']) {
    const body = { ...valid }; delete body[field]
    assert.ok(validateJobBody(body).errors[field], field)
    assert.ok(validateJobBody({ [field]: '' }, true).errors[field], field)
  }
  for (const body of [null, [], {}, 'text', { ...valid, title: { $ne: '' } }, { ...valid, countryCode: 'US' }, { ...valid, slug: 'unsafe/slug' }, { ...valid, title: 'x'.repeat(201) }, { ...valid, description: 'x'.repeat(6001) }, { ...valid, deadline: '2027-02-29' }, { ...valid, deadline: '2027-02-30' }, { ...valid, deadline: 1 }, { ...valid, workType: 'Elsewhere' }, { ...valid, applyUrl: 'javascript:alert(1)' }, { ...valid, applyUrl: 'https://user:pass@example.com' }, { ...valid, requirements: [''] }, { ...valid, requirements: [1] }, { ...valid, benefits: Array(21).fill('Benefit') }, { ...valid, benefits: ['x'.repeat(501)] }, { ...valid, archivedAt: new Date() }, { ...valid, $set: { title: 'Bad' } }, { ...valid, _id: id }, { ...valid, listedDate: '2027-01-01' }]) {
    assert.ok(Object.keys(validateJobBody(body).errors).length)
  }
  assert.equal(validateJobBody({ archived: 'true' }, true).errors.archived, 'archived must be true or false.')
  assert.equal(validateJobBody({ archived: false }, true).data.archivedAt, null)
  assert.ok(validateJobBody({ archived: true }, true).data.archivedAt instanceof Date)
  assert.deepEqual(jobFilter({ status: 'active' }), { $and: [{ archivedAt: null }] })
  assert.deepEqual(jobFilter({ status: 'archived' }), { $and: [{ archivedAt: { $ne: null } }] })
  assert.equal(jobFilter({ search: 'a+(b)' }).$and[0].$or[0].title.$regex, 'a\\+\\(b\\)')
})
test('all admin jobs reads/writes require an active session; writes also require trusted origin', async t => {
  const send = await serve(t)
  t.mock.method(Job, 'find', () => { throw new Error('Job storage must not be accessed') })
  t.mock.method(Job.prototype, 'save', () => { throw new Error('Job storage must not be accessed') })
  t.mock.method(Job, 'findByIdAndUpdate', () => { throw new Error('Job storage must not be accessed') })
  t.mock.method(Job, 'findByIdAndDelete', () => { throw new Error('Job storage must not be accessed') })
  for (const [path, method, body] of [['', 'GET'], ['/' + id, 'GET'], ['', 'POST', valid], ['/' + id, 'PATCH', { title: 'Changed' }], ['/' + id, 'DELETE']]) {
    assert.equal((await send(path, method, body, { guest: true })).status, 401)
    assert.equal((await send(path, method, body, { cookie: COOKIE_NAME + '=forged' })).status, 401)
    if (method !== 'GET') assert.equal((await send(path, method, body, { origin: 'https://attacker.test' })).status, 403)
  }
  const inactive = { ...admin, active: false }
  Admin.findById.mock.mockImplementation(() => query(inactive))
  assert.equal((await send('', 'POST', valid)).status, 401)
  Admin.findById.mock.mockImplementation(() => query({ ...admin, sessionVersion: 1 }))
  assert.equal((await send('/' + id, 'DELETE')).status, 401)
  assert.equal(Job.prototype.save.mock.callCount(), 0)
  assert.equal(Job.findByIdAndUpdate.mock.callCount(), 0)
  assert.equal(Job.findByIdAndDelete.mock.callCount(), 0)
})
test('admin list supports pagination and literal filters; malformed queries and IDs fail before storage', async t => {
  const send = await serve(t)
  let filter
  t.mock.method(Job, 'find', value => { filter = value; return query([{ ...valid, _id: id }]) })
  t.mock.method(Job, 'countDocuments', () => query(1))
  const response = await send('?search=a%2B%28b%29&status=active&location=Lagos&page=2&limit=10')
  assert.equal(response.status, 200)
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.deepEqual((await response.json()).pagination, { page: 2, limit: 10, total: 1, totalPages: 1 })
  assert.equal(filter.$and[0].$or[0].title.$regex, 'a\\+\\(b\\)')
  assert.deepEqual(filter.$and.at(-1), { archivedAt: null })
  const calls = Job.find.mock.callCount()
  for (const path of ['?status=unknown', '?search[x]=value', '?status=active&status=archived', '?page=0', '?limit=101', '?unknown=x', '/bad-id']) assert.equal((await send(path)).status, 400)
  assert.equal(Job.find.mock.callCount(), calls)
})
test('create/edit/archive/restore/delete validate input and preserve server-owned fields', async t => {
  const send = await serve(t)
  let stored, update
  t.mock.method(Job.prototype, 'save', async function(options) { assert.equal(options.timeoutMS, 5000); stored = this.toObject(); return this })
  t.mock.method(Job, 'findByIdAndUpdate', (jobId, value, options) => { assert.equal(jobId, id); assert.equal(options.runValidators, true); assert.equal(options.new, true); update = value; return query({ ...stored, ...value.$set }) })
  t.mock.method(Job, 'findById', () => query(stored))
  t.mock.method(Job, 'findByIdAndDelete', () => query(stored))
  const created = await send('', 'POST', { ...valid, workType: '' })
  assert.equal(created.status, 201); assert.equal((await created.json()).data.title, valid.title)
  assert.equal(stored.workType, undefined)
  const detail = await send('/' + id); assert.equal(detail.status, 200)
  assert.equal((await send('/' + id, 'PATCH', { title: 'Updated', workType: '' })).status, 200)
  assert.deepEqual(update, { $set: { title: 'Updated' }, $unset: { workType: 1 } })
  assert.equal((await send('/' + id, 'PATCH', { archived: true })).status, 200); assert.ok(update.$set.archivedAt instanceof Date)
  assert.equal((await send('/' + id, 'PATCH', { archived: false })).status, 200); assert.equal(update.$set.archivedAt, null)
  for (const body of [{}, { title: '' }, { $set: { title: 'Bad' } }, { archivedAt: null }, { requirements: 'text' }]) assert.equal((await send('/' + id, 'PATCH', body)).status, 400)
  assert.equal((await send('', 'POST', { ...valid, slug: 'invalid slug' })).status, 400)
  assert.equal((await send('/' + id, 'DELETE')).status, 200)
  stored = null
  assert.equal((await send('/' + id)).status, 404)
  assert.equal((await send('/' + id, 'DELETE')).status, 404)
  Job.findByIdAndUpdate.mock.mockImplementation(() => query(null))
  assert.equal((await send('/' + id, 'PATCH', { title: 'Missing' })).status, 404)
})
test('duplicate slugs return safe 409; write timeouts return retryable 503', async t => {
  const send = await serve(t)
  t.mock.method(console, 'error', () => {})
  t.mock.method(Job.prototype, 'save', async () => { throw Object.assign(new Error('private database detail'), { code: 11000 }) })
  const duplicate = await send('', 'POST', valid)
  assert.equal(duplicate.status, 409)
  assert.equal((await duplicate.json()).errors.slug, 'Choose a unique slug.')
  Job.prototype.save.mock.mockImplementation(async () => { throw Object.assign(new Error('private details'), { name: 'MongoOperationTimeoutError' }) })
  const timedOut = await send('', 'POST', valid)
  assert.equal(timedOut.status, 503)
  assert.equal((await timedOut.json()).message, 'Database request timed out. Please try again.')
})
test('public jobs excludes archived records, including legacy records without archive fields', async t => {
  let filter
  t.mock.method(Job, 'find', value => { filter = value; return query([]) })
  t.mock.method(Job, 'countDocuments', () => query(0))
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const response = await fetch(`http://127.0.0.1:${server.address().port}/api/jobs`)
  assert.equal(response.status, 200)
  assert.deepEqual(filter, { archivedAt: null })
})
