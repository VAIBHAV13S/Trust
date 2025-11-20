import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Provider } from 'react-redux'
import { Suspense, lazy } from 'react'
import store from '@/store'
import Home from '@/pages/Home'
import Lobby from '@/pages/Lobby'
import Match from '@/pages/Match'
import Profile from '@/pages/Profile'
import TournamentPage from '@/pages/Tournament'
import OnChainDashboard from '@/pages/OnChainDashboard'
const MatchHistory = lazy(() => import('@/pages/MatchHistory'))
const LazyLeaderboard = lazy(() => import('@/pages/Leaderboard'))
import ProtectedRoute from '@/components/ProtectedRoute'
import Navigation from '@/components/Navigation'
import NotificationCenter from '@/components/NotificationCenter'
import { ThemeProvider } from '@/contexts/ThemeContext'
import './index.css'

function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex flex-col relative overflow-hidden">
            {/* Background Glow Effects */}
            <div className="fixed inset-0 pointer-events-none z-0">
              <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse-glow" />
              <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-[120px] animate-pulse-glow animate-delay-200" />
            </div>

            <div className="relative z-10 flex flex-col min-h-screen">
              <Navigation />
              <main className="flex-1 container mx-auto px-4 py-8">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route
                    path="/lobby"
                    element={
                      <ProtectedRoute>
                        <Lobby />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/match/:matchId"
                    element={
                      <ProtectedRoute>
                        <Match />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<div className="p-6 text-center text-gray-400">Loading leaderboard...</div>}>
                          <LazyLeaderboard />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/match-history"
                    element={
                      <ProtectedRoute>
                        <Suspense fallback={<div className="p-6 text-center text-gray-400">Loading match history...</div>}>
                          <MatchHistory />
                        </Suspense>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/profile/:address"
                    element={
                      <ProtectedRoute>
                        <Profile />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/tournament"
                    element={
                      <ProtectedRoute>
                        <TournamentPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/onchain"
                    element={
                      <ProtectedRoute>
                        <OnChainDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
              <NotificationCenter />
            </div>
          </div>
        </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App
