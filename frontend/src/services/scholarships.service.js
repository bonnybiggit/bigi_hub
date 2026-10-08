import apiClient from './apiClient.js'

/**
 * Fetches scholarships from the backend API.
 * @param {object} [params] - Optional query parameters (search, country, eligibility, location, level, page, limit).
 * @returns {Promise<object>} The API response body ({ status, data, pagination }).
 */
export async function getScholarships(params = {}, { signal } = {}) {
  const response = await apiClient.get('/scholarships', { params, signal })
  return response.data
}

// The public API exposes listing only; match slugs exactly across pages.
export async function getScholarshipBySlug(slug, { signal } = {}) {
  let page = 1
  let totalPages
  do {
    const response = await getScholarships({ page, limit: 100 }, { signal })
    if (response.status !== 'ok' || !Array.isArray(response.data)) throw new Error('Invalid scholarships response')
    const scholarship = response.data.find(item => item.slug === slug)
    if (scholarship) return { ...scholarship, id: scholarship._id ?? scholarship.id }
    totalPages = response.pagination?.totalPages ?? 1
    page += 1
  } while (page <= totalPages)
  return null
}
