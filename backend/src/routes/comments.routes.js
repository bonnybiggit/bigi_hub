import { Router } from 'express'
import SportsArticle from '../models/SportsArticle.js'
import NewsArticle from '../models/NewsArticle.js'
import SportsComment from '../models/SportsComment.js'
import { authConfigured, requireAdmin, requireTrustedOrigin } from '../auth/session.js'
import { slugValidation, validateListingQuery } from '../validation/listings.js'

const bounded = query => query.maxTimeMS(3000).setOptions({ timeoutMS: 5000 })
const COMMENT_CATEGORIES = ['sports', 'news', 'business', 'technology', 'health']
const STATUSES = ['approved', 'hidden', 'pending']
export function commentRateLimit() {
  const attempts = new Map()
  return (request, response, next) => {
    const now = Date.now()
    for (const [key, entry] of attempts) if (entry.until <= now) attempts.delete(key)
    let entry = attempts.get(request.ip)
    if (!entry) {
      if (attempts.size >= 10000) return response.status(503).json({ message: 'Please try again later.' })
      entry = { count: 0, until: now + 15 * 60 * 1000 }; attempts.set(request.ip, entry)
    }
    if (++entry.count > 5) {
      response.set('Retry-After', String(Math.ceil((entry.until - now) / 1000)))
      return response.status(429).json({ message: 'Too many comment attempts. Please wait 15 minutes and try again.' })
    }
    next()
  }
}
export function validateComment(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !['displayName', 'text'].includes(key))) return null
  if (typeof body.displayName !== 'string' || typeof body.text !== 'string') return null
  const displayName = body.displayName.trim(), text = body.text.trim()
  if (!displayName || displayName.length > 60 || !text || text.length > 1000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(displayName + text)) return null
  return { displayName, text }
}
// One limiter is shared by every category so the per-IP budget cannot be multiplied across routes.
const sharedRateLimit = commentRateLimit()
export function createPublicCommentsRouter(Model = SportsArticle, category = 'sports') {
  const router = Router({ mergeParams: true })
  const articleModel = Model === NewsArticle ? 'NewsArticle' : 'SportsArticle'
  const notFound = category === 'sports' ? 'Sports story not found.' : 'News story not found.'
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
  router.post('/', sharedRateLimit)
  router.use(async (request, response, next) => {
    try {
      if (!slugValidation.validator(request.params.slug)) return response.status(400).json({ message: 'Invalid article slug.' })
      const article = await bounded(Model.findOne({ ...(category === 'sports' ? {} : { category }), slug: request.params.slug, status: 'published', publicationPending: { $ne: true }, approvedAt: { $exists: true, $ne: null }, publishedAt: { $exists: true, $ne: null } }).select('_id')).lean()
      if (!article) return response.status(404).json({ message: notFound })
      request.articleId = article._id; next()
    } catch (error) { next(error) }
  })
  router.get('/', async (request, response, next) => {
    try {
      const { page, limit } = validateListingQuery(request.query, [])
      const filter = { articleId: request.articleId, status: 'approved' }
      const [data, total] = await Promise.all([
        bounded(SportsComment.find(filter).select('displayName text createdAt').sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
        bounded(SportsComment.countDocuments(filter)),
      ])
      response.json({ data, pagination: { page, totalPages: Math.ceil(total / limit), total } })
    } catch (error) { next(error) }
  })
  router.post('/', async (request, response, next) => {
    try {
      const fields = validateComment(request.body)
      if (!fields) return response.status(400).json({ message: 'Enter a display name (1–60 characters) and comment (1–1000 characters) only.' })
      const created = await SportsComment.create({ ...fields, articleId: request.articleId, articleModel, category, status: 'approved' })
      response.status(201).json({ message: 'Your comment has been posted.', data: { _id: created._id, displayName: created.displayName, text: created.text, createdAt: created.createdAt } })
    } catch (error) { next(error) }
  })
  return router
}
export const publicCommentsRouter = createPublicCommentsRouter()

async function articleDetails(comments) {
  const ids = [...new Set(comments.map(comment => String(comment.articleId)))]
  if (!ids.length) return new Map()
  const [sports, news] = await Promise.all([
    bounded(SportsArticle.find({ _id: { $in: ids } }).select('title slug')).lean(),
    bounded(NewsArticle.find({ _id: { $in: ids } }).select('title slug category')).lean(),
  ])
  return new Map([...sports.map(article => [String(article._id), { ...article, category: 'sports' }]), ...news.map(article => [String(article._id), article])])
}

export const adminCommentsRouter = Router()
adminCommentsRouter.use(authConfigured, requireAdmin)
adminCommentsRouter.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
adminCommentsRouter.get('/', async (request, response, next) => {
  try {
    const { page, limit } = validateListingQuery(request.query, ['status', 'category'])
    const status = request.query.status || 'approved'
    const category = request.query.category || 'all'
    if (status !== 'all' && !STATUSES.includes(status)) return response.status(400).json({ message: 'Invalid comment status.' })
    if (category !== 'all' && !COMMENT_CATEGORIES.includes(category)) return response.status(400).json({ message: 'Invalid comment category.' })
    const filter = {
      ...(status === 'all' ? {} : { status }),
      // Comments created before multi-category support have no category and belong to Sports.
      ...(category === 'all' ? {} : { category: category === 'sports' ? { $in: ['sports', null] } : category }),
    }
    const [rows, total] = await Promise.all([
      bounded(SportsComment.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit)).lean(),
      bounded(SportsComment.countDocuments(filter)),
    ])
    const articles = await articleDetails(rows)
    const data = rows.map(row => ({ ...row, article: articles.get(String(row.articleId)) || null }))
    response.json({ data, pagination: { page, totalPages: Math.ceil(total / limit), total } })
  } catch (error) { next(error) }
})
adminCommentsRouter.use(requireTrustedOrigin)
adminCommentsRouter.use('/:id', (request, response, next) => {
  if (!/^[a-f0-9]{24}$/.test(request.params.id)) return response.status(400).json({ message: 'Invalid comment ID.' })
  next()
})
adminCommentsRouter.patch('/:id', async (request, response, next) => {
  try {
    if (!request.body || Object.keys(request.body).length !== 1 || !['approved', 'hidden'].includes(request.body.status)) return response.status(400).json({ message: 'Choose approved or hidden.' })
    const result = await bounded(SportsComment.findByIdAndUpdate(request.params.id, { $set: { status: request.body.status } }, { new: true, runValidators: true })).lean()
    if (!result) return response.status(404).json({ message: 'Comment not found.' })
    response.json({ data: result })
  } catch (error) { next(error) }
})
adminCommentsRouter.delete('/:id', async (request, response, next) => {
  try {
    const result = await bounded(SportsComment.findByIdAndDelete(request.params.id)).lean()
    if (!result) return response.status(404).json({ message: 'Comment not found.' })
    response.json({ message: 'Comment deleted.' })
  } catch (error) { next(error) }
})
