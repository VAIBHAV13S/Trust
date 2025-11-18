import { useEffect, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { RootState } from '@/store'
import { useOnChainData } from '@/hooks/useOnChainData'

const formatBalance = (value: bigint | null) => {
  if (value === null) return '—'
  return `${Number(value) / 1_000_000_000} OCT`
}

const OnChainDashboard = () => {
  const walletAddress = useSelector((state: RootState) => state.auth.player?.walletAddress)
  const {
    loading,
    error,
    gameState,
    events,
    walletBalance,
    leaderboard,
    refresh,
  } = useOnChainData(walletAddress)

  const matchHistory = useMemo(
    () =>
      events
        .slice()
        .sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0))
        .slice(0, 6)
        .map((event) => {
          const parsed = event.parsedJson || {}
          const matchId = parsed.match_id || parsed.matchId || event.objectId || 'Unknown'
          const players = [parsed.player1 || parsed.sender, parsed.player2].filter(Boolean)
          const winner = parsed.winner || parsed.result || 'TBD'
          const stake = parsed.stake || parsed.amount || parsed.tokens || '—'
          return {
            txHash: event.transactionDigest,
            description: parsed.action || parsed.type || event.moveEvent?.type || 'Match event',
            matchId,
            players,
            winner,
            stake,
            timestamp: event.timestampMs ? new Date(Number(event.timestampMs)) : null,
          }
        }),
    [events]
  )

  const transactions = useMemo(
    () =>
      events
        .filter((event) => event.transactionDigest)
        .slice()
        .sort((a, b) => (b.timestampMs ?? 0) - (a.timestampMs ?? 0))
        .slice(0, 8)
        .map((event) => ({
          hash: event.transactionDigest,
          action: event.parsedJson?.action || event.moveEvent?.type || 'Unknown action',
          timestamp: event.timestampMs ? new Date(Number(event.timestampMs)) : null,
        })),
    [events]
  )

  const totalStaked =
    gameState?.total_staked?.fields?.value ?? gameState?.totalStaked ?? gameState?.total_stake ?? 'N/A'
  const availableBalance =
    gameState?.available_balance?.fields?.value ?? gameState?.availableBalance ?? gameState?.balance ?? 'N/A'

  useEffect(() => {
    const interval = setInterval(() => {
      refresh()
    }, 30_000)
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="grid gap-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">On-chain Dashboard</h1>
          <p className="text-sm text-slate-400">{walletAddress ? walletAddress : 'Wallet not connected'}</p>
        </div>
        <button className="btn-secondary" onClick={refresh} disabled={loading}>
          Refresh data
        </button>
      </header>

      {error && <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-200">{error}</div>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm uppercase tracking-widest text-slate-500">Wallet balance</p>
          <p className="text-2xl font-semibold">{formatBalance(walletBalance)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm uppercase tracking-widest text-slate-500">Total staked</p>
          <p className="text-2xl font-semibold">{totalStaked}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <p className="text-sm uppercase tracking-widest text-slate-500">Available balance (Game)</p>
          <p className="text-2xl font-semibold">{availableBalance}</p>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-semibold">Match history (chain events)</h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">Latest {matchHistory.length}</span>
          </div>
          <div className="space-y-4">
            {matchHistory.map((match) => (
              <article key={match.txHash ?? match.matchId} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{match.description}</span>
                  {match.timestamp && <span>{match.timestamp.toLocaleTimeString()}</span>}
                </div>
                <div className="mt-2 text-sm">
                  <p className="text-slate-300">Match: {match.matchId}</p>
                  <p className="text-sm text-slate-400">Players: {match.players.join(' vs ') || 'N/A'}</p>
                  <p className="text-sm text-slate-400">Winner: {match.winner}</p>
                  <p className="text-sm text-slate-400">Stake: {match.stake}</p>
                  {match.txHash && (
                    <span className="text-xs text-indigo-300">TX: {match.txHash.slice(0, 8)}…{match.txHash.slice(-6)}</span>
                  )}
                </div>
              </article>
            ))}
            {!matchHistory.length && !loading && <p className="text-sm text-slate-500">No match events yet.</p>}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-xl font-semibold">Leaderboard (chain rewards)</h2>
              <span className="text-xs uppercase tracking-wide text-slate-500">Top {leaderboard.length}</span>
            </div>
            <div className="space-y-3">
              {leaderboard.map((entry, index) => (
                <div key={entry.address} className="flex items-center justify-between text-sm">
                  <span className="text-slate-200">#{index + 1} {entry.address.substring(0, 6)}…</span>
                  <span className="text-emerald-300">{entry.score}</span>
                </div>
              ))}
              {!leaderboard.length && <p className="text-xs text-slate-500">No leaderboard data yet.</p>}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <h2 className="text-xl font-semibold">Transaction feed</h2>
              <span className="text-xs uppercase tracking-wide text-slate-500">Latest {transactions.length}</span>
            </div>
            <div className="space-y-3 text-xs text-slate-300">
              {transactions.map((tx) => (
                <div key={tx.hash} className="flex flex-col gap-1 border-b border-slate-800/50 pb-2 last:border-b-0 last:pb-0">
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="font-semibold text-indigo-300">{tx.action}</span>
                    {tx.timestamp && <span>{tx.timestamp.toLocaleTimeString()}</span>}
                  </div>
                  <p className="truncate text-slate-400">{tx.hash}</p>
                </div>
              ))}
              {!transactions.length && <p>No transactions yet</p>}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default OnChainDashboard
