import jwt from 'jsonwebtoken'
import { randomUUID } from 'node:crypto'
import Admin from '../models/Admin.js'
import { env } from '../config/env.js'
export const COOKIE_NAME = env.nodeEnv === 'production' ? '__Host-bigi_admin' : 'bigi_admin'
export const cookieOptions = { httpOnly: true, secure: env.nodeEnv === 'production', sameSite: 'strict', path: '/' }
export function issueToken(admin) {
  return jwt.sign({ version: admin.sessionVersion }, env.jwtSecret, { algorithm: 'HS256', subject: String(admin._id), issuer: 'bigi-hub-api', audience: 'bigi-hub-admin', expiresIn: '1h', jwtid: randomUUID() })
}
export function clearSession(response) { response.clearCookie(COOKIE_NAME, cookieOptions) }
export function authConfigured(_request, response, next) {
  if (!env.jwtSecret || env.jwtSecret.length < 32) return response.status(503).json({ status: 'error', message: 'Admin authentication is not configured.' })
  next()
}
export async function requireAdmin(request, response, next) {
  try {
    const cookies = (request.headers.cookie || '').split(';').map(value => value.trim()).filter(value => value.startsWith(COOKIE_NAME + '='))
    if (cookies.length !== 1) return unauthorized(response)
    let claims
    try { claims = jwt.verify(cookies[0].slice(COOKIE_NAME.length + 1), env.jwtSecret, { algorithms: ['HS256'], issuer: 'bigi-hub-api', audience: 'bigi-hub-admin' }) } catch { return unauthorized(response) }
    if (typeof claims !== 'object' || !/^[a-f0-9]{24}$/.test(claims.sub || '') || !Number.isInteger(claims.version) || !claims.exp || !claims.jti) return unauthorized(response)
    const admin = await Admin.findById(claims.sub).maxTimeMS(3000).exec()
    if (!admin || !admin.active || admin.sessionVersion !== claims.version) return unauthorized(response)
    request.admin = admin
    request.sessionExpiresAt = claims.exp * 1000
    next()
  } catch (error) { next(error) }
}
function unauthorized(response) {
  clearSession(response)
  return response.status(401).json({ status: 'error', message: 'Please log in to continue.' })
}
export function requireTrustedOrigin(request, response, next) {
  if (!env.adminOrigins.includes(request.headers.origin)) return response.status(403).json({ status: 'error', message: 'Request origin is not allowed.' })
  next()
}
