/**
 * auth.js
 *
 * Replaces base44.auth.* methods with standard JWT calls to your own backend.
 *
 * Backend routes expected:
 *   POST /auth/register → { access_token, user }
 *   POST /auth/login    → { access_token, user }
 *   GET  /auth/me       → { id, email, full_name, role, ... }
 *   POST /auth/logout   → 200 OK
 */
import apiClient from './apiClient'

/**
 * Register a new user.
 * Stores the JWT and returns the user object.
 */
export async function register(email, password, fullName) {
  const { data } = await apiClient.post('/auth/register', {
    email,
    password,
    full_name: fullName || undefined,
  })
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token)
  }
  return data.user
}

/**
 * Login with email + password.
 * Stores the JWT and returns the user object.
 */
export async function login(email, password) {
  const { data } = await apiClient.post('/auth/login', { email, password })
  if (data.access_token) {
    localStorage.setItem('access_token', data.access_token)
  }
  return data.user
}

/**
 * Fetch the currently authenticated user from the backend.
 * Throws on 401/403 — the Axios interceptor in apiClient will clear the token.
 */
export async function getMe() {
  const { data } = await apiClient.get('/auth/me')
  return data
}

/**
 * Log out: remove local token and notify the backend.
 * The redirect is handled by the caller (AuthContext or Sidebar).
 */
export async function logout() {
  localStorage.removeItem('access_token')
  try {
    await apiClient.post('/auth/logout')
  } catch {
    // Best-effort — ignore errors on logout
  }
  window.location.href = '/login'
}

/**
 * Returns true if a JWT token exists in localStorage.
 */
export function hasToken() {
  return Boolean(localStorage.getItem('access_token'))
}
