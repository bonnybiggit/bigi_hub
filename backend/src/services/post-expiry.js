import AssistantPost from '../models/AssistantPost.js'
export function expiryDate(publishedAt, deadlineDate) {
  if (deadlineDate) return new Date(deadlineDate + 'T23:59:59.999+01:00') // End of the application day in Africa/Lagos.
  const result = new Date(publishedAt)
  const day = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + 3)
  const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate()
  result.setUTCDate(Math.min(day, lastDay))
  return result
}
export const archiveExpiredPosts = (now = new Date()) => AssistantPost.updateMany({ status: 'published', expiresAt: { $lte: now } }, { $set: { status: 'archived', archivedAt: now } }, { maxTimeMS: 3000, timeoutMS: 5000 })
export function startPostExpiry() {
  const sweep = () => archiveExpiredPosts().catch(() => console.error('Assistant post expiry sweep failed; it will retry.'))
  void sweep()
  const timer = setInterval(sweep, 60000)
  timer.unref()
  return () => clearInterval(timer)
}
