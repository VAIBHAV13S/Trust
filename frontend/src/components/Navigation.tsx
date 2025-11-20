import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { disconnect } from '@/store/authSlice'
import { RootState } from '@/store'
import { useOnChainData } from '@/hooks/useOnChainData'

const Navigation: React.FC = () => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { isConnected, player } = useSelector((state: RootState) => state.auth)

  const handleDisconnect = () => {
    dispatch(disconnect())
    navigate('/')
  }

  const onChainData = useOnChainData()

  return (
    <nav className="glass-panel mx-4 mt-4 mb-6 sticky top-4 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-8">
          <div
            className="text-2xl font-bold font-display text-gradient cursor-pointer tracking-wider"
            onClick={() => navigate('/')}
          >
            TRUST
          </div>
          <div className="flex gap-6 text-sm font-medium text-gray-400">
            <button onClick={() => navigate('/leaderboard')} className="hover:text-primary transition-colors">
              Leaderboard
            </button>
            <button onClick={() => navigate('/match-history')} className="hover:text-primary transition-colors">
              Match History
            </button>
          </div>
        </div>

        {isConnected && player && (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-6">
            <div className="text-xs text-gray-400 flex gap-4 bg-dark-800/50 px-4 py-2 rounded-lg border border-white/5">
              <div>
                <span className="text-gray-500 mr-2">Tokens:</span>
                <span className="text-primary font-mono">
                  {onChainData.walletBalance !== null && onChainData.walletBalance !== undefined
                    ? onChainData.walletBalance.toString()
                    : '—'}
                </span>
              </div>
              <div className="w-px bg-white/10"></div>
              <div>
                <span className="text-gray-500 mr-2">Pool:</span>
                <span className="text-secondary font-mono">
                  {onChainData.gameState?.total_staked?.fields?.value ?? '—'}
                </span>
              </div>
            </div>
            <div className="text-sm flex flex-col items-end">
              <span className="text-white font-bold">{player.username}</span>
              <span className="text-gray-500 text-xs font-mono">{player.walletAddress.slice(0, 6)}...{player.walletAddress.slice(-4)}</span>
            </div>
            <button onClick={handleDisconnect} className="btn-secondary text-xs py-2 px-4">
              Disconnect
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
