import { apiRequest } from './apiClient.js'
export const listJobs = (params, signal) => apiRequest('admin/jobs', { params, signal })
export const createJob = body => apiRequest('admin/jobs', { method: 'POST', body })
export const updateJob = (id, body) => apiRequest(`admin/jobs/${id}`, { method: 'PATCH', body })
export const deleteJob = id => apiRequest(`admin/jobs/${id}`, { method: 'DELETE' })
