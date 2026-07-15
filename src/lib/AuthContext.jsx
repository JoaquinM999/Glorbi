/**
 * AuthContext.jsx — FIXED
 *
 * Root cause of infinite loop (now removed):
 *   navigateToLogin() was called during component render. Since /login had no
 *   route, the app matched PageNotFound → same authError → navigateToLogin()
 *   → redirect → reload → same cycle, URL growing on every pass.
 *
 * Fix: this context only manages STATE. Navigation is handled declaratively
 * by <RequireAuth> in App.jsx using React Router's <Navigate> component,
 * which does not cause re-renders or loops.
 */
import React, { createContext, useState, useContext, useEffect } from 'react'
import { getMe, logout as apiLogout, hasToken } from '@/api/auth'

const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoadingAuth, setIsLoadingAuth] = useState(true)

  useEffect(() => {
    checkUserAuth()
  }, [])

  const checkUserAuth = async () => {
    if (!hasToken()) {
      setIsAuthenticated(false)
      setUser(null)
      setIsLoadingAuth(false)
      return
    }
    try {
      setIsLoadingAuth(true)
      const currentUser = await getMe()
      setUser(currentUser)
      setIsAuthenticated(true)
    } catch (err) {
      console.error('Auth check failed:', err)
      setUser(null)
      setIsAuthenticated(false)
      // Clear bad token so we don't retry on every visit
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('access_token')
      }
    } finally {
      setIsLoadingAuth(false)
    }
  }

  /** Re-run auth check after a successful login. */
  const refreshAuth = () => checkUserAuth()

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    apiLogout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        appPublicSettings: null,
        logout,
        refreshAuth,
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
