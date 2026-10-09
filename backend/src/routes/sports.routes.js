import { Router } from 'express'
import SportsArticle from '../models/SportsArticle.js'
import { createPublicCommentsRouter } from './comments.routes.js'
import { validateListingQuery, slugValidation, DATABASE_MAX_TIME_MS, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const bounded = query => query.maxTimeMS(DATABASE_MAX_TIME_MS).setOptions({ timeoutMS: DATABASE_TIMEOUT_MS })
export function createArticleRouter(Model = SportsArticle, category) {
  const router = Router()
  router.use('/:slug/comments', createPublicCommentsRouter(Model, category))
  const visible = () => ({ ...(category ? { category } : {}), status: 'published', publicationPending: { $ne: true }, approvedAt: { $exists: true, $ne: null }, publishedAt: { $exists: true, $ne: null } })
  const publicFields = 'title slug summary sourceUrl sourceName sourcePublishedAt publishedAt' + (category ? ' category' : '')
  router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
  router.get('/', async (request, response, next) => {
    try {
      const { page, limit, search } = validateListingQuery(request.query, [])
      const filter = visible()
      if (search) {
        const expression = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
        filter.$or = [{ title: expression }, { summary: expression }, { sourceName: expression }]
      }
      const [data, total] = await Promise.all([
        bounded(Model.find(filter).select(publicFields).sort({ publishedAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit)).lean(),
        bounded(Model.countDocuments(filter)),
      ])
      response.json({ status: 'ok', data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
    } catch (error) {
      if (error.name === 'ListingQueryValidationError') return response.status(400).json({ status: 'error', message: error.message })
      next(error)
    }
  })
  router.get('/:slug', async (request, response, next) => {
    try {
      if (!slugValidation.validator(request.params.slug)) return response.status(400).json({ status: 'error', message: 'Invalid article slug.' })
      const article = await bounded(Model.findOne({ ...visible(), slug: request.params.slug }).select(publicFields)).lean()
      if (!article) return response.status(404).json({ status: 'error', message: category ? 'News story not found.' : 'Sports story not found.' })
      response.json({ status: 'ok', data: article })
    } catch (error) { next(error) }
  })
  return router
}
export default createArticleRouter()
