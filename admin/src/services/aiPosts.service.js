import { apiRequest } from './apiClient.js'
const path = 'admin/ai-posts'
export const getAIConfiguration = signal => apiRequest(`${path}/configuration`, { signal })
export const listAssistantPosts = (params, signal) => apiRequest(path, { params, signal })
export const getAssistantPost = id => apiRequest(`${path}/${id}`)
export const analyzePost = source => apiRequest(`${path}/analyze`, { method: 'POST', body: source })
export const savePostReview = (id, body) => apiRequest(`${path}/${id}`, { method: 'PATCH', body })
export const approvePost = (id, revision) => apiRequest(`${path}/${id}/approve`, { method: 'POST', body: { revision, confirmed: true } })
export const publishPost = (id, revision) => apiRequest(`${path}/${id}/publish`, { method: 'POST', body: { revision } })
export const deleteAssistantPost = (id, revision) => apiRequest(`${path}/${id}`, { method: 'DELETE', body: { revision, confirmed: true, scope: 'assistant-only' } })
export const reopenAssistantPost = (id, revision) => apiRequest(`${path}/${id}/reopen`, { method: 'POST', body: { revision, confirmed: true } })
export async function verifyPublicPost(post) {
  const response = await apiRequest(`${post.destination}/${encodeURIComponent(post.publicSlug)}`)
  if (String(response.data?._id) !== String(post.publicRecordId)) throw new Error('The public record could not be verified.')
  return response.data
}
