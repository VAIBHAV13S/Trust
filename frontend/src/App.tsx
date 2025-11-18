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
          <div className="min-h-screen bg-slate-950 text-white transition-colors duration-300 flex flex-col">
            <Navigation />
            <main className="flex-1">
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
                      <Suspense fallback={<div className="p-6">Loading leaderboard…</div>}>
                        <LazyLeaderboard />
                      </Suspense>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/match-history"
                  element={
                    <ProtectedRoute>
                      <Suspense fallback={<div className="p-6">Loading match history…</div>}>
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
      </Router>
      </ThemeProvider>
    </Provider>
  )
}

export default App
