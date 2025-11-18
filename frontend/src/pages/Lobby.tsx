import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '../store'
import { setReady } from '../store/lobbySlice'
import { useLobbySocket } from '../hooks/useLobbySocket'
import { CountdownTimer } from '../components/CountdownTimer'
import { PlayerList } from '../components/PlayerList'

const Lobby: React.FC = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { setReady: setReadySocket } = useLobbySocket()
  const auth = useSelector((state: RootState) => state.auth)
  const lobby = useSelector((state: RootState) => state.lobby)
  const [buttonLoading, setButtonLoading] = useState(false)

  // Redirect to home if not connected
  useEffect(() => {
    if (!auth.isConnected) {
      navigate('/')
    }
  }, [auth.isConnected, navigate])

  // Listen for match started event
  useEffect(() => {
    const handleMatchStarted = (event: Event) => {
      const customEvent = event as CustomEvent
      const matchId = customEvent.detail?.matchId
      if (!matchId) return
      navigate(`/match/${matchId}`)
    }

    window.addEventListener('match-started', handleMatchStarted)
    return () => window.removeEventListener('match-started', handleMatchStarted)
  }, [navigate])

  // If a tournament is already in progress, backend will emit lobby-closed
  useEffect(() => {
    const handleLobbyClosed = (event: Event) => {
      const customEvent = event as CustomEvent
      const reason = customEvent.detail?.reason
      if (reason === 'tournament_in_progress') {
        // In a full UI we could show a nicer modal/toast; for now use alert
        alert('A tournament is already in progress. Please wait for the next one.')
        navigate('/')
      }
    }

    window.addEventListener('lobby-closed', handleLobbyClosed)
    return () => window.removeEventListener('lobby-closed', handleLobbyClosed)
  }, [navigate])

  const handleToggleReady = async () => {
    setButtonLoading(true)
    try {
      setReadySocket(!lobby.isReady)
      dispatch(setReady(!lobby.isReady))
    } catch (error) {
      console.error('Error toggling ready status:', error)
    } finally {
      setButtonLoading(false)
    }
  }

  if (!auth.player) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-center text-slate-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Waiting Room</h1>
          <p className="text-slate-400">Get ready for battle royale!</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Player Count Card */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-lg p-8 border border-slate-700 text-center">
              <p className="text-slate-400 mb-2 text-sm uppercase tracking-wider">Connected Players</p>
              <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-4">
                {lobby.connectedCount}/{lobby.maxPlayers}
              </div>
              <div className="w-full bg-slate-700 rounded-full h-2 mb-4">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(lobby.connectedCount / lobby.maxPlayers) * 100}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-sm">
                {lobby.maxPlayers - lobby.connectedCount} slots remaining
              </p>
            </div>
          </div>

          {/* Countdown Timer Card */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-lg p-8 border border-slate-700 text-center">
              <p className="text-slate-400 mb-4 text-sm uppercase tracking-wider">
                {lobby.isCountingDown ? 'Match Starts In' : 'Waiting For Players...'}
              </p>
              {lobby.isCountingDown ? (
                <CountdownTimer seconds={lobby.countdownSeconds} />
              ) : (
                <div className="text-4xl font-bold text-slate-500">-- : --</div>
              )}
            </div>
          </div>

          {/* Status Card */}
          <div className="lg:col-span-1">
            <div className="bg-slate-900 rounded-lg p-8 border border-slate-700">
              <p className="text-slate-400 mb-2 text-sm uppercase tracking-wider">Your Status</p>
              <div className="mb-6">
                <div
                  className={`text-2xl font-bold mb-2 ${
                    lobby.isReady ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {lobby.isReady ? '✓ Ready' : '◯ Not Ready'}
                </div>
                <p className="text-xs text-slate-400">
                  {auth.player.username} ({auth.player.reputation} reputation)
                </p>
              </div>
              <button
                onClick={handleToggleReady}
                disabled={buttonLoading}
                className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
                  lobby.isReady
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-purple-600 hover:bg-purple-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {buttonLoading ? 'Updating...' : lobby.isReady ? 'Unready' : 'Ready Up!'}
              </button>
            </div>
          </div>
        </div>

        {/* Player List */}
        <div className="mb-8">
          <PlayerList players={lobby.players} currentPlayerAddress={auth.player.walletAddress} />
        </div>

        {/* Info Section */}
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-purple-600 text-white font-bold text-sm">
                  1
                </div>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Wait for Players</p>
                <p className="text-xs text-slate-400 mt-1">Wait for 50 players or the timer to start the battle</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-pink-600 text-white font-bold text-sm">
                  2
                </div>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Get Paired</p>
                <p className="text-xs text-slate-400 mt-1">You'll be matched with another player for a 1v1 game</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-amber-600 text-white font-bold text-sm">
                  3
                </div>
              </div>
              <div>
                <p className="font-semibold text-white text-sm">Play & Earn</p>
                <p className="text-xs text-slate-400 mt-1">Make strategic decisions and earn tokens to advance</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Lobby
