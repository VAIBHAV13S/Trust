import { Router, Request, Response } from 'express'
import Match, { IMatch } from '../models/Match'
import Player from '../models/Player'
import { authMiddleware } from '../middleware/authMiddleware'
import { getChoiceDescription } from '../services/MatchResolutionService'
import { TournamentManager } from '../services/TournamentManager'
import type { ITournament, TournamentMatch } from '../models/Tournament'
import { resolveMatchFromChainByMatchId } from '../services/OnChainMatchResolver'

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
   * POST /api/matches/:matchId/resolve - Resolve match from on-chain state
   */
  router.post('/:matchId/resolve', authMiddleware, async (req: Request, res: Response) => {
    let matchDoc: IMatch | null = null

    try {
      const { matchId } = req.params

      const match = await resolveMatchFromChainByMatchId(matchId)
      matchDoc = match

      const onChainPlayer1Choice = typeof match.player1Choice === 'number' ? match.player1Choice : 2
      const onChainPlayer2Choice = typeof match.player2Choice === 'number' ? match.player2Choice : 2

      res.json({
        matchId: match.matchId,
        player1: {
          choice: getChoiceDescription(onChainPlayer1Choice),
          tokensEarned: match.player1TokensEarned,
          reputationChange: match.player1ReputationChange,
        },
        player2: {
          choice: getChoiceDescription(onChainPlayer2Choice),
          tokensEarned: match.player2TokensEarned,
          reputationChange: match.player2ReputationChange,
        },
        winner: match.winner,
        description: match.description,
      })
    } catch (error: any) {
      console.error('Error resolving match:', error)

      const message = error?.message || 'Failed to resolve match'

      if (message === 'Match not found') {
        return res.status(404).json({ error: message })
      }

      if (
        message === 'Match must be resolved on-chain; onChainMatchId is missing' ||
        message === 'On-chain match is not yet resolved'
      ) {
        return res.status(400).json({ error: message })
      }

      if (message === 'Failed to read on-chain match state') {
        return res.status(500).json({ error: message })
      }

      return res.status(500).json({ error: 'Failed to resolve match' })
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

        // Once the next round is seeded, automatically simulate any purely bot-only
        // rounds so the tournament can fully resolve even without human players.
        try {
          const autoPlayedTournament = await tournamentManager.autoPlayBotOnlyRounds(
            matchDoc.tournamentId,
            roundNumber
          )
          onTournamentUpdated?.(autoPlayedTournament)
        } catch (autoErr) {
          console.error('Error auto-playing bot-only rounds:', autoErr)
        }
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
