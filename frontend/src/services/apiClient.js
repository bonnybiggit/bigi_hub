import axios from 'axios'
import { resolveApiBaseUrl } from '../utils/apiBaseUrl.js'

const baseURL = resolveApiBaseUrl(import.meta.env?.VITE_API_BASE_URL, import.meta.env?.PROD ?? true)

const apiClient = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    Accept: 'application/json',
  },
})

export default apiClient
