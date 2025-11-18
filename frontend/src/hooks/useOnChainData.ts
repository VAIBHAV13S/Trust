import { useCallback, useEffect, useMemo, useState } from 'react'
import { getGameState, getMatchEvents } from '@/services/game-contract'
import { oneChainClient } from '@/services/onechain-client'

const CACHE_TTL_MS = 15_000
const cache = new Map<string, { timestamp: number; payload: any }>()

const cachedCall = async <T>(key: string, fn: () => Promise<T>) => {
  const existing = cache.get(key)
  const now = Date.now()
  if (existing && now - existing.timestamp < CACHE_TTL_MS) {
    return existing.payload
  }

  const payload = await fn()
  cache.set(key, { timestamp: now, payload })
  return payload
}

export interface LeaderboardEntry {
  address: string
  score: number
}

export interface OnChainDataState {
  loading: boolean
  error: string | null
  gameState: any | null
  events: any[]
  walletBalance: bigint | null
  leaderboard: LeaderboardEntry[]
  refresh: () => Promise<void>
}

const OCT_COIN_TYPE = '0x2::oct::OCT'

export const useOnChainData = (ownerAddress?: string | null): OnChainDataState => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameState, setGameState] = useState<any | null>(null)
  const [events, setEvents] = useState<any[]>([])
  const [walletBalance, setWalletBalance] = useState<bigint | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [stateResult, eventResult] = await Promise.all([
        cachedCall('gameState', () => getGameState()),
        cachedCall('matchEvents', () => getMatchEvents()),
      ])
      const gameStateFields = (stateResult as any)?.data?.content?.fields ?? null
      setGameState(gameStateFields)
      setEvents(eventResult ?? [])

      if (ownerAddress) {
        const coins = await oneChainClient.getCoins({ owner: ownerAddress, coinType: OCT_COIN_TYPE })
        const total = coins.data.reduce((sum: bigint, coin: any) => sum + BigInt(coin.balance || 0), BigInt(0))
        setWalletBalance(total)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load on-chain data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [ownerAddress])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const scores = new Map<string, number>()

    events.forEach((event) => {
      const json = event.parsedJson || {}
      const player1 = json.player1 || json.sender || event.sender
      const player2 = json.player2
      const p1Score = Number(json.player1_reward || json.reward || 0)
      const p2Score = Number(json.player2_reward || 0)

      if (player1) {
        scores.set(player1, (scores.get(player1) || 0) + p1Score)
      }
      if (player2) {
        scores.set(player2, (scores.get(player2) || 0) + p2Score)
      }
    })

    return Array.from(scores.entries())
      .map(([address, score]) => ({ address, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [events])

  return {
    loading,
    error,
    gameState,
    events,
    walletBalance,
    leaderboard,
    refresh: fetchData,
  }
}
