import express, { Router } from 'express'
import AssistantPost from '../models/AssistantPost.js'
import { NEWS_CATEGORY_IDS } from '../config/content-categories.js'
import { validateNewsDraft } from '../validation/news-drafts.js'
import { authConfigured, requireAdmin, requireTrustedOrigin } from '../auth/session.js'
import { validateSource, validateReview, validateRevision, validateDestination, inputError } from '../validation/ai-posts.js'
import { validateListingQuery } from '../validation/listings.js'
import { analyzeSource, aiConfiguration } from '../services/post-analysis.js'
import { archiveExpiredPosts } from '../services/post-expiry.js'
import { importSportsNews } from '../services/sports-news-import.js'
import { publicListing, publishPublicPost, publicationCapability, reopenLegacyPublication } from '../services/post-publication.js'
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
    if ([400, 409, 502, 503].includes(error.status)) return response.status(error.status).json({ status: 'error', message: error.message, ...(error.errors ? { errors: error.errors } : {}) })
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
router.get('/configuration', safe(async (_request, response) => response.json({ status: 'ok', data: { configured: Boolean(aiConfiguration().apiKey), database: await publicationCapability() } })))
router.get('/', safe(async (request, response) => {
  const { page, limit } = validateListingQuery(request.query, ['status', 'kind'])
  if (request.query.search) throw Object.assign(new Error('Search is not supported for assistant posts.'), { status: 400 })
  if (request.query.status && !['review', 'approved', 'published', 'archived'].includes(request.query.status)) throw Object.assign(new Error('Invalid post status.'), { status: 400 })
  await archiveExpiredPosts()
  const filter = request.query.status ? { status: request.query.status } : {}
  if (request.query.kind && !['sports', ...NEWS_CATEGORY_IDS].includes(request.query.kind)) throw inputError('Invalid assistant post kind.')
  if (NEWS_CATEGORY_IDS.includes(request.query.kind)) filter.destination = request.query.kind
  if (request.query.kind === 'sports') filter.$or = [{ destination: 'sports' }, { 'sourceMetadata.provider': 'thenewsapi', 'sourceMetadata.category': 'sports' }]
  const [posts, total] = await Promise.all([bounded(AssistantPost.find(filter).select('postType destination opportunityCategory publicRecordId publicSlug publicationState fields.title status revision deadlineDate publishedAt expiresAt createdAt sourceImage.name sourceMetadata').sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit)).lean(), bounded(AssistantPost.countDocuments(filter))])
  response.json({ status: 'ok', data: posts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
}))
router.post('/import/sports', safe(async (request, response) => {
  if (request.body && (typeof request.body !== 'object' || Array.isArray(request.body) || Object.keys(request.body).length)) throw inputError('Sports collection takes no request parameters.')
  const result = await importSportsNews(request.admin._id)
  response.json({ status: 'ok', data: result, message: 'Sports collection completed. New stories are awaiting review; nothing was approved or published.' })
}))
router.post('/analyze', safe(async (request, response) => {
  const source = validateSource(request.body)
  const extracted = await analyzeSource(source)
  const post = new AssistantPost({ ...extracted, extractedFields: extracted.fields, sourceText: source.text, sourceImage: source.image || undefined, createdBy: request.admin._id })
  await post.save({ timeoutMS: 5000 })
  response.status(201).json({ status: 'ok', data: sendPost(post) })
}))
router.post('/news-drafts', safe(async (request, response) => {
  const value = validateNewsDraft(request.body)
  const fields = { title: value.title, description: value.summary }
  const post = new AssistantPost({ postType: 'Other', destination: value.category, fields, extractedFields: fields,
    status: 'review', createdBy: request.admin._id, sourceText: value.summary,
    sourceMetadata: { provider: 'manual', category: value.category, url: value.sourceUrl, attribution: value.sourceName, publishedAt: new Date(value.sourcePublishedAt) },
    warnings: ['Manually entered news summary. Verify publisher attribution and summary reuse rights before approval.'] })
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
  const post = await bounded(AssistantPost.findOneAndUpdate({ _id: request.params.id, revision: request.body.revision, status: { $in: ['review', 'approved'] }, publicRecordId: null, publicationState: { $ne: 'pending' } }, { $set: { ...review, status: 'review' }, $unset: { approvedAt: 1, approvedBy: 1 }, $inc: { revision: 1 } }, { new: true, runValidators: true }).select('+sourceImage.data'))
  if (!post) return stale(response)
  response.json({ status: 'ok', data: sendPost(post) })
}))
router.post('/:id/approve', safe(async (request, response) => {
  const revision = validateRevision(request.body, true)
  const current = await bounded(AssistantPost.findOne({ _id: request.params.id, revision, status: 'review' }))
  if (!current) return stale(response)
  validateDestination(current.destination, current.opportunityCategory)
  validateReview({ revision, postType: current.postType, fields: current.fields.toObject(), deadlineDate: current.deadlineDate, destination: current.destination, opportunityCategory: current.opportunityCategory })
  // Approval must satisfy the same public-record requirements as publication.
  await publicListing(current).listing.validate()
  const post = await bounded(AssistantPost.findOneAndUpdate({ _id: request.params.id, revision, status: 'review' }, { $set: { status: 'approved', approvedBy: request.admin._id, approvedAt: new Date() }, $inc: { revision: 1 } }, { new: true, runValidators: true }).select('+sourceImage.data'))
  if (!post) return stale(response)
  response.json({ status: 'ok', data: sendPost(post) })
}))
router.post('/:id/publish', safe(async (request, response) => {
  const revision = validateRevision(request.body)
  const current = await bounded(AssistantPost.findOne({ _id: request.params.id, $or: [
    { revision, status: 'approved', publicationState: { $ne: 'pending' }, publicRecordId: null },
    { publicationState: 'pending', $or: [{ revision }, { publicationRevision: revision }] },
  ] }))
  if (!current) return stale(response)
  // Approval cannot bypass validation (e.g. unresolved source dates).
  validateReview({ revision, postType: current.postType, fields: current.fields.toObject(), deadlineDate: current.deadlineDate, destination: current.destination, opportunityCategory: current.opportunityCategory })
  const post = await publishPublicPost(current, revision, request.admin._id)
  response.json({ status: 'ok', data: sendPost(post) })
}))
router.post('/:id/reopen', safe(async (request, response) => {
  const revision = validateRevision(request.body, true)
  const post = await reopenLegacyPublication(request.params.id, revision)
  response.json({ status: 'ok', data: sendPost(post), message: 'Assistant-only publication returned to review. Select a destination, review and approve again; the original flyer is preserved.' })
}))
router.delete('/:id', safe(async (request, response) => {
  const body = request.body
  if (!body || Object.keys(body).some(key => !['revision', 'confirmed', 'scope'].includes(key)) || !Number.isInteger(body.revision) || body.revision < 0 || body.confirmed !== true || body.scope !== 'assistant-only') throw inputError('Confirm deletion of the assistant record only. Public listings are never deleted by this action.')
  const deleted = await bounded(AssistantPost.findOneAndDelete({ _id: request.params.id, revision: body.revision, publicationState: { $ne: 'pending' } }))
  if (!deleted) return response.status(409).json({ status: 'error', message: 'The assistant record changed, was deleted, or has a pending publication. Reload it; resume a pending publication before deletion.' })
  response.json({ status: 'ok', message: 'Assistant record and its source deleted. Any public listing remains unchanged.', data: { publicRecordId: deleted.publicRecordId || null, destination: deleted.destination || '' } })
}))
export default router
