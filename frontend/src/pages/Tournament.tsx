import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '@/utils/api'

interface TournamentMatch {
  matchNumber: number
  matchId?: string
  player1: string
  player1Username: string
  player1Reputation: number
  player2?: string | null
  player2Username?: string | null
  player2Reputation?: number | null
  status: 'pending' | 'in-progress' | 'completed'
  winner?: string | null
  bye?: boolean
}

interface TournamentRound {
  roundNumber: number
  matches: TournamentMatch[]
}

interface RewardInfo {
  address: string
  amount: number
}

interface TournamentMetrics {
  totalTokensStaked: number
  prizePool: number
  reputationBonuses: Record<string, number>
  winnerReward?: RewardInfo
  runnerUpReward?: RewardInfo
}

interface TournamentState {
  _id: string
  status: 'pending' | 'in_progress' | 'completed'
  currentRound: number
  rounds: TournamentRound[]
  metrics: TournamentMetrics
}

const statusColorMap: Record<TournamentState['status'], string> = {
  pending: 'text-amber-300',
  in_progress: 'text-indigo-400',
  completed: 'text-emerald-400',
}

const TournamentPage = () => {
  const [tournament, setTournament] = useState<TournamentState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTournament = useCallback(async () => {
    try {
      setIsLoading(true)
      const { data } = await apiClient.get<TournamentState>('/tournaments/current')
      setTournament(data)
      setError(null)
    } catch (err: any) {
      console.error('Failed to load tournament:', err)
      setError(err?.response?.data?.error || 'Unable to load tournament state')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTournament()

    const handleTournamentUpdate = (event: Event) => {
      const detail = (event as CustomEvent<TournamentState>).detail
      if (detail) {
        setTournament(detail)
      }
    }

    const handleRoundSeeded = () => {
      fetchTournament()
    }

    window.addEventListener('tournament-updated', handleTournamentUpdate)
    window.addEventListener('tournament-round-seeded', handleRoundSeeded)

    return () => {
      window.removeEventListener('tournament-updated', handleTournamentUpdate)
      window.removeEventListener('tournament-round-seeded', handleRoundSeeded)
    }
  }, [fetchTournament])

  if (isLoading) {
    return <div className="p-6">Loading tournament bracket…</div>
  }

  if (error) {
    return <div className="p-6 text-amber-300">{error}</div>
  }

  if (!tournament) {
    return <div className="p-6">No active tournament right now.</div>
  }

  const stats = tournament.metrics || {}
  const totalRounds = tournament.rounds.length
  const completedRounds = Math.min(totalRounds, tournament.currentRound - 1)
  const progressPercent = totalRounds ? Math.min(100, Math.round((completedRounds / totalRounds) * 100)) : 0

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Tournament Bracket</h1>
        <p className="text-sm text-slate-400">
          Status:{' '}
          <span className={statusColorMap[tournament.status]}>{tournament.status.replace('_', ' ')}</span>
        </p>
        <p className="text-sm text-slate-400">Current round: {tournament.currentRound}</p>
      </header>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 space-y-4">
        <div className="flex items-center justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Total tokens staked</p>
            <p className="text-2xl font-semibold">{stats.totalTokensStaked ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Prize pool (weighted)</p>
            <p className="text-2xl font-semibold">{stats.prizePool ?? 0}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Winner reward</p>
            <p className="text-sm font-semibold text-emerald-300">
              {stats.winnerReward ? `${stats.winnerReward.address} (${stats.winnerReward.amount})` : 'TBD'}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-widest text-slate-500">Runner-up reward</p>
            <p className="text-sm font-semibold text-indigo-300">
              {stats.runnerUpReward ? `${stats.runnerUpReward.address} (${stats.runnerUpReward.amount})` : 'Pending'}
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Round progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div style={{ width: `${progressPercent}%` }} className="h-full bg-emerald-400" />
          </div>
        </div>
      </section>

      {tournament.rounds.map((round) => (
        <section key={`round-${round.roundNumber}`} className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <h2 className="text-xl font-semibold">Round {round.roundNumber}</h2>
            <span className="text-xs uppercase tracking-wide text-slate-500">{round.matches.length} matches</span>
          </div>

          <div className="space-y-3">
            {round.matches.map((match) => (
              <article
                key={`match-${match.matchNumber}-${match.matchId ?? Math.random()}`}
                className={`rounded-xl border p-4 ${
                  match.status === 'completed' ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-slate-800 bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Match #{match.matchNumber}</span>
                  <span className="capitalize">{match.status.replace('-', ' ')}</span>
                </div>

                <div className="mt-3 grid gap-2 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span className={match.winner === match.player1 ? 'text-emerald-300' : 'text-slate-100'}>
                      {match.player1Username} ({match.player1Reputation})
                    </span>
                    <span className="text-slate-500">vs</span>
                    <span className={match.winner === match.player2 ? 'text-emerald-300 text-right' : 'text-slate-200 text-right'}>
                      {match.player2Username ?? 'Waiting for opponent'} ({match.player2Reputation ?? '—'})
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className={match.matchId ? 'text-indigo-300' : 'text-slate-600'}>
                      {match.matchId ?? 'Pending match assignment'}
                    </span>
                    {match.bye && <span className="text-amber-300">Bye round</span>}
                  </div>
                </div>

                {match.status === 'completed' && match.winner && (
                  <p className="mt-3 text-xs text-emerald-300">Winner: {match.winner === match.player1 ? match.player1Username : match.player2Username}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

export default TournamentPage
