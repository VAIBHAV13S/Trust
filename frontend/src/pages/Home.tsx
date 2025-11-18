import React from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { RootState } from '@/store'
import ConnectWalletButton from '@/components/ConnectWalletButton'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { isConnected } = useSelector((state: RootState) => state.auth)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-950 flex items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-6xl font-bold gradient-primary bg-clip-text text-transparent mb-4">TRUST</h1>
        <p className="text-2xl text-slate-300 mb-8">50-Player Blockchain Battle Royale</p>
        <p className="text-lg text-slate-400 mb-12">
          Make strategic decisions, compete in real-time matches, and climb the leaderboard. Every choice matters.
        </p>

        <div className="mb-12">
          <ConnectWalletButton />
        </div>

        {isConnected && (
          <button
            onClick={() => navigate('/lobby')}
            className="btn-primary px-6 py-3 rounded-lg font-semibold"
          >
            Enter Lobby
          </button>
        )}

        <div className="grid grid-cols-3 gap-6 mt-16">
          <div className="card">
            <div className="text-3xl mb-2">⚔️</div>
            <h3 className="font-bold mb-2">50 Players</h3>
            <p className="text-sm text-slate-400">Battle in a tournament-style bracket</p>
          </div>
          <div className="card">
            <div className="text-3xl mb-2">💎</div>
            <h3 className="font-bold mb-2">Token Staking</h3>
            <p className="text-sm text-slate-400">Risk tokens, win big rewards</p>
          </div>
          <div className="card">
            <div className="text-3xl mb-2">🔗</div>
            <h3 className="font-bold mb-2">On-Chain</h3>
            <p className="text-sm text-slate-400">Fully transparent game logic</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Home
