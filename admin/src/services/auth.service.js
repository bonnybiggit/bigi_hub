import { apiRequest } from './apiClient.js'
export const getSession = (signal) => apiRequest('admin/auth/me', { signal })
export const loginAdmin = (email, password) => apiRequest('admin/auth/login', { method: 'POST', body: { email, password } })
export const logoutAdmin = () => apiRequest('admin/auth/logout', { method: 'POST' })
