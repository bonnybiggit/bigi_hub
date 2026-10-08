import 'dotenv/config'

const port = Number(process.env.PORT ?? 5000)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535.')
}

const mongoUri = process.env.MONGODB_URI

if (!mongoUri) {
  throw new Error('MONGODB_URI is required. Set it in the environment or .env file.')
}

const corsOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const defaultAdminOrigin = process.env.NODE_ENV === 'production'
  ? 'https://bigihubadmin.netlify.app'
  : 'http://localhost:5174'
const adminOrigins = (process.env.ADMIN_ORIGINS ?? defaultAdminOrigin).split(',').map(origin => origin.trim()).filter(Boolean)
for (const origin of adminOrigins) {
  const parsed = new URL(origin)
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) throw new Error('ADMIN_ORIGINS must contain exact HTTP(S) origins.')
  if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') throw new Error('Production ADMIN_ORIGINS must use HTTPS.')
}
const jwtSecret = process.env.ADMIN_JWT_SECRET
if (jwtSecret && jwtSecret.length < 32) throw new Error('ADMIN_JWT_SECRET must contain at least 32 characters.')
if (process.env.NODE_ENV === 'production' && !jwtSecret) throw new Error('ADMIN_JWT_SECRET is required in production.')
if (Boolean(process.env.INITIAL_ADMIN_EMAIL) !== Boolean(process.env.INITIAL_ADMIN_PASSWORD)) throw new Error('Set both initial admin environment variables, or neither.')

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port,
  mongoUri,
  corsOrigins: [...new Set([...corsOrigins, ...adminOrigins])],
  adminOrigins,
  jwtSecret,
  initialAdminEmail: process.env.INITIAL_ADMIN_EMAIL,
  initialAdminPassword: process.env.INITIAL_ADMIN_PASSWORD,
}
