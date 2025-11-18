import React from 'react'
import { LobbyPlayer } from '../store/lobbySlice'

interface PlayerListProps {
  players: LobbyPlayer[]
  currentPlayerAddress?: string
}

const getAvatarColor = (address: string): string => {
  const colors = [
    'bg-red-500',
    'bg-blue-500',
    'bg-green-500',
    'bg-yellow-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-cyan-500',
  ]
  const hash = address.charCodeAt(0) + address.charCodeAt(address.length - 1)
  return colors[hash % colors.length]
}

export const PlayerList: React.FC<PlayerListProps> = ({ players, currentPlayerAddress }) => {
  const sortedPlayers = [...players].sort((a, b) => b.reputation - a.reputation)

  return (
    <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
      <h2 className="text-xl font-bold mb-4 text-white">Connected Players</h2>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {sortedPlayers.map((player, index) => (
          <div
            key={player.address}
            className={`flex items-center justify-between p-3 rounded-lg transition-all ${
              player.address === currentPlayerAddress
                ? 'bg-purple-900 border border-purple-500'
                : 'bg-slate-800 border border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 flex-1">
              <div
                className={`w-10 h-10 rounded-full ${getAvatarColor(
                  player.address
                )} flex items-center justify-center text-white font-bold`}
              >
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{player.username}</p>
                <p className="text-xs text-slate-400 truncate">
                  {player.address.slice(0, 6)}...{player.address.slice(-4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-amber-400">{player.reputation}</p>
                <p className="text-xs text-slate-400">Rep</p>
              </div>
            </div>
            {player.isReady && (
              <div className="ml-2 px-2 py-1 bg-green-900 rounded text-xs font-semibold text-green-300">
                ✓ Ready
              </div>
            )}
          </div>
        ))}
      </div>
      {players.length === 0 && (
        <p className="text-center text-slate-400 py-8">Waiting for players to join...</p>
      )}
    </div>
  )
}
