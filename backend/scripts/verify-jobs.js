import 'dotenv/config'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { once } from 'node:events'
import mongoose from 'mongoose'
import Job from '../src/models/Job.js'

// Uses only a uniquely identified temporary job. Never prints secrets or records.
const slug = 'admin-jobs-verification-' + randomUUID()
const required = ['MONGODB_URI', 'ADMIN_JWT_SECRET', 'INITIAL_ADMIN_EMAIL', 'INITIAL_ADMIN_PASSWORD']
let server, jobId, cookie, stage = 'configuration'
const originalError = console.error
console.error = () => {}
try {
  const missing = required.filter(key => !process.env[key])
  assert.equal(missing.length, 0, 'Missing verification configuration')
  const { env } = await import('../src/config/env.js')
  stage = 'MongoDB connection'
  await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 })
  await Job.init()
  console.log('Real MongoDB connection and job index: PASS')
  const { default: app } = await import('../src/app.js')
  server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  const base = 'http://127.0.0.1:' + server.address().port + '/api'
  const send = (path, method = 'GET', body, options = {}) => fetch(base + path, {
    method, headers: { Origin: options.origin ?? env.adminOrigins[0], ...(!options.guest && cookie ? { Cookie: cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000),
  })
  stage = 'existing admin login'
  const login = await send('/admin/auth/login', 'POST', { email: env.initialAdminEmail, password: env.initialAdminPassword })
  assert.equal(login.status, 200)
  cookie = login.headers.get('set-cookie').split(';')[0]
  console.log('Existing admin login: PASS')
  const body = { title: 'Temporary CRUD verification', slug, organization: 'Verification only', description: `Temporary record ${slug}; removed automatically after verification.`, location: 'Lagos', countryCode: 'NG', jobType: 'Full-time', workType: 'Remote', experienceLevel: 'Entry level', compensation: 'Verification only', deadline: '2027-12-31', applyUrl: 'https://example.com/apply', requirements: ['Verification'], benefits: ['Verification'] }
  stage = 'admin-only write protection'
  assert.equal((await send('/admin/jobs', 'POST', body, { guest: true })).status, 401)
  assert.equal((await send('/admin/jobs', 'POST', body, { origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await send('/admin/jobs', 'GET', undefined, { guest: true })).status, 401)
  assert.equal(await Job.countDocuments({ slug }), 0)
  console.log('Unauthenticated reads/writes and untrusted origin rejected: PASS')
  stage = 'create'
  const created = await send('/admin/jobs', 'POST', body)
  assert.equal(created.status, 201)
  jobId = (await created.json()).data._id
  assert.ok(jobId)
  const stored = await Job.findById(jobId).lean()
  assert.equal(stored.slug, slug); assert.equal(stored.title, body.title); assert.deepEqual(stored.requirements, body.requirements)
  console.log('Create via API and MongoDB persistence: PASS')
  stage = 'detail, search and filters'
  assert.equal((await send('/admin/jobs/' + jobId)).status, 200)
  const list = await send(`/admin/jobs?search=${slug}&location=Lagos&workType=Remote&jobType=Full-time&experience=Entry&status=active`)
  assert.equal(list.status, 200)
  const listed = await list.json()
  assert.equal(listed.pagination.total, 1); assert.equal(listed.data[0]._id, jobId)
  console.log('Detail, search, filters and pagination: PASS')
  stage = 'validation and duplicate slug'
  const invalid = await send('/admin/jobs/' + jobId, 'PATCH', { title: '', deadline: '2027-02-30', applyUrl: 'javascript:alert(1)' })
  assert.equal(invalid.status, 400)
  assert.equal((await Job.findById(jobId).lean()).title, body.title)
  assert.equal((await send('/admin/jobs', 'POST', body)).status, 409)
  console.log('Invalid writes rejected without changes; duplicate slug conflict: PASS')
  stage = 'edit'
  const patch = { title: 'Temporary CRUD verification edited', compensation: 'Updated', requirements: ['Updated requirement'], benefits: [], workType: '' }
  assert.equal((await send('/admin/jobs/' + jobId, 'PATCH', patch)).status, 200)
  const edited = await Job.findById(jobId).lean()
  assert.equal(edited.title, patch.title); assert.equal(edited.compensation, patch.compensation)
  assert.deepEqual(edited.requirements, patch.requirements); assert.deepEqual(edited.benefits, []); assert.equal(edited.workType, undefined)
  console.log('Edit and optional-field clearing persisted in MongoDB: PASS')
  stage = 'unauthenticated update and delete'
  assert.equal((await send('/admin/jobs/' + jobId, 'PATCH', { title: 'Unauthorized' }, { guest: true })).status, 401)
  assert.equal((await send('/admin/jobs/' + jobId, 'DELETE', undefined, { guest: true })).status, 401)
  assert.equal((await send('/admin/jobs/' + jobId, 'DELETE', undefined, { origin: 'https://untrusted.example' })).status, 403)
  assert.equal((await Job.findById(jobId).lean()).title, patch.title)
  console.log('Unauthorized edit/delete rejected without changes: PASS')
  stage = 'archive and restore'
  assert.equal((await send('/admin/jobs/' + jobId, 'PATCH', { archived: true })).status, 200)
  assert.ok((await Job.findById(jobId).lean()).archivedAt)
  const publicArchived = await send('/jobs?search=' + slug, 'GET', undefined, { guest: true })
  assert.equal((await publicArchived.json()).pagination.total, 0)
  const archivedList = await send('/admin/jobs?search=' + slug + '&status=archived')
  assert.equal((await archivedList.json()).pagination.total, 1)
  assert.equal((await send('/admin/jobs/' + jobId, 'PATCH', { archived: false })).status, 200)
  assert.equal((await Job.findById(jobId).lean()).archivedAt, null)
  const publicRestored = await send('/jobs?search=' + slug, 'GET', undefined, { guest: true })
  assert.equal((await publicRestored.json()).pagination.total, 1)
  console.log('Archive retained in MongoDB, hidden publicly, and restore: PASS')
  stage = 'delete'
  assert.equal((await send('/admin/jobs/' + jobId, 'DELETE')).status, 200)
  assert.equal(await Job.countDocuments({ slug }), 0)
  assert.equal((await send('/admin/jobs/' + jobId)).status, 404)
  assert.equal((await send('/admin/jobs/' + jobId, 'DELETE')).status, 404)
  console.log('Delete persisted in MongoDB and missing-job responses: PASS')
} catch {
  console.log('Jobs verification failed at: ' + stage + '. No credentials or internal details were printed.')
  process.exitCode = 1
} finally {
  if (mongoose.connection.readyState === 1) {
    try {
      await Job.deleteMany({ slug }).maxTimeMS(3000)
      assert.equal(await Job.countDocuments({ slug }).maxTimeMS(3000), 0)
      console.log('Temporary verification record cleanup: PASS')
    } catch { console.log('Temporary record cleanup failed for slug: ' + slug); process.exitCode = 1 }
  }
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  await mongoose.disconnect()
  console.error = originalError
}
