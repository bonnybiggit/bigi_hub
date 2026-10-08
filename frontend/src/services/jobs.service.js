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

// The public API exposes listing only; match slugs exactly across pages.
export async function getJobBySlug(slug, { signal } = {}) {
  let page = 1
  let totalPages
  do {
    const response = await getJobs({ page, limit: 100 }, { signal })
    if (response.status !== 'ok' || !Array.isArray(response.data)) throw new Error('Invalid jobs response')
    const job = response.data.find(item => item.slug === slug)
    if (job) return { ...job, id: job._id ?? job.id }
    totalPages = response.pagination?.totalPages ?? 1
    page += 1
  } while (page <= totalPages)
  return null
}
