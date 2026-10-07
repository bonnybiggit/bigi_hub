import apiClient from './apiClient.js'

/**
 * Fetches scholarships from the backend API.
 * @param {object} [params] - Optional query parameters (search, country, eligibility, location, level, page, limit).
 * @returns {Promise<object>} The API response body ({ status, data, pagination }).
 */
export async function getScholarships(params = {}) {
  const response = await apiClient.get('/scholarships', { params })
  return response.data
}
