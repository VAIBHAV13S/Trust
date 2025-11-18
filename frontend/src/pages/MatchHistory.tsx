import { useState } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useMatchHistory } from '@/hooks/useStats'

const formatChoice = (choice: number | undefined) => {
  if (choice === undefined || choice === null) return 'TBD'
  return choice === 0 ? 'Cooperate' : choice === 1 ? 'Betray' : 'Abstain'
}

const MatchHistory = () => {
  const address = useSelector((state: RootState) => state.auth.player?.walletAddress)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [opponent, setOpponent] = useState('')

  const { history, stats, total, loading, error, refresh } = useMatchHistory({
    address: address ?? '',
    page,
    limit: 12,
    search,
    opponent,
  })

  if (!address) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <p className="text-slate-400">Connect your wallet to view match history.</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Match History</h1>
        <p className="text-sm text-slate-400">Detailed outcomes with blockchain verification links.</p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(1)
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          placeholder="Search match id or username"
        />
        <input
          value={opponent}
          onChange={(e) => {
            setOpponent(e.target.value)
            setPage(1)
          }}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm"
          placeholder="Filter by opponent address"
        />
        <button
          onClick={refresh}
          className="px-3 py-2 border border-slate-700 rounded-lg text-sm hover:border-emerald-400"
        >
          Refresh
        </button>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-4">
          {[
            { label: 'Matches', value: stats.matches },
            { label: 'Wins', value: stats.wins },
            { label: 'Win rate', value: `${(stats.winRate * 100).toFixed(1)}%` },
            { label: 'Betrayal rate', value: `${(stats.betrayalRate * 100).toFixed(1)}%` },
          ].map((card) => (
            <div key={card.label} className="card border-slate-700">
              <p className="text-xs uppercase tracking-widest text-slate-500">{card.label}</p>
              <p className="text-xl font-semibold text-white">{card.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 uppercase text-xs tracking-widest border-b border-slate-700">
              <th className="py-3 px-4 text-left">Match</th>
              <th className="py-3 px-4 text-left">Opponent</th>
              <th className="py-3 px-4 text-left">Choice</th>
              <th className="py-3 px-4 text-left">Opponent Choice</th>
              <th className="py-3 px-4 text-left">Outcome</th>
              <th className="py-3 px-4 text-right">Tokens</th>
              <th className="py-3 px-4 text-right">Round</th>
              <th className="py-3 px-4 text-right">Verified</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  Loading match history…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-rose-300">
                  {error}
                </td>
              </tr>
            ) : history.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-slate-500">
                  No matches found.
                </td>
              </tr>
            ) : (
              history.map((entry) => (
                <tr key={entry.matchId} className="border-b border-slate-800 last:border-b-0">
                  <td className="py-3 px-4 font-mono">{entry.matchId}</td>
                  <td className="py-3 px-4">{entry.opponentUsername || entry.opponentAddress}</td>
                  <td className="py-3 px-4">{formatChoice(entry.choice)}</td>
                  <td className="py-3 px-4">{formatChoice(entry.opponentChoice)}</td>
                  <td className="py-3 px-4">{entry.outcome}</td>
                  <td className="py-3 px-4 text-right font-semibold">{entry.tokens}</td>
                  <td className="py-3 px-4 text-right">{entry.round}</td>
                  <td className="py-3 px-4 text-right">
                    <a
                      href={entry.verificationLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-300 underline decoration-dotted"
                    >
                      View
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{`Page ${page} of ${Math.max(1, Math.ceil(total / 12))}`}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((prev) => prev + 1)}
            disabled={loading || page * 12 >= total}
            className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default MatchHistory
