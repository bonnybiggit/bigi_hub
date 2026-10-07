import { Router } from 'express'
import { randomBytes } from 'node:crypto'
import Admin from '../models/Admin.js'
import { hashPassword, verifyPassword } from '../auth/passwords.js'
import { authConfigured, requireAdmin, requireTrustedOrigin, issueToken, COOKIE_NAME, cookieOptions, clearSession } from '../auth/session.js'
import { loginRateLimit } from '../auth/rate-limit.js'
const router = Router()
const dummyHash = hashPassword(randomBytes(32).toString('hex'))
const publicAdmin = admin => ({ id: String(admin._id), email: admin.email })
router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
router.use(authConfigured)
router.post('/login', requireTrustedOrigin, loginRateLimit, async (request, response, next) => {
  try {
    const body = request.body
    if (!body || Array.isArray(body) || Object.keys(body).some(key => !['email', 'password'].includes(key)) || typeof body.email !== 'string' || typeof body.password !== 'string' || body.email.length > 254 || body.password.length < 1 || body.password.length > 128 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return response.status(400).json({ status: 'error', message: 'Enter a valid email and password.' })
    }
    const admin = await Admin.findOne({ email: body.email.trim().toLowerCase() }).select('+passwordHash').maxTimeMS(3000).exec()
    const valid = await verifyPassword(body.password, admin?.passwordHash || await dummyHash)
    if (!valid || !admin?.active) return response.status(401).json({ status: 'error', message: 'Invalid email or password.' })
    response.cookie(COOKIE_NAME, issueToken(admin), { ...cookieOptions, maxAge: 60 * 60 * 1000 })
    response.json({ status: 'success', data: { admin: publicAdmin(admin), expiresAt: Date.now() + 60 * 60 * 1000 } })
  } catch (error) { next(error) }
})
router.get('/me', requireAdmin, (request, response) => response.json({ status: 'success', data: { admin: publicAdmin(request.admin), expiresAt: request.sessionExpiresAt } }))
router.post('/logout', requireTrustedOrigin, requireAdmin, async (request, response, next) => {
  try {
    await Admin.updateOne({ _id: request.admin._id }, { $inc: { sessionVersion: 1 } }, { maxTimeMS: 3000 })
    clearSession(response)
    response.json({ status: 'success', message: 'Logged out.' })
  } catch (error) { next(error) }
})
export default router
