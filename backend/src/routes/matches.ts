import { Router, Request, Response } from 'express'
import Match, { IMatch } from '../models/Match'
import Player from '../models/Player'
import { authMiddleware } from '../middleware/authMiddleware'
import {
  resolveMatch,
  getChoiceDescription,
  determineWinner,
} from '../services/MatchResolutionService'
import { TournamentManager } from '../services/TournamentManager'
import type { ITournament, TournamentMatch } from '../models/Tournament'
import { botStrategyService, BotStrategyService } from '../services/BotStrategyService'

interface MatchesRouteDependencies {
  tournamentManager: TournamentManager
  onTournamentUpdated?: (tournament: ITournament) => void
  onRoundSeeded?: (
    tournament: ITournament,
    roundNumber: number,
    matches: TournamentMatch[]
  ) => Promise<void>
}

export function createMatchesRoutes(deps: MatchesRouteDependencies) {
  const router = Router()
  const { tournamentManager, onTournamentUpdated, onRoundSeeded } = deps

  /**
   * POST /api/matches - Create a new match
   */
  router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { player1Address, player2Address, stake, round = 1 } = req.body

      const player1 = await Player.findOne({ walletAddress: player1Address })
      const player2 = await Player.findOne({ walletAddress: player2Address })

      if (!player1 || !player2) {
        return res.status(404).json({ error: 'One or both players not found' })
      }

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const match = new Match({
        matchId,
        player1Address,
        player1Username: player1.username,
        player1Reputation: player1.reputation,
        player2Address,
        player2Username: player2.username,
        player2Reputation: player2.reputation,
        stake,
        round,
        status: 'pending',
      })

      await match.save()

      res.status(201).json({
        matchId: match.matchId,
        player1: {
          address: match.player1Address,
          username: match.player1Username,
          reputation: match.player1Reputation,
        },
        player2: {
          address: match.player2Address,
          username: match.player2Username,
          reputation: match.player2Reputation,
        },
        stake: match.stake,
        status: match.status,
      })
    } catch (error) {
      console.error('Error creating match:', error)
      res.status(500).json({ error: 'Failed to create match' })
    }
  })

  /**
   * GET /api/matches/:matchId - Get match details
   */
  router.get('/:matchId', async (req: Request, res: Response) => {
    try {
      const match = await Match.findOne({ matchId: req.params.matchId })

      if (!match) {
        return res.status(404).json({ error: 'Match not found' })
      }

      res.json(match)
    } catch (error) {
      console.error('Error fetching match:', error)
      res.status(500).json({ error: 'Failed to fetch match' })
    }
  })

  /**
   * POST /api/matches/:matchId/onchain - Attach an on-chain Match object id to this match
   * Body: { onChainMatchId: string }
   */
  router.post('/:matchId/onchain', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { matchId } = req.params
      const { onChainMatchId } = req.body as { onChainMatchId?: string }

      if (!onChainMatchId || typeof onChainMatchId !== 'string') {
        return res.status(400).json({ error: 'onChainMatchId is required' })
      }

      const match = await Match.findOne({ matchId })
      if (!match) {
        return res.status(404).json({ error: 'Match not found' })
      }

      const callerAddress = (req as any).user?.walletAddress?.toLowerCase()
      if (!callerAddress) {
        return res.status(401).json({ error: 'Unauthorized' })
      }

      const isParticipant =
        match.player1Address.toLowerCase() === callerAddress ||
        match.player2Address.toLowerCase() === callerAddress

      if (!isParticipant) {
        return res.status(403).json({ error: 'Only match participants can set on-chain match id' })
      }

      if (match.onChainMatchId && match.onChainMatchId !== onChainMatchId) {
        return res.status(400).json({ error: 'onChainMatchId already set for this match' })
      }

      match.onChainMatchId = onChainMatchId
      await match.save()

      res.json({ matchId: match.matchId, onChainMatchId: match.onChainMatchId })
    } catch (error) {
      console.error('Error attaching on-chain match id:', error)
      res.status(500).json({ error: 'Failed to attach on-chain match id' })
    }
  })

  /**
   * POST /api/matches/:matchId/resolve - Resolve match with both choices
   * Body: { player1Choice: 0|1|2, player2Choice: 0|1|2 }
   */
  router.post('/:matchId/resolve', authMiddleware, async (req: Request, res: Response) => {
    let matchDoc: IMatch | null = null

    try {
      const { matchId } = req.params
      let { player1Choice, player2Choice } = req.body

      // Coerce string inputs like "0" | "1" | "2" into numbers
      if (typeof player1Choice === 'string') {
        player1Choice = parseInt(player1Choice, 10)
      }
      if (typeof player2Choice === 'string') {
        player2Choice = parseInt(player2Choice, 10)
      }

      const match = await Match.findOne({ matchId })
      if (!match) {
        return res.status(404).json({ error: 'Match not found' })
      }

      if (match.status === 'resolved') {
        return res.status(400).json({ error: 'Match already resolved' })
      }

      const player1IsBot = botStrategyService.isBot(match.player1Address)
      const player2IsBot = botStrategyService.isBot(match.player2Address)

      if (player1IsBot && (player1Choice === undefined || player1Choice === null)) {
        player1Choice = botStrategyService.decideMove(
          match.player1Address,
          match.player2Address,
          match.player2Reputation
        )
      }

      if (player2IsBot && (player2Choice === undefined || player2Choice === null)) {
        player2Choice = botStrategyService.decideMove(
          match.player2Address,
          match.player1Address,
          match.player1Reputation
        )
      }

      if (![0, 1, 2].includes(player1Choice) || ![0, 1, 2].includes(player2Choice)) {
        return res.status(400).json({ error: 'Invalid choice values (0-2 required)' })
      }

      const outcome = resolveMatch(player1Choice, player2Choice)
      const winner = determineWinner(outcome.player1Tokens, outcome.player2Tokens)

      match.player1Choice = player1Choice
      match.player2Choice = player2Choice
      match.player1TokensEarned = outcome.player1Tokens
      match.player2TokensEarned = outcome.player2Tokens
      match.player1ReputationChange = outcome.player1RepChange
      match.player2ReputationChange = outcome.player2RepChange
      match.winner = winner
      match.status = 'resolved'
      match.resolvedAt = new Date()
      match.description = outcome.description

      await match.save()
      matchDoc = match

      await Promise.all([
        Player.findOneAndUpdate(
          { walletAddress: match.player1Address },
          {
            $inc: {
              tokensAvailable: outcome.player1Tokens,
              reputation: outcome.player1RepChange,
              matchesPlayed: 1,
              matchesWon: winner === 'player1' ? 1 : 0,
            },
          },
          { new: true }
        ),
        Player.findOneAndUpdate(
          { walletAddress: match.player2Address },
          {
            $inc: {
              tokensAvailable: outcome.player2Tokens,
              reputation: outcome.player2RepChange,
              matchesPlayed: 1,
              matchesWon: winner === 'player2' ? 1 : 0,
            },
          },
          { new: true }
        ),
      ])

      res.json({
        matchId: match.matchId,
        player1: {
          choice: getChoiceDescription(player1Choice),
          tokensEarned: outcome.player1Tokens,
          reputationChange: outcome.player1RepChange,
        },
        player2: {
          choice: getChoiceDescription(player2Choice),
          tokensEarned: outcome.player2Tokens,
          reputationChange: outcome.player2RepChange,
        },
        winner,
        description: outcome.description,
      })

      if (player1IsBot) {
        botStrategyService.recordChoice(match.player1Address, match.player2Address, player1Choice)
        botStrategyService.recordOutcome(match.player1Address, winner === 'player1')
      }

      if (player2IsBot) {
        botStrategyService.recordChoice(match.player2Address, match.player1Address, player2Choice)
        botStrategyService.recordOutcome(match.player2Address, winner === 'player2')
      }

      if (player1IsBot || player2IsBot) {
        botStrategyService.adjustStrategyWeights()
      }
    } catch (error) {
      console.error('Error resolving match:', error)
      res.status(500).json({ error: 'Failed to resolve match' })
      return
    }
    if (!matchDoc) {
      return
    }

    try {
      if (!matchDoc.tournamentId) {
        return
      }

      const winnerAddress = matchDoc.winner === 'player1'
        ? matchDoc.player1Address
        : matchDoc.winner === 'player2'
          ? matchDoc.player2Address
          : null

      if (!winnerAddress) {
        return
      }

      const { tournament, advancingPlayers, roundCompleted } = await tournamentManager.recordMatchResult(
        matchDoc.tournamentId,
        matchDoc.round,
        matchDoc.matchId,
        winnerAddress
      )

      onTournamentUpdated?.(tournament)

      if (roundCompleted && advancingPlayers.length > 0) {
        const { tournament: seededTournament, roundNumber, matches } = await tournamentManager.seedNextRound(
          matchDoc.tournamentId,
          advancingPlayers
        )

        onTournamentUpdated?.(seededTournament)
        await onRoundSeeded?.(seededTournament, roundNumber, matches)
      }
    } catch (err) {
      console.error('Error updating tournament bracket:', err)
    }
  })

  /**
   * GET /api/matches/:address/history - Get match history for a player
   */
  router.get('/:address/history', async (req: Request, res: Response) => {
    try {
      const { address } = req.params
      const { limit = 10, offset = 0 } = req.query

      const matches = await Match.find({
        $or: [{ player1Address: address }, { player2Address: address }],
      })
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip(Number(offset))

      const total = await Match.countDocuments({
        $or: [{ player1Address: address }, { player2Address: address }],
      })

      res.json({
        matches,
        total,
        limit: Number(limit),
        offset: Number(offset),
      })
    } catch (error) {
      console.error('Error fetching match history:', error)
      res.status(500).json({ error: 'Failed to fetch match history' })
    }
  })

  return router
}
