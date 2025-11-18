import express, { Request, Response } from 'express'
import { authMiddleware } from './auth'
import Player from '../models/Player'

const router = express.Router()

interface AuthRequest extends Request {
  user?: any
}

// Get leaderboard
router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0, sortBy = 'reputation' } = req.query

    const sortMap: any = {
      reputation: { reputation: -1 },
      earnings: { totalEarnings: -1 },
      wins: { matchesWon: -1 },
    }

    const sort = sortMap[sortBy as string] || sortMap.reputation

    const players = await Player.find()
      .sort(sort)
      .skip(Number(offset))
      .limit(Number(limit))
      .select('-__v')

    const total = await Player.countDocuments()

    const leaderboard = players.map((player, index) => ({
      rank: Number(offset) + index + 1,
      id: player._id,
      username: player.username,
      walletAddress: player.walletAddress,
      reputation: player.reputation,
      totalEarnings: player.totalEarnings,
      matchesWon: player.matchesWon,
      matchesPlayed: player.matchesPlayed,
      winRate: player.matchesPlayed > 0 ? ((player.matchesWon / player.matchesPlayed) * 100).toFixed(2) : 0,
    }))

    res.json({
      total,
      limit: Number(limit),
      offset: Number(offset),
      players: leaderboard,
    })
  } catch (error: any) {
    console.error('Leaderboard fetch error:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch leaderboard',
      code: 'LEADERBOARD_ERROR',
    })
  }
})

// Get player stats
router.get('/stats/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params

    const player = await Player.findOne({ walletAddress: address.toLowerCase() })

    if (!player) {
      return res.status(404).json({
        error: 'Player not found',
        code: 'PLAYER_NOT_FOUND',
      })
    }

    res.json({
      reputation: player.reputation,
      tokensStaked: player.tokensStaked,
      tokensAvailable: player.tokensAvailable,
      totalEarnings: player.totalEarnings,
      matchesPlayed: player.matchesPlayed,
      matchesWon: player.matchesWon,
      matchesLost: player.matchesPlayed - player.matchesWon,
      winRate: player.matchesPlayed > 0 ? ((player.matchesWon / player.matchesPlayed) * 100).toFixed(2) : 0,
      cooperationRate: player.cooperationRate,
      betrayalRate: player.betrayalRate,
      abstentionRate: player.matchesPlayed > 0 ? (100 - player.cooperationRate - player.betrayalRate).toFixed(2) : 0,
      joinedAt: player.createdAt,
      lastActiveAt: player.lastActiveAt,
    })
  } catch (error: any) {
    console.error('Stats fetch error:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch stats',
      code: 'STATS_ERROR',
    })
  }
})

// Get top players by metric
router.get('/top/:metric', async (req: Request, res: Response) => {
  try {
    const { metric } = req.params
    const { limit = 10 } = req.query

    const metricMap: any = {
      reputation: { field: 'reputation', label: 'Reputation' },
      earnings: { field: 'totalEarnings', label: 'Total Earnings' },
      wins: { field: 'matchesWon', label: 'Matches Won' },
    }

    const metricConfig = metricMap[metric]
    if (!metricConfig) {
      return res.status(400).json({
        error: 'Invalid metric',
        code: 'INVALID_METRIC',
      })
    }

    const topPlayers = await Player.find()
      .sort({ [metricConfig.field]: -1 })
      .limit(Number(limit))
      .select('username walletAddress reputation totalEarnings matchesWon matchesPlayed')

    const result = topPlayers.map((player, index) => ({
      rank: index + 1,
      username: player.username,
      value: player[metricConfig.field as keyof typeof player],
    }))

    res.json({
      metric: metricConfig.label,
      players: result,
    })
  } catch (error: any) {
    console.error('Top players error:', error)
    res.status(500).json({
      error: error.message || 'Failed to fetch top players',
      code: 'TOP_PLAYERS_ERROR',
    })
  }
})

export default router
