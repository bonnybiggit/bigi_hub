import apiClient from './apiClient.js'

/**
 * Fetches jobs from the backend API.
 * @param {object} [params] - Optional query parameters (search, location, jobType, workType, experience, page, limit).
 * @returns {Promise<object>} The API response body ({ status, data, pagination }).
 */
export async function getJobs(params = {}) {
  const response = await apiClient.get('/jobs', { params })
  return response.data
}
