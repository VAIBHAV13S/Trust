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
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <div
            className="text-2xl font-bold gradient-primary bg-clip-text text-transparent cursor-pointer"
            onClick={() => navigate('/')}
          >
            TRUST
          </div>
          <div className="flex gap-3 text-sm text-slate-300">
            <button onClick={() => navigate('/leaderboard')} className="hover:text-indigo-300">
              Leaderboard
            </button>
            <button onClick={() => navigate('/match-history')} className="hover:text-indigo-300">
              Match History
            </button>
          </div>
        </div>

        {isConnected && player && (
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <div className="text-xs text-slate-400">
              <div>
                Tokens: {onChainData.walletBalance !== null && onChainData.walletBalance !== undefined
                  ? onChainData.walletBalance.toString()
                  : '—'}
              </div>
              <div>
                Prize pool: {onChainData.gameState?.total_staked?.fields?.value ?? '—'}
              </div>
            </div>
            <div className="text-sm flex flex-col">
              <span className="text-indigo-400">{player.username}</span>
              <span className="text-slate-400 text-xs">{player.walletAddress.slice(0, 6)}...</span>
            </div>
            <button onClick={handleDisconnect} className="btn-secondary text-sm">
              Disconnect
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navigation
