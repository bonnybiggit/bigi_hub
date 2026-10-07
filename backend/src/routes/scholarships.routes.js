import { Router } from 'express'
import Scholarship from '../models/Scholarship.js'

import { validateListingQuery, DATABASE_MAX_TIME_MS, DATABASE_TIMEOUT_MS } from '../validation/listings.js'

const scholarshipsRouter = Router()

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getTextFilter(value) {
  return { $regex: escapeRegex(value.trim()), $options: 'i' }
}

scholarshipsRouter.get('/', async (request, response, next) => {
  try {
    const { page, limit, search } = validateListingQuery(request.query, ["country","eligibility","location","level"])
    const filters = []

    if (search) {
      const searchFilter = getTextFilter(search)
      filters.push({
        $or: [
          { title: searchFilter },
          { organization: searchFilter },
          { description: searchFilter },
          { location: searchFilter },
          { eligibility: searchFilter },
          { funding: searchFilter },
        ],
      })
    }

    for (const [queryKey, fieldName] of [
      ['country', 'countryCode'],
      ['eligibility', 'eligibility'],
      ['location', 'location'],
      ['level', 'level'],
    ]) {
      const value = request.query[queryKey]

      if (value !== undefined) {
        filters.push({ [fieldName]: getTextFilter(value) })
      }
    }

    const filter = filters.length ? { $and: filters } : {}
    const [scholarships, total] = await Promise.all([
      Scholarship.find(filter)
        .select('-__v')
        .sort({ listedDate: -1, _id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .maxTimeMS(DATABASE_MAX_TIME_MS)
        .setOptions({ timeoutMS: DATABASE_TIMEOUT_MS })
        .lean()
        .exec(),
      Scholarship.countDocuments(filter)
        .maxTimeMS(DATABASE_MAX_TIME_MS)
        .setOptions({ timeoutMS: DATABASE_TIMEOUT_MS })
        .exec(),
    ])

    return response.status(200).json({
      status: 'ok',
      data: scholarships,
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

export default scholarshipsRouter
