export const MAX_PAGE = 10000
export const MAX_LIMIT = 100
export const MAX_QUERY_TEXT_LENGTH = 200
export const DATABASE_MAX_TIME_MS = 3000
export const DATABASE_TIMEOUT_MS = 5000

export const slugValidation = {
  validator: (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length <= 200,
  message: 'slug must contain lowercase letters or numbers separated by single hyphens (maximum 200 characters).',
}

export const applicationUrlValidation = {
  validator(value) {
    if (value == null || value === '') return true
    if (!/^https?:\/\//i.test(value) || /[\s\u0000-\u001f\u007f\\]/.test(value)) return false
    try {
      const url = new URL(value)
      return ['http:', 'https:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password
    } catch {
      return false
    }
  },
  message: 'applyUrl must be an absolute HTTP or HTTPS URL without credentials.',
}

function invalid(message) {
  const error = new Error(message)
  error.name = 'ListingQueryValidationError'
  error.status = 400
  return error
}

function positiveInteger(value, key, fallback, maximum) {
  if (value === undefined) return fallback
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw invalid(`${key} must be an integer between 1 and ${maximum}.`)
  }
  const number = Number(value)
  if (!Number.isSafeInteger(number) || number > maximum) {
    throw invalid(`${key} must be an integer between 1 and ${maximum}.`)
  }
  return number
}

export function validateListingQuery(query, filterKeys) {
  const allowed = new Set(['page', 'limit', 'search', ...filterKeys])
  for (const [key, value] of Object.entries(query)) {
    if (!allowed.has(key)) throw invalid('Unsupported query parameter.')
    if (typeof value !== 'string') throw invalid(`${key} must be a single text value.`)
    if (!['page', 'limit'].includes(key) && value.length > MAX_QUERY_TEXT_LENGTH) {
      throw invalid(`${key} must not exceed ${MAX_QUERY_TEXT_LENGTH} characters.`)
    }
    if (filterKeys.includes(key) && !value.trim()) throw invalid(`${key} must be a non-empty string.`)
  }
  return {
    page: positiveInteger(query.page, 'page', 1, MAX_PAGE),
    limit: positiveInteger(query.limit, 'limit', 10, MAX_LIMIT),
    search: query.search?.trim() ?? '',
  }
}
