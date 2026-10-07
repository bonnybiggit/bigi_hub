import { ApiError } from '../utils/apiError.js'
const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace(/\/$/, '')
export async function apiRequest(path, { method = 'GET', body, params = {}, signal } = {}) {
  const url = new URL(baseUrl + '/' + path.replace(/^\//, ''), window.location.origin)
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value))
  }
  const response = await fetch(url, { method, signal, credentials: 'include', headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('admin-session-expired'))
    const data = await response.json().catch(() => null)
    throw new ApiError(data?.message || 'API request failed. Please try again.', response.status)
  }
  return response.json()
}
export const getApi = (path, options) => apiRequest(path, options)
