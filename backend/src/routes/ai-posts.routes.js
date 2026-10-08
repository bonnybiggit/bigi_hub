import express, { Router } from 'express'
import AssistantPost from '../models/AssistantPost.js'
import { authConfigured, requireAdmin, requireTrustedOrigin } from '../auth/session.js'
import { validateSource, validateReview, validateRevision } from '../validation/ai-posts.js'
import { validateListingQuery } from '../validation/listings.js'
import { analyzeSource, aiConfiguration } from '../services/post-analysis.js'
import { archiveExpiredPosts, expiryDate } from '../services/post-expiry.js'
const router = Router()
const bounded = query => query.maxTimeMS(3000).setOptions({ timeoutMS: 5000 })
const stale = response => response.status(409).json({ status: 'error', message: 'The post changed or is no longer in this workflow step. Reload it and review again.' })
function sendPost(post) {
  const value = typeof post.toObject === 'function' ? post.toObject({ flattenMaps: true }) : { ...post }
  if (value.sourceImage?.data) {
    const data = value.sourceImage.data
    value.sourceImage = { ...value.sourceImage, dataUrl: `data:${value.sourceImage.mimeType};base64,${Buffer.from(data.buffer && !Buffer.isBuffer(data) ? data.buffer : data).toString('base64')}` }
    delete value.sourceImage.data
  }
  delete value.__v
  return value
}
const safe = handler => async (request, response, next) => {
  try { await handler(request, response) } catch (error) {
    if ([400, 502, 503].includes(error.status)) return response.status(error.status).json({ status: 'error', message: error.message, ...(error.errors ? { errors: error.errors } : {}) })
    if (error.type === 'entity.too.large') return response.status(413).json({ status: 'error', message: 'Use a flyer up to 4MB and text up to 20,000 characters.' })
    if (error.name === 'ValidationError') return response.status(400).json({ status: 'error', message: 'The post contains invalid or excessive content.' })
    next(error)
  }
}
router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
router.use(authConfigured, requireAdmin)
router.use((request, response, next) => request.method === 'GET' || request.method === 'HEAD' ? next() : requireTrustedOrigin(request, response, next))
// Larger JSON applies only to this protected route. Existing Jobs limits stay unchanged.
router.use(express.json({ limit: '6mb' }))
router.use((error, _request, response, next) => {
  if (error.type === 'entity.too.large') return response.status(413).json({ status: 'error', message: 'Use a flyer up to 4MB and text up to 20,000 characters.' })
  if (error.type === 'entity.parse.failed') return response.status(400).json({ status: 'error', message: 'Invalid assistant input.' })
  next(error)
})
router.param('id', (_request, response, next, id) => /^[a-f\d]{24}$/i.test(id) ? next() : response.status(400).json({ status: 'error', message: 'Invalid post ID.' }))
router.get('/configuration', (_request, response) => response.json({ status: 'ok', data: { configured: Boolean(aiConfiguration().apiKey) } }))
router.get('/', safe(async (request, response) => {
  const { page, limit } = validateListingQuery(request.query, ['status'])
  if (request.query.search) throw Object.assign(new Error('Search is not supported for assistant posts.'), { status: 400 })
  if (request.query.status && !['review', 'approved', 'published', 'archived'].includes(request.query.status)) throw Object.assign(new Error('Invalid post status.'), { status: 400 })
  await archiveExpiredPosts()
  const filter = request.query.status ? { status: request.query.status } : {}
  const [posts, total] = await Promise.all([bounded(AssistantPost.find(filter).select('postType fields.title status revision deadlineDate publishedAt expiresAt createdAt sourceImage.name').sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit)).lean(), bounded(AssistantPost.countDocuments(filter))])
  response.json({ status: 'ok', data: posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
}))
router.post('/analyze', safe(async (request, response) => {
  const source = validateSource(request.body)
  const extracted = await analyzeSource(source)
  const post = new AssistantPost({ ...extracted, extractedFields: extracted.fields, sourceText: source.text, sourceImage: source.image || undefined, createdBy: request.admin._id })
  await post.save({ timeoutMS: 5000 })
  response.status(201).json({ status: 'ok', data: sendPost(post) })
}))
router.get('/:id', safe(async (request, response) => {
  await archiveExpiredPosts()
  const post = await bounded(AssistantPost.findById(request.params.id).select('+sourceImage.data'))
  if (!post) return response.status(404).json({ status: 'error', message: 'Post not found.' })
  response.json({ status: 'ok', data: sendPost(post) })
}))
router.patch('/:id', safe(async (request, response) => {
  const review = validateReview(request.body)
  const post = await bounded(AssistantPost.findOneAndUpdate({ _id: request.params.id, revision: request.body.revision, status: { $in: ['review', 'approved'] } }, { $set: { ...review, status: 'review' }, $unset: { approvedAt: 1, approvedBy: 1 }, $inc: { revision: 1 } }, { new: true, runValidators: true }).select('+sourceImage.data'))
  if (!post) return stale(response)
  response.json({ status: 'ok', data: sendPost(post) })
}))
router.post('/:id/approve', safe(async (request, response) => {
  const revision = validateRevision(request.body, true)
  const current = await bounded(AssistantPost.findOne({ _id: request.params.id, revision, status: 'review' }))
  if (!current) return stale(response)
  validateReview({ revision, postType: current.postType, fields: current.fields.toObject(), deadlineDate: current.deadlineDate })
  const post = await bounded(AssistantPost.findOneAndUpdate({ _id: request.params.id, revision, status: 'review' }, { $set: { status: 'approved', approvedBy: request.admin._id, approvedAt: new Date() }, $inc: { revision: 1 } }, { new: true }).select('+sourceImage.data'))
  if (!post) return stale(response)
  response.json({ status: 'ok', data: sendPost(post) })
}))
router.post('/:id/publish', safe(async (request, response) => {
  const revision = validateRevision(request.body)
  const current = await bounded(AssistantPost.findOne({ _id: request.params.id, revision, status: 'approved' }))
  if (!current) return stale(response)
  // Approval cannot bypass validation (e.g. unresolved source dates).
  validateReview({ revision, postType: current.postType, fields: current.fields.toObject(), deadlineDate: current.deadlineDate })
  const now = new Date(), expiresAt = expiryDate(now, current.deadlineDate)
  const expired = expiresAt <= now
  const post = await bounded(AssistantPost.findOneAndUpdate({ _id: request.params.id, revision, status: 'approved' }, { $set: { status: expired ? 'archived' : 'published', publishedBy: request.admin._id, publishedAt: now, expiresAt, ...(expired ? { archivedAt: now } : {}) }, $inc: { revision: 1 } }, { new: true }).select('+sourceImage.data'))
  if (!post) return stale(response)
  response.json({ status: 'ok', data: sendPost(post) })
}))
export default router
