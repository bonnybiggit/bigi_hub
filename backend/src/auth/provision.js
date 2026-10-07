import Admin from '../models/Admin.js'
import { hashPassword } from './passwords.js'
export async function provisionAdmin({ initialAdminEmail, initialAdminPassword }) {
  if (!initialAdminEmail && !initialAdminPassword) return
  const email = initialAdminEmail.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof initialAdminPassword !== 'string' || initialAdminPassword.length < 12 || initialAdminPassword.length > 128) {
    throw new Error('Initial admin requires a valid email and a password of 12?128 characters.')
  }
  await Admin.init()
  if (await Admin.exists({ email }).maxTimeMS(3000)) return
  const passwordHash = await hashPassword(initialAdminPassword)
  try { await Admin.create({ email, passwordHash }) } catch (error) { if (error.code !== 11000) throw error }
}
