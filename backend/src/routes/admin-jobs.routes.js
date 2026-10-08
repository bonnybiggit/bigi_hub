import { Router } from 'express'
import Job from '../models/Job.js'
import { authConfigured, requireAdmin, requireTrustedOrigin } from '../auth/session.js'
import { validateListingQuery, DATABASE_MAX_TIME_MS, DATABASE_TIMEOUT_MS } from '../validation/listings.js'
import { validateJobBody, jobFilter } from '../validation/jobs.js'

const router = Router()
const bounded = query => query.maxTimeMS(DATABASE_MAX_TIME_MS).setOptions({ timeoutMS: DATABASE_TIMEOUT_MS })
router.use((_request, response, next) => { response.set('Cache-Control', 'no-store'); next() })
router.use(authConfigured, requireAdmin)
router.use((request, response, next) => {
  if (['POST', 'PATCH', 'DELETE'].includes(request.method)) return requireTrustedOrigin(request, response, next)
  next()
})
router.param('id', (request, response, next, id) => {
  if (!/^[a-f\d]{24}$/i.test(id)) return response.status(400).json({ status: 'error', message: 'Invalid job ID.' })
  next()
})
const notFound = response => response.status(404).json({ status: 'error', message: 'Job not found.' })
function failure(error, response, next) {
  if (error.name === 'ListingQueryValidationError') return response.status(400).json({ status: 'error', message: error.message })
  if (error.code === 11000) return response.status(409).json({ status: 'error', message: 'A job with this slug already exists.', errors: { slug: 'Choose a unique slug.' } })
  if (error.name === 'ValidationError') return response.status(400).json({ status: 'error', message: 'Check the job details.', errors: Object.fromEntries(Object.entries(error.errors).map(([key, value]) => [key, value.message])) })
  next(error)
}
router.get('/', async (request, response, next) => {
  try {
    const { page, limit } = validateListingQuery(request.query, ['location', 'jobType', 'workType', 'experience', 'status'])
    if (request.query.status && !['all', 'active', 'archived'].includes(request.query.status)) return response.status(400).json({ status: 'error', message: 'Select all, active or archived jobs.' })
    const filter = jobFilter(request.query)
    const [jobs, total] = await Promise.all([
      bounded(Job.find(filter).select('-__v').sort({ listedDate: -1, _id: 1 }).skip((page - 1) * limit).limit(limit)).lean().exec(),
      bounded(Job.countDocuments(filter)).exec(),
    ])
    response.json({ status: 'ok', data: jobs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } })
  } catch (error) { failure(error, response, next) }
})
router.get('/:id', async (request, response, next) => {
  try {
    const job = await bounded(Job.findById(request.params.id).select('-__v')).lean().exec()
    if (!job) return notFound(response)
    response.json({ status: 'ok', data: job })
  } catch (error) { failure(error, response, next) }
})
router.post('/', async (request, response, next) => {
  try {
    const { data, errors } = validateJobBody(request.body)
    if (Object.keys(errors).length) return response.status(400).json({ status: 'error', message: 'Check the job details.', errors })
    if (data.workType === '') delete data.workType
    const job = new Job(data)
    await job.save({ timeoutMS: DATABASE_TIMEOUT_MS })
    response.status(201).json({ status: 'ok', data: job.toObject() })
  } catch (error) { failure(error, response, next) }
})
router.patch('/:id', async (request, response, next) => {
  try {
    const { data, errors } = validateJobBody(request.body, true)
    if (Object.keys(errors).length) return response.status(400).json({ status: 'error', message: 'Check the job details.', errors })
    const update = { $set: data }
    if (data.workType === '') { delete data.workType; update.$unset = { workType: 1 } }
    const job = await bounded(Job.findByIdAndUpdate(request.params.id, update, { new: true, runValidators: true })).select('-__v').lean().exec()
    if (!job) return notFound(response)
    response.json({ status: 'ok', data: job })
  } catch (error) { failure(error, response, next) }
})
router.delete('/:id', async (request, response, next) => {
  try {
    const job = await bounded(Job.findByIdAndDelete(request.params.id)).exec()
    if (!job) return notFound(response)
    response.json({ status: 'ok', message: 'Job deleted.' })
  } catch (error) { failure(error, response, next) }
})
export default router
