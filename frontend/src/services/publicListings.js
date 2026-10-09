import apiClient from './apiClient.js'
import { publicCategory } from '../config/contentCategories.js'

export async function getPublicListings(destination, params = {}, { signal } = {}) {
  const response = await apiClient.get(publicCategory(destination).apiPath, { params, signal })
  const body = response.data
  if (body?.status !== 'ok' || !Array.isArray(body.data) || !body.pagination ||
    !Number.isInteger(body.pagination.total) || body.pagination.total < 0 ||
    !Number.isInteger(body.pagination.totalPages) || body.pagination.totalPages < 0) {
    throw new Error('Invalid listing response')
  }
  return body
}

export async function getPublicDetail(destination, slug, { signal } = {}) {
  try {
    const response = await apiClient.get(`${publicCategory(destination).apiPath}/${encodeURIComponent(slug)}`, { signal })
    if (response.data?.status !== 'ok' || !response.data.data) throw new Error('Invalid listing response')
    const item = response.data.data
    return { ...item, id: item._id ?? item.id }
  } catch (error) {
    if (error.response?.status === 404) return null
    throw error
  }
}
