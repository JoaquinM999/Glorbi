/**
 * App.jsx
 *
 * Changes from Base44 version:
 *  - Removed import of queryClientInstance from @base44 — now lives in @/lib/query-client
 *  - AuthProvider and useAuth now use the generic JWT-based implementation
 *  - Loading state and auth error handling are unchanged in behaviour
 *  All routing is unchanged.
 */
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from 'sonner'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import PageNotFound from './lib/PageNotFound'
import { AuthProvider, useAuth } from '@/lib/AuthContext'
import UserNotRegisteredError from '@/components/UserNotRegisteredError'

import AppLayout from '@/components/layout/AppLayout'
import { PeriodProvider } from '@/lib/PeriodContext'

import Dashboard from '@/pages/Dashboard'
import MarketPulse from '@/pages/MarketPulse'
import NewsSignals from '@/pages/NewsSignals'
import Screener from '@/pages/Screener'
import Settings from '@/pages/Settings'

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth()

  if (isLoadingPublicSettings || isLoadingAuth) {
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

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />
    } else if (authError.type === 'auth_required') {
      navigateToLogin()
      return null
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/market-pulse" element={<MarketPulse />} />
        <Route path="/news" element={<NewsSignals />} />
        <Route path="/screener" element={<Screener />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <PeriodProvider>
          <Router>
            <AuthenticatedApp />
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
