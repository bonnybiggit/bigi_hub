import apiClient from './apiClient.js'

/**
 * Fetches jobs from the backend API.
 * @param {object} [params] - Optional query parameters (search, location, jobType, workType, experience, page, limit).
 * @returns {Promise<object>} The API response body ({ status, data, pagination }).
 */
export async function getJobs(params = {}, { signal } = {}) {
  const response = await apiClient.get('/jobs', { params, signal })
  return response.data
}

// Detail pages use the same active-record rules as their listing API.
export async function getJobBySlug(slug, { signal } = {}) {
  try {
    const response = await apiClient.get('/jobs/' + encodeURIComponent(slug), { signal })
    if (response.data.status !== 'ok' || !response.data.data) throw new Error('Invalid listing response')
    const item = response.data.data
    return { ...item, id: item._id ?? item.id }
  } catch (error) {
    if (error.response?.status === 404) return null
    throw error
  }
}
