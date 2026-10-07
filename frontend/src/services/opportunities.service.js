import apiClient from './apiClient.js'

/**
 * Fetches opportunities from the backend API.
 * @param {object} [params] - Optional query parameters (search, category, location, eligibility, countryCode, page, limit).
 * @returns {Promise<object>} The API response body ({ status, data, pagination }).
 */
export async function getOpportunities(params = {}) {
  const response = await apiClient.get('/opportunities', { params })
  return response.data
}
