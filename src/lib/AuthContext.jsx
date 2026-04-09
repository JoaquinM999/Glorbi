/**
 * AuthContext.jsx
 *
 * Replaces the Base44-coupled AuthContext with a standard JWT flow.
 *
 * What changed:
 *  - Removed @base44/sdk imports
 *  - Removed app-params.js bootstrap
 *  - getMe() / logout() / redirectToLogin() now use src/api/auth.js
 *  - No more Base44 "app public settings" or "auth_required" error types
 *  - Auth state is derived purely from the presence of a valid JWT
 *
 * The <AuthProvider> still exposes the same shape so all consumer
 * components (useAuth, Sidebar logout button, etc.) work without changes.
 */
import React, { createContext, useState, useContext, useEffect } from 'react'
import { getMe, logout as apiLogout, redirectToLogin as apiRedirectToLogin, hasToken } from '@/api/auth'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)
  // Kept for API compatibility with existing consumers
  const [isLoadingPublicSettings] = useState(false)
  const [authError, setAuthError] = useState(null)

  useEffect(() => {
    checkUserAuth()
  }, [])

  const checkUserAuth = async () => {
    if (!hasToken()) {
      setIsLoadingAuth(false)
      setIsAuthenticated(false)
      setAuthError({ type: 'auth_required', message: 'No token found' })
      return
    }

    try {
      setIsLoadingAuth(true)
      const currentUser = await getMe()
      setUser(currentUser)
      setIsAuthenticated(true)
      setAuthError(null)
    } catch (error) {
      console.error('Auth check failed:', error)
      setIsAuthenticated(false)
      setUser(null)
      if (error.response?.status === 401 || error.response?.status === 403) {
        setAuthError({ type: 'auth_required', message: 'Session expired' })
      } else {
        setAuthError({ type: 'unknown', message: error.message || 'Auth check failed' })
      }
    } finally {
      setIsLoadingAuth(false)
    }
  }

  const logout = (shouldRedirect = true) => {
    setUser(null)
    setIsAuthenticated(false)
    apiLogout(shouldRedirect ? window.location.href : undefined)
  }

  const navigateToLogin = () => {
    apiRedirectToLogin(window.location.href)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings: null,
        logout,
        navigateToLogin,
        checkAppState: checkUserAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
