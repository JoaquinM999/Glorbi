/**
 * auth.js
 *
 * Replaces base44.auth.me(), base44.auth.logout(),
 * and base44.auth.redirectToLogin().
 *
 * Wire these functions to your own backend endpoints.
 * Expected backend routes (adjust paths as needed):
 *   POST /auth/login   → { access_token, user }
 *   GET  /auth/me      → { id, email, full_name, role }
 *   POST /auth/logout  → 200 OK
 */
import apiClient from './Apiclient'

/**
 * Fetch the currently authenticated user.
 * Throws if the token is invalid or expired (interceptor handles 401).
 */
export async function getMe() {
  const { data } = await apiClient.get('/auth/me')
  return data
}

/**
 * Login with email + password.
 * Stores the returned JWT in localStorage and returns the user object.
 */
export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token)
  }
  return data.user
}

/**
 * Log out: remove local token and optionally notify the backend.
 */
export async function logout(redirectUrl) {
  localStorage.removeItem('access_token')
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // Best-effort — ignore network errors on logout
  }
  if (redirectUrl) {
    window.location.href = redirectUrl
  } else {
    window.location.href = '/login'
  }
}

/**
 * Redirect the user to the login page.
 * Stores the current URL so you can redirect back after login.
 */
export function redirectToLogin(returnUrl) {
  const dest = returnUrl || window.location.href
  window.location.href = `/login?returnUrl=${encodeURIComponent(dest)}`
}

/**
 * Returns true if a JWT token exists in localStorage.
 * Does NOT validate expiry — that's the backend's job via /auth/me.
 */
export function hasToken() {
  return Boolean(localStorage.getItem('access_token'))
}