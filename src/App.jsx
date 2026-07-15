/**
 * App.jsx — FIXED
 *
 * Changes:
 * 1. Added a /login route rendered outside protected area
 * 2. Replaced the imperative navigateToLogin() call with a <RequireAuth>
 *    component that uses React Router's declarative <Navigate> — this is
 *    the correct pattern and stops the infinite redirect loop completely.
 * 3. Removed authError from AuthContext dependency (context only has state now)
 * 4. Loading screen shown while auth state is being determined
 */
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, Outlet, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import { PeriodProvider } from '@/lib/PeriodContext'
import PageNotFound from './lib/PageNotFound'

import AppLayout from '@/components/layout/AppLayout'
import Login from '@/pages/Login'
import Dashboard from '@/pages/Dashboard'
import MarketPulse from '@/pages/MarketPulse'
import NewsSignals from '@/pages/NewsSignals'
import Screener from '@/pages/Screener'
import Settings from '@/pages/Settings'

/**
 * Wraps protected routes. If the user is not authenticated, redirects to /login
 * and remembers where they were trying to go (state.from).
 *
 * Using <Navigate> here is declarative and does NOT cause infinite re-renders —
 * React Router handles it in one pass without re-mounting the component tree.
 */
function RequireAuth() {
  const { isAuthenticated, isLoadingAuth } = useAuth()
  const location = useLocation()

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-6">
        <div className="text-4xl font-mono font-medium text-foreground tracking-tighter animate-pulse">
          ◈ glorbi
        </div>
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border border-border" />
          <div className="absolute inset-0 rounded-full border border-transparent border-t-foreground animate-spin" />
        </div>
        <div className="text-[11px] font-mono text-muted-foreground/40 uppercase tracking-[2px]">
          Iniciando sesión
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    // Pass the current location so Login can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * If the user is already logged in and visits /login, redirect to dashboard.
 */
function PublicOnly() {
  const { isAuthenticated, isLoadingAuth } = useAuth()

  if (isLoadingAuth) return null

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PeriodProvider>
          <Router>
            <Routes>
              {/* Public route — only accessible when NOT logged in */}
              <Route element={<PublicOnly />}>
                <Route path="/login" element={<Login />} />
              </Route>

              {/* Protected routes — redirect to /login if not authenticated */}
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/market-pulse" element={<MarketPulse />} />
                  <Route path="/news" element={<NewsSignals />} />
                  <Route path="/screener" element={<Screener />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Router>
        </PeriodProvider>
        <Toaster />
        <SonnerToaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(0 0% 6.7%)',
              border: '1px solid hsl(0 0% 14%)',
              color: 'hsl(0 0% 100%)',
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '12px',
            },
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
