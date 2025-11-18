import { Router, Request, Response } from 'express'
import Match from '../models/Match'
import Player from '../models/Player'

const router = Router()

const PERIOD_MAP: Record<string, number | null> = {
  all: null,
  day: 1,
  week: 7,
}

const buildPeriodFilter = (period: string) => {
  const days = PERIOD_MAP[period] ?? null
  if (!days) return {}
  const since = new Date()
  since.setDate(since.getDate() - days)
  return { resolvedAt: { $gte: since } }
}

router.get('/leaderboard', async (req: Request, res: Response) => {
  try {
    const sortKey = (req.query.sort as string) || 'earnings'
    const period = (req.query.period as string) || 'all'
    const limit = Math.min(100, Number(req.query.limit) || 20)
    const page = Math.max(1, Number(req.query.page) || 1)

    const periodFilter = buildPeriodFilter(period)
    const baseMatch = { status: 'resolved', ...periodFilter }

    const pipeline = [
      { $match: baseMatch },
      {
        $project: {
          entries: [
            {
              address: '$player1Address',
              tokens: '$player1TokensEarned',
              winner: { $eq: ['$winner', 'player1'] },
            },
            {
              address: '$player2Address',
              tokens: '$player2TokensEarned',
              winner: { $eq: ['$winner', 'player2'] },
            },
          ],
        },
      },
      { $unwind: '$entries' },
      {
        $group: {
          _id: '$entries.address',
          totalTokens: { $sum: '$entries.tokens' },
          wins: { $sum: { $cond: ['$entries.winner', 1, 0] } },
          matches: { $sum: 1 },
        },
      },
      {
        $project: {
          totalTokens: 1,
          wins: 1,
          matches: 1,
          winRate: {
            $cond: [{ $eq: ['$matches', 0] }, 0, { $divide: ['$wins', '$matches'] }],
          },
        },
      },
    ]

    const entries = await Match.aggregate(pipeline)
    const addresses = entries.map((entry) => entry._id)
    const players = await Player.find({ walletAddress: { $in: addresses } })

    const merged = entries.map((entry) => {
      const player = players.find((p) => p.walletAddress.toLowerCase() === entry._id.toLowerCase())
      return {
        address: entry._id,
        username: player?.username ?? `${entry._id.slice(0, 6)}...`,
        reputation: player?.reputation ?? 0,
        totalTokens: entry.totalTokens,
        wins: entry.wins,
        matches: entry.matches,
        winRate: entry.winRate,
      }
    })

    const sorted = merged.sort((a, b) => {
      if (sortKey === 'reputation') return b.reputation - a.reputation
      if (sortKey === 'winrate') return b.winRate - a.winRate
      return b.totalTokens - a.totalTokens
    })

    const start = (page - 1) * limit
    const paged = sorted.slice(start, start + limit)

    res.json({
      data: paged,
      total: sorted.length,
      page,
      limit,
      sort: sortKey,
      period,
    })
  } catch (error) {
    console.error('Leaderboard fetch failed', error)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

router.get('/match-history', async (req: Request, res: Response) => {
  try {
    const address = (req.query.address as string)?.toLowerCase()
    if (!address) return res.status(400).json({ error: 'Wallet address required' })

    const limit = Math.min(50, Number(req.query.limit) || 10)
    const page = Math.max(1, Number(req.query.page) || 1)
    const search = (req.query.search as string) || ''
    const opponent = (req.query.opponent as string)?.toLowerCase() || ''

    const baseMatch: any = {
      status: 'resolved',
      $or: [{ player1Address: address }, { player2Address: address }],
    }

    if (search) {
      const regex = new RegExp(search, 'i')
      baseMatch.$or.push({ matchId: regex }, { player1Username: regex }, { player2Username: regex })
    }

    if (opponent) {
      baseMatch.$or.push({ player1Address: opponent }, { player2Address: opponent })
    }

    const matches = await Match.find(baseMatch)
      .sort({ resolvedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)

    const total = await Match.countDocuments(baseMatch)

    const statsPipeline = [
      { $match: baseMatch },
      {
        $project: {
          entries: [
            {
              address: '$player1Address',
              choice: '$player1Choice',
              tokens: '$player1TokensEarned',
              isWinner: { $eq: ['$winner', 'player1'] },
            },
            {
              address: '$player2Address',
              choice: '$player2Choice',
              tokens: '$player2TokensEarned',
              isWinner: { $eq: ['$winner', 'player2'] },
            },
          ],
        },
      },
      { $unwind: '$entries' },
      { $match: { 'entries.address': address } },
      {
        $group: {
          _id: '$entries.address',
          matches: { $sum: 1 },
          wins: { $sum: { $cond: ['$entries.isWinner', 1, 0] } },
          betrayals: { $sum: { $cond: [{ $eq: ['$entries.choice', 1] }, 1, 0] } },
          tokens: { $sum: '$entries.tokens' },
        },
      },
      {
        $project: {
          matches: 1,
          wins: 1,
          tokens: 1,
          winRate: { $cond: [{ $eq: ['$matches', 0] }, 0, { $divide: ['$wins', '$matches'] }] },
          betrayalRate: { $cond: [{ $eq: ['$matches', 0] }, 0, { $divide: ['$betrayals', '$matches'] }] },
        },
      },
    ]

    const [statsResult] = await Match.aggregate(statsPipeline)

    const history = matches.map((match) => {
      const isPlayer1 = match.player1Address.toLowerCase() === address
      const opponentAddress = isPlayer1 ? match.player2Address : match.player1Address
      const opponentUsername = isPlayer1 ? match.player2Username : match.player1Username
      const choice = isPlayer1 ? match.player1Choice : match.player2Choice
      const opponentChoice = isPlayer1 ? match.player2Choice : match.player1Choice
      const tokens = isPlayer1 ? match.player1TokensEarned : match.player2TokensEarned
      const outcome = match.winner === 'tie' ? 'Tie' : match.winner === (isPlayer1 ? 'player1' : 'player2') ? 'Win' : 'Loss'
      return {
        matchId: match.matchId,
        opponentAddress,
        opponentUsername,
        choice,
        opponentChoice,
        outcome,
        tokens,
        round: match.round,
        timestamp: match.resolvedAt,
        verificationLink: `https://explorer.sui.io/transactions/${match.matchId}`,
      }
    })

    res.json({
      history,
      total,
      page,
      limit,
      stats: {
        matches: statsResult?.matches ?? 0,
        wins: statsResult?.wins ?? 0,
        winRate: statsResult?.winRate ?? 0,
        betrayalRate: statsResult?.betrayalRate ?? 0,
        tokens: statsResult?.tokens ?? 0,
      },
    })
  } catch (error) {
    console.error('Match history error', error)
    res.status(500).json({ error: 'Failed to fetch match history' })
  }
})

export default router
