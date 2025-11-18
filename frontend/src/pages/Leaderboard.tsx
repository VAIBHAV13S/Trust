import { useState } from 'react'
import { useLeaderboardStats } from '../hooks/useStats'
import { useSound } from '@/hooks/useSound'

const SORT_OPTIONS = [
  { value: 'earnings', label: 'Total Earnings' },
  { value: 'winrate', label: 'Win Rate' },
  { value: 'reputation', label: 'Reputation' },
]

const PERIOD_OPTIONS = [
  { value: 'all', label: 'All time' },
  { value: 'week', label: 'This week' },
  { value: 'day', label: 'Today' },
]

const Leaderboard: React.FC = () => {
  const [sort, setSort] = useState(SORT_OPTIONS[0].value)
  const [period, setPeriod] = useState(PERIOD_OPTIONS[0].value)
  const [page, setPage] = useState(1)
  const limit = 12

  const { data, total, loading, error, refresh } = useLeaderboardStats({
    sort,
    period,
    page,
    limit,
  })
  const playRefresh = useSound()

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Global Leaderboard</h1>
          <p className="text-sm text-slate-400">Ranked by earnings, reputation, and win rate.</p>
        </div>
        <button
          onClick={() => {
            refresh()
            playRefresh()
          }}
          className="px-4 py-2 text-sm border border-slate-700 rounded-lg hover:border-emerald-400 transition-transform transform hover:-translate-y-0.5"
        >
          Refresh
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              setPeriod(option.value)
              setPage(1)
            }}
            className={`px-3 py-2 rounded-lg text-sm transition ${
              period === option.value
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500'
                : 'bg-slate-800 border border-slate-700 text-slate-400'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <label className="text-xs uppercase tracking-widest text-slate-500">Sort</label>
        <select
          value={sort}
          onChange={(event) => {
            setSort(event.target.value)
            setPage(1)
          }}
          className="bg-slate-900 border border-slate-700 text-sm rounded-lg px-3 py-2"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {error && <div className="text-sm text-rose-300">{error}</div>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 uppercase text-xs tracking-widest border-b border-slate-700">
              <th className="py-3 px-4 text-left">Rank</th>
              <th className="py-3 px-4 text-left">Player</th>
              <th className="py-3 px-4 text-right">Earnings</th>
              <th className="py-3 px-4 text-right">Wins</th>
              <th className="py-3 px-4 text-right">Win rate</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  Loading leaderboard…
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-500">
                  No leaderboard data available.
                </td>
              </tr>
            ) : (
              data.map((entry, index) => (
                <tr key={entry.address} className="border-b border-slate-800 hover:bg-slate-800/60">
                  <td className="py-3 px-4 font-semibold text-emerald-300">#{(page - 1) * limit + index + 1}</td>
                  <td className="py-3 px-4">{entry.username}</td>
                  <td className="py-3 px-4 text-right font-semibold">{entry.totalTokens}</td>
                  <td className="py-3 px-4 text-right">{entry.wins}</td>
                  <td className="py-3 px-4 text-right">{(entry.winRate * 100).toFixed(1)}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>{`Page ${page} of ${Math.max(1, Math.ceil(total / limit))}`}</span>
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
            disabled={page >= Math.ceil(total / limit) || loading}
            className="px-3 py-1 rounded bg-slate-800 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
