const attempts = new Map()
const WINDOW_MS = 15 * 60 * 1000
export function loginRateLimit(request, response, next) {
  const now = Date.now()
  for (const [key, value] of attempts) if (value.until <= now) attempts.delete(key)
  const key = request.ip
  let entry = attempts.get(key)
  if (!entry) {
    if (attempts.size >= 10000) return response.status(503).json({ status: 'error', message: 'Please try again later.' })
    entry = { count: 0, until: now + WINDOW_MS }; attempts.set(key, entry)
  }
  entry.count++
  if (entry.count > 10) {
    response.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)))
    return response.status(429).json({ status: 'error', message: 'Too many login attempts. Please try again later.' })
  }
  next()
}
