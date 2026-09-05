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
 * Consulta si el envío de emails está realmente activo en el backend.
 * Se usa para no mostrar UI relacionada a verificación de email si de
 * todos modos no va a llegar a ningún lado (sandbox de Resend sin dominio
 * propio verificado solo entrega al dueño de la cuenta).
 */
export async function getConfigStatus() {
  const { data } = await apiClient.get('/auth/config-status')
  return data
}

/**
 * Returns true if a JWT token exists in localStorage.
 */
export function hasToken() {
  return Boolean(localStorage.getItem('access_token'))
}

/**
 * Pide un link de recuperación de contraseña por email.
 * Siempre resuelve con éxito (el backend responde genérico por seguridad,
 * así nadie puede usar esto para averiguar qué emails están registrados).
 */
export async function forgotPassword(email) {
  const { data } = await apiClient.post('/auth/forgot-password', { email })
  return data
}

/**
 * Aplica una nueva contraseña usando el token recibido por email.
 */
export async function resetPassword(token, password) {
  const { data } = await apiClient.post('/auth/reset-password', { token, password })
  return data
}

/**
 * Confirma el email del usuario usando el token recibido por email.
 */
export async function verifyEmail(token) {
  const { data } = await apiClient.get(`/auth/verify-email?token=${encodeURIComponent(token)}`)
  return data
}

/**
 * Reenvía el email de verificación (requiere estar logueado).
 */
export async function resendVerification(email) {
  const { data } = await apiClient.post('/auth/resend-verification', { email })
  return data
}
