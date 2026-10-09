export const PRODUCTION_API_URL = 'https://bigi-hub-api.onrender.com/api'

export function resolveApiBaseUrl(configured, production = true) {
  const value = configured?.trim()
  const fallback = production ? PRODUCTION_API_URL : 'http://localhost:5000/api'
  if (!value) return fallback
  try {
    const url = new URL(value)
    if (!['http:', 'https:'].includes(url.protocol)) return fallback
    // A stale local build setting must never send public visitors to localhost.
    if (production && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) return PRODUCTION_API_URL
    if (url.pathname === '/') url.pathname = '/api'
    return url.href.replace(/\/$/, '')
  } catch { return fallback }
}
