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

// Detail pages use the same active-record rules as their listing API.
export async function getOpportunityBySlug(slug, { signal } = {}) {
  try {
    const response = await apiClient.get('/opportunities/' + encodeURIComponent(slug), { signal })
    if (response.data.status !== 'ok' || !response.data.data) throw new Error('Invalid listing response')
    const item = response.data.data
    return { ...item, id: item._id ?? item.id }
  } catch (error) {
    if (error.response?.status === 404) return null
    throw error
  }
}
