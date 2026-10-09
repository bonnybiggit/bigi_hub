import { publicCategory } from '../config/content-categories.js'
import { Router } from 'express'
import Job from '../models/Job.js'

import { slugValidation, validateListingQuery, DATABASE_MAX_TIME_MS, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const jobsRouter = Router()

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getTextFilter(value) {
  return { $regex: escapeRegex(value.trim()), $options: 'i' }
}

jobsRouter.get('/', async (request, response, next) => {
  try {
    response.set('Cache-Control', 'no-store')
    const { page, limit, search } = validateListingQuery(request.query, publicCategory('jobs').filters)
    const filters = []

    if (search) {
      const searchFilter = getTextFilter(search)
      filters.push({
        $or: [
          { title: searchFilter },
          { organization: searchFilter },
          { description: searchFilter },
          { location: searchFilter },
        ],
      })
    }

    for (const [queryKey, fieldName] of [
      ['location', 'location'],
      ['jobType', 'jobType'],
      ['workType', 'workType'],
      ['experience', 'experienceLevel'],
    ]) {
      const value = request.query[queryKey]

      if (value !== undefined) {
        filters.push({ [fieldName]: getTextFilter(value) })
      }
    }

    // A null match includes older jobs without an archive field.
    const active = { publicationPending: { $ne: true }, archivedAt: null, deadline: { $gt: new Date() } }
    const filter = filters.length ? { $and: [...filters, active] } : active
    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .select('-__v -assistantPostId -publicationPending')
        .sort({ listedDate: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .maxTimeMS(DATABASE_MAX_TIME_MS)
        .setOptions({ timeoutMS: DATABASE_TIMEOUT_MS })
        .lean()
        .exec(),
      Job.countDocuments(filter)
        .maxTimeMS(DATABASE_MAX_TIME_MS)
        .setOptions({ timeoutMS: DATABASE_TIMEOUT_MS })
        .exec(),
    ])

    return response.status(200).json({
      status: 'ok',
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    if (error.name === 'ListingQueryValidationError') {
      return response.status(400).json({ status: 'error', message: error.message })
    }
    return next(error)
  }
})

jobsRouter.get('/:slug', async (request, response, next) => {
  try {
    response.set('Cache-Control', 'no-store')
    if (!slugValidation.validator(request.params.slug)) return response.status(400).json({ status: 'error', message: 'Invalid listing slug.' })
    const filter = { slug: request.params.slug, publicationPending: { $ne: true }, deadline: { $gt: new Date() }, archivedAt: null }
    const listing = await Job.findOne(filter).select('-__v -assistantPostId -publicationPending').maxTimeMS(DATABASE_MAX_TIME_MS).setOptions({ timeoutMS: DATABASE_TIMEOUT_MS }).lean().exec()
    if (!listing) return response.status(404).json({ status: 'error', message: 'Listing not found or expired.' })
    response.json({ status: 'ok', data: listing })
  } catch (error) { next(error) }
})

export default jobsRouter
