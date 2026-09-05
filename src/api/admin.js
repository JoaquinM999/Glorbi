/**
 * admin.js - API client for admin operations
 */
import apiClient from './Apiclient'

// Usuarios
export const fetchAllUsers = () => apiClient.get('/api/admin/users')

export const fetchUser = (userId) => apiClient.get(`/api/admin/users/${userId}`)

export const createUser = (email, password, full_name, role = 'user') =>
  apiClient.post('/api/admin/users', { email, password, full_name, role })

export const updateUser = (userId, updates) =>
  apiClient.patch(`/api/admin/users/${userId}`, updates)

export const deleteUser = (userId) =>
  apiClient.delete(`/api/admin/users/${userId}`)

export const updateUserPassword = (userId, password) =>
  apiClient.patch(`/api/admin/users/${userId}/password`, { password })

// Credenciales
export const fetchUserCredentials = (userId) =>
  apiClient.get(`/api/admin/users/${userId}/credentials`)

export const deleteUserCredentials = (userId) =>
  apiClient.delete(`/api/admin/users/${userId}/credentials`)

// Stats
export const fetchAdminStats = () => apiClient.get('/api/admin/stats')
