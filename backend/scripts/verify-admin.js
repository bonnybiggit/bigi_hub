import 'dotenv/config'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import mongoose from 'mongoose'
import Admin from '../src/models/Admin.js'
import { provisionAdmin } from '../src/auth/provision.js'
import { verifyPassword } from '../src/auth/passwords.js'

// Print only stage results. Never print environment values, documents, or cookies.
const required = ['MONGODB_URI', 'ADMIN_JWT_SECRET', 'INITIAL_ADMIN_EMAIL', 'INITIAL_ADMIN_PASSWORD']
const missing = required.filter(key => !process.env[key])
let server
let stage = 'configuration'
const originalError = console.error
console.error = () => {}
try {
  if (missing.length) {
    console.log('Provisioning check blocked. Missing variables: ' + missing.join(', '))
    process.exitCode = 1
  } else {
    const { env } = await import('../src/config/env.js')
    assert.ok(env.jwtSecret.length >= 32)
    assert.ok(/^mongodb\+srv:\/\//.test(env.mongoUri) || /\.mongodb\.net/.test(env.mongoUri), 'Atlas URI required')
    assert.ok(env.adminOrigins.length > 0)
    console.log('Required provisioning configuration: PASS')
    stage = 'Atlas connection'
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 8000, connectTimeoutMS: 8000 })
    console.log('Atlas connection: PASS')
    stage = 'admin provisioning'
    const email = env.initialAdminEmail.trim().toLowerCase()
    const before = await Admin.exists({ email }).maxTimeMS(3000)
    await provisionAdmin(env)
    const admin = await Admin.findOne({ email }).select('+passwordHash').maxTimeMS(3000)
    assert.ok(admin?.active)
    assert.ok(await verifyPassword(env.initialAdminPassword, admin.passwordHash))
    assert.notEqual(admin.passwordHash, env.initialAdminPassword)
    console.log('Admin provisioning: PASS (' + (before ? 'existing account preserved' : 'account created') + ')')
    stage = 'idempotent provisioning'
    await provisionAdmin(env)
    const repeated = await Admin.findOne({ email }).select('+passwordHash').maxTimeMS(3000)
    assert.equal(String(repeated._id), String(admin._id))
    assert.equal(repeated.passwordHash, admin.passwordHash)
    assert.equal(await Admin.countDocuments({ email }).maxTimeMS(3000), 1)
    console.log('Provisioning repeat preserves one account and its password: PASS')
    const { default: app } = await import('../src/app.js')
    server = app.listen(0, '127.0.0.1')
    await once(server, 'listening')
    const base = 'http://127.0.0.1:' + server.address().port + '/api/admin/auth'
    const post = (path, body, cookie) => fetch(base + path, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: env.adminOrigins[0], ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
    })
    stage = 'real database login'
    const login = await post('/login', { email: env.initialAdminEmail, password: env.initialAdminPassword })
    assert.equal(login.status, 200)
    const cookieHeader = login.headers.get('set-cookie')
    assert.match(cookieHeader, /HttpOnly/)
    assert.match(cookieHeader, /SameSite=Strict/)
    if (env.nodeEnv === 'production') assert.match(cookieHeader, /Secure/)
    const cookie = cookieHeader.split(';')[0]
    const data = await login.json()
    assert.equal(data.data.admin.id, String(admin._id))
    console.log('Real database login and secure cookie attributes: PASS')
    stage = 'authenticated session'
    const session = await fetch(base + '/me', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) })
    assert.equal(session.status, 200)
    assert.equal((await session.json()).data.admin.id, String(admin._id))
    console.log('Authenticated session from real database: PASS')
    stage = 'logout'
    const logout = await post('/logout', {}, cookie)
    assert.equal(logout.status, 200)
    assert.match(logout.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/)
    stage = 'session revocation'
    const revoked = await fetch(base + '/me', { headers: { Cookie: cookie }, signal: AbortSignal.timeout(10000) })
    assert.equal(revoked.status, 401)
    console.log('Logout and server-side token revocation: PASS')
  }
} catch {
  console.log('Provisioning verification failed at: ' + stage + '. No credentials or internal details were printed.')
  process.exitCode = 1
} finally {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  await mongoose.disconnect()
  console.error = originalError
}
