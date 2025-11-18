import React from 'react'

interface OnChainMatchHistoryProps {
  events: any[]
  loading: boolean
  onRefresh?: () => void
}

const OnChainMatchHistory: React.FC<OnChainMatchHistoryProps> = ({ events, loading, onRefresh }) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-xl font-semibold text-white">On-chain Match History</h2>
          <p className="text-slate-400 text-sm">Latest events emitted by the Move contract</p>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="px-3 py-1 text-sm bg-slate-800 border border-slate-600 rounded-lg hover:bg-slate-700"
          >
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <p className="text-slate-400">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="text-slate-400">No on-chain events found.</p>
      ) : (
        <ul className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
          {events.slice(0, 15).map((event: any, idx) => {
            const eventType = event.type?.split('::').pop() || 'Event'
            const json = event.parsedJson || {}
            return (
              <li key={`${event.id?.txDigest || idx}-${idx}`} className="bg-slate-800/80 border border-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold text-sm">{eventType}</span>
                  {event.id?.txDigest && (
                    <span className="text-xs text-slate-400 font-mono">
                      {event.id.txDigest.slice(0, 10)}...
                    </span>
                  )}
                </div>
                <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words">
                  {JSON.stringify(json, null, 2)}
                </pre>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default OnChainMatchHistory
