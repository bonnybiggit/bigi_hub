import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { once } from 'node:events'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import Admin from '../src/models/Admin.js'
import { hashPassword, verifyPassword } from '../src/auth/passwords.js'
import { provisionAdmin } from '../src/auth/provision.js'
import { loginRateLimit } from '../src/auth/rate-limit.js'
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/bigi_hub_auth_tests'
process.env.ADMIN_JWT_SECRET = randomBytes(48).toString('hex')
process.env.ADMIN_ORIGINS = 'http://localhost:5174'
const { default: app } = await import('../src/app.js')
const { COOKIE_NAME, cookieOptions } = await import('../src/auth/session.js')
const password = randomBytes(24).toString('base64url')
const email = 'test-admin@example.test'
const query = value => ({ select() { return this }, maxTimeMS(ms) { assert.equal(ms, 3000); return this }, exec: async () => value })

test('passwords: salted hashes, comparison, and model redaction', async () => {
  const a = await hashPassword(password), b = await hashPassword(password)
  assert.notEqual(a, b)
  assert.equal(await verifyPassword(password, a), true)
  assert.equal(await verifyPassword('incorrect', a), false)
  assert.equal(await verifyPassword(password, 'invalid'), false)
  const admin = new Admin({ email, passwordHash: a })
  assert.equal(admin.validateSync(), undefined)
  assert.equal(admin.toJSON().passwordHash, undefined)
  assert.ok(new Admin({ email, passwordHash: password }).validateSync())
})

test('authentication: login, restoration, rejected tokens, CSRF, logout revocation', async t => {
  const admin = { _id: '0123456789abcdef01234567', email, passwordHash: await hashPassword(password), sessionVersion: 0, active: true }
  t.mock.method(Admin, 'findOne', filter => { assert.deepEqual(filter, { email }); return query(admin) })
  t.mock.method(Admin, 'findById', id => query(id === admin._id ? admin : null))
  t.mock.method(Admin, 'updateOne', async () => { admin.sessionVersion++; return { modifiedCount: 1 } })
  const server = app.listen(0, '127.0.0.1'); await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  const base = `http://127.0.0.1:${server.address().port}/api/admin/auth`
  const post = (path, body, cookie, origin = 'http://localhost:5174') => fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...(cookie ? { Cookie: cookie } : {}) }, body: JSON.stringify(body) })
  assert.equal((await fetch(base + '/me')).status, 401)
  assert.equal((await post('/login', { email, password }, null, 'https://attacker.test')).status, 403)
  for (const body of [{ email: { $ne: null }, password }, { email, password: ['x'] }, { email, password, role: 'admin' }, { email, password: 'x'.repeat(129) }]) assert.equal((await post('/login', body)).status, 400)
  const bad = await post('/login', { email, password: 'incorrect' }); assert.equal(bad.status, 401); assert.equal((await bad.json()).message, 'Invalid email or password.')
  const login = await post('/login', { email: email.toUpperCase(), password }); assert.equal(login.status, 200)
  assert.equal(login.headers.get('cache-control'), 'no-store')
  const setCookie = login.headers.get('set-cookie'); assert.match(setCookie, /HttpOnly/); assert.match(setCookie, /SameSite=Strict/); assert.match(setCookie, /Max-Age=3600/)
  const body = await login.json(); assert.deepEqual(body.data.admin, { id: admin._id, email }); assert.equal(body.token, undefined)
  const cookie = setCookie.split(';')[0], token = cookie.slice(COOKIE_NAME.length + 1)
  const claims = jwt.verify(token, process.env.ADMIN_JWT_SECRET, { algorithms: ['HS256'], issuer: 'bigi-hub-api', audience: 'bigi-hub-admin' }); assert.equal(claims.sub, admin._id)
  assert.equal((await fetch(base + '/me', { headers: { Cookie: cookie } })).status, 200)
  for (const forged of [token + 'broken', jwt.sign({ version: 0 }, process.env.ADMIN_JWT_SECRET, { subject: admin._id, issuer: 'wrong', audience: 'bigi-hub-admin', expiresIn: '1h' }), jwt.sign({ version: 0 }, process.env.ADMIN_JWT_SECRET, { subject: admin._id, issuer: 'bigi-hub-api', audience: 'bigi-hub-admin', expiresIn: -1 })]) assert.equal((await fetch(base + '/me', { headers: { Cookie: COOKIE_NAME + '=' + forged } })).status, 401)
  admin.active = false; assert.equal((await fetch(base + '/me', { headers: { Cookie: cookie } })).status, 401); admin.active = true
  assert.equal((await post('/logout', {}, cookie, 'https://attacker.test')).status, 403)
  const logout = await post('/logout', {}, cookie); assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/)
  assert.equal((await fetch(base + '/me', { headers: { Cookie: cookie } })).status, 401)
  assert.equal(cookieOptions.httpOnly, true); assert.equal(cookieOptions.sameSite, 'strict')
})

test('provisioning: hashed credentials and no overwrite of existing admin', async t => {
  let exists = false, created
  t.mock.method(Admin, 'init', async () => {})
  t.mock.method(Admin, 'exists', () => ({ maxTimeMS: async () => exists }))
  t.mock.method(Admin, 'create', async value => { created = value; exists = true })
  await provisionAdmin({ initialAdminEmail: email, initialAdminPassword: password })
  assert.equal(await verifyPassword(password, created.passwordHash), true)
  await provisionAdmin({ initialAdminEmail: email, initialAdminPassword: 'different-password-value' })
  assert.equal(Admin.create.mock.callCount(), 1)
  await assert.rejects(provisionAdmin({ initialAdminEmail: email, initialAdminPassword: 'short' }))
})

test('login attempts are limited and include Retry-After', () => {
  let accepted = 0, status, retry
  const response = { set(_key, value) { retry = value }, status(value) { status = value; return this }, json() {} }
  for (let i = 0; i < 11; i++) loginRateLimit({ ip: 'rate-limit-unit-test' }, response, () => accepted++)
  assert.equal(accepted, 10); assert.equal(status, 429); assert.ok(Number(retry) > 0)
})
