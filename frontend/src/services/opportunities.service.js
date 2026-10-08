import apiClient from './apiClient.js'

/**
 * Fetches opportunities from the backend API.
 * @param {object} [params] - Optional query parameters (search, category, location, eligibility, countryCode, page, limit).
 * @returns {Promise<object>} The API response body ({ status, data, pagination }).
 */
export async function getOpportunities(params = {}, { signal } = {}) {
  const response = await apiClient.get('/opportunities', { params, signal })
  return response.data
}

// The public API exposes listing only; match slugs exactly across pages.
export async function getOpportunityBySlug(slug, { signal } = {}) {
  let page = 1
  let totalPages
  do {
    const response = await getOpportunities({ page, limit: 100 }, { signal })
    if (response.status !== 'ok' || !Array.isArray(response.data)) throw new Error('Invalid opportunities response')
    const opportunity = response.data.find(item => item.slug === slug)
    if (opportunity) return { ...opportunity, id: opportunity._id ?? opportunity.id }
    totalPages = response.pagination?.totalPages ?? 1
    page += 1
  } while (page <= totalPages)
  return null
}
