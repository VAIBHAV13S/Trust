import { useCallback, useEffect, useState } from 'react'
import apiClient from '@/utils/api'

export interface LeaderboardEntry {
  address: string
  username: string
  reputation: number
  totalTokens: number
  wins: number
  matches: number
  winRate: number
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[]
  total: number
  page: number
  limit: number
  sort: string
  period: string
}

export interface MatchHistoryEntry {
  matchId: string
  opponentAddress: string
  opponentUsername: string | null
  choice: number
  opponentChoice: number
  outcome: string
  tokens: number
  round: number
  timestamp: string | null
  verificationLink: string
}

export interface MatchHistoryStats {
  matches: number
  wins: number
  winRate: number
  betrayalRate: number
  tokens: number
}

export interface MatchHistoryResponse {
  history: MatchHistoryEntry[]
  total: number
  page: number
  limit: number
  stats: MatchHistoryStats
}

export const useLeaderboardStats = (params: {
  sort: string
  period: string
  page: number
  limit: number
}) => {
  const [data, setData] = useState<LeaderboardEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<LeaderboardResponse>('/stats/leaderboard', {
        params,
      })
      setData(data.data)
      setTotal(data.total)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load leaderboard')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { data, total, loading, error, refresh: fetch }
}

export const useMatchHistory = (params: {
  address: string
  page: number
  limit: number
  search: string
  opponent: string
}) => {
  const [history, setHistory] = useState<MatchHistoryEntry[]>([])
  const [stats, setStats] = useState<MatchHistoryStats | null>(null)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetch = useCallback(async () => {
    if (!params.address) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await apiClient.get<MatchHistoryResponse>('/stats/match-history', {
        params,
      })
      setHistory(data.history)
      setStats(data.stats)
      setTotal(data.total)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load match history')
    } finally {
      setLoading(false)
    }
  }, [params])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { history, stats, total, loading, error, refresh: fetch }
}
