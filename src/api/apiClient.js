/**
 * apiClient.js
 *
 * Axios instance for all backend communication.
 *
 * Base URL strategy:
 *  - If VITE_API_URL is set (production / explicit override) → use it directly
 *  - If not set → use '' (empty string), which means relative URLs.
 *    The Vite dev server proxy in vite.config.js then forwards /auth and /api
 *    to http://localhost:3001 automatically, avoiding CORS in development.
 *
 * In production on Vercel/Render, always set VITE_API_URL to your backend URL.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

// ── Attach JWT to every request ───────────────────────────────────────────────
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Handle 401 — clear token and redirect to login ────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token')
      // Guard: only redirect if not already on the login page
      // (prevents a redirect loop when /auth/me returns 401 from the Login page)
      if (
        typeof window !== 'undefined' &&
        !window.location.pathname.startsWith('/login')
      ) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient
export { apiClient }
