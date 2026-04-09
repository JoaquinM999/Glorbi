/**
 * entities.js
 *
 * Replaces the proprietary base44.entities ORM.
 * Previously used patterns like:
 *   base44.entities.UserSettings.filter({ created_by: email })
 *   base44.entities.UserSettings.update(id, data)
 *   base44.entities.UserSettings.create(data)
 *
 * This module maps those calls to standard REST endpoints on your backend.
 *
 * Expected backend routes:
 *   GET    /api/user-settings?created_by=:email  → array of records
 *   POST   /api/user-settings                    → created record
 *   PUT    /api/user-settings/:id                → updated record
 *   DELETE /api/user-settings/:id                → 204
 */
import apiClient from './Apiclient'

/**
 * Factory that builds a CRUD helper for a given resource name.
 * The resource name is lowercased and hyphenated to form the URL path.
 *
 * Usage:
 *   const UserSettings = createEntity('user-settings')
 *   const settings = await UserSettings.filter({ created_by: 'user@example.com' })
 *   await UserSettings.create({ binance_api_key: '...' })
 *   await UserSettings.update('abc123', { binance_api_key: '...' })
 */
function createEntity(resourcePath) {
  return {
    async filter(params = {}) {
      const { data } = await apiClient.get(`/api/${resourcePath}`, { params })
      return data
    },

    async getById(id) {
      const { data } = await apiClient.get(`/api/${resourcePath}/${id}`)
      return data
    },

    async create(payload) {
      const { data } = await apiClient.post(`/api/${resourcePath}`, payload)
      return data
    },

    async update(id, payload) {
      const { data } = await apiClient.put(`/api/${resourcePath}/${id}`, payload)
      return data
    },

    async delete(id) {
      await apiClient.delete(`/api/${resourcePath}/${id}`)
    },
  }
}

export const UserSettings = createEntity('user-settings')

export const entities = { UserSettings }
export default entities