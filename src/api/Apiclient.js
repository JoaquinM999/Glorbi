/**
 * apiClient.js
 *
 * Generic Axios instance that replaces the proprietary @base44/sdk client.
 * All requests attach a Bearer JWT taken from localStorage so your own
 * backend can validate it with any standard JWT library.
 *
 * Environment variable required:
 *   VITE_API_URL=https://your-backend.example.com
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request if present
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// Global 401 handler — clears token and redirects to /login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient