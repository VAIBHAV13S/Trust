import { Router, Request, Response } from 'express'
import Match, { IMatch } from '../models/Match.js'
import Player from '../models/Player.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import {
  Choice,
  resolveMatch,
  getChoiceDescription,
  determineWinner,
} from '../services/MatchResolutionService.js'
import { TournamentManager } from '../services/TournamentManager.js'
import type { ITournament, TournamentMatch } from '../models/Tournament.js'
import { resolveMatchFromChainByMatchId } from '../services/OnChainMatchResolver.js'
import { botStrategyService } from '../services/BotStrategyService.js'

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

  // Off-chain resolution for matches involving bots (bot vs bot or bot vs human).
  // This ensures tournaments can always advance even when there is no on-chain
  // match object or the opponent has no wallet to sign transactions.
  const resolveMatchOffChain = async (existingMatch: IMatch): Promise<IMatch> => {
    const match = await Match.findOne({ matchId: existingMatch.matchId })
    if (!match) {
      throw new Error('Match not found')
    }

    if (match.status === 'resolved') {
      return match
    }

    const isPlayer1Bot = botStrategyService.isBot(match.player1Address)
    const isPlayer2Bot = botStrategyService.isBot(match.player2Address)

    // Determine choices: bots use their strategy; humans default to ABSTAIN
    const player1Choice: Choice = isPlayer1Bot
      ? (botStrategyService.decideMove(
          match.player1Address,
          match.player2Address,
          match.player2Reputation
        ) as Choice)
      : Choice.ABSTAIN

    const player2Choice: Choice = isPlayer2Bot
      ? (botStrategyService.decideMove(
          match.player2Address,
          match.player1Address,
          match.player1Reputation
        ) as Choice)
      : Choice.ABSTAIN

    const outcome = resolveMatch(player1Choice, player2Choice)
    const winnerSide = determineWinner(outcome.player1Tokens, outcome.player2Tokens)

    match.player1Choice = player1Choice
    match.player2Choice = player2Choice
    match.player1TokensEarned = outcome.player1Tokens
    match.player2TokensEarned = outcome.player2Tokens
    match.player1ReputationChange = outcome.player1RepChange
    match.player2ReputationChange = outcome.player2RepChange
    match.winner = winnerSide
    match.status = 'resolved'
    match.resolvedAt = new Date()
    match.description = 'Resolved off-chain (bot simulation)'

    await match.save()

    const playerUpdates: Promise<any>[] = []

    if (!isPlayer1Bot) {
      playerUpdates.push(
        Player.findOneAndUpdate(
          { walletAddress: match.player1Address },
          {
            $inc: {
              tokensAvailable: outcome.player1Tokens,
              reputation: outcome.player1RepChange,
              matchesPlayed: 1,
              matchesWon: winnerSide === 'player1' ? 1 : 0,
            },
          },
          { new: true }
        )
      )
    }

    if (!isPlayer2Bot) {
      playerUpdates.push(
        Player.findOneAndUpdate(
          { walletAddress: match.player2Address },
          {
            $inc: {
              tokensAvailable: outcome.player2Tokens,
              reputation: outcome.player2RepChange,
              matchesPlayed: 1,
              matchesWon: winnerSide === 'player2' ? 1 : 0,
            },
          },
          { new: true }
        )
      )
    }

    if (playerUpdates.length > 0) {
      await Promise.all(playerUpdates)
    }

    return match
  }

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
   * POST /api/matches/:matchId/resolve - Resolve match
   *
   * For pure human-vs-human matches that use the Move contract, this endpoint
   * resolves from on-chain state. For any match that involves a bot
   * (bot-vs-bot or bot-vs-human), it falls back to off-chain resolution using
   * BotStrategyService + MatchResolutionService so tournaments can always
   * advance.
   */
  router.post('/:matchId/resolve', authMiddleware, async (req: Request, res: Response) => {
    let matchDoc: IMatch | null = null

    try {
      const { matchId } = req.params
      const existing = await Match.findOne({ matchId })
      if (!existing) {
        return res.status(404).json({ error: 'Match not found' })
      }

      const isPlayer1Bot = botStrategyService.isBot(existing.player1Address)
      const isPlayer2Bot = botStrategyService.isBot(existing.player2Address)

      if (isPlayer1Bot || isPlayer2Bot) {
        // Off-chain path for any match that includes a bot participant
        const resolved = await resolveMatchOffChain(existing)
        matchDoc = resolved
      } else {
        // Pure human-vs-human: require on-chain resolution
        const resolved = await resolveMatchFromChainByMatchId(matchId)
        matchDoc = resolved
      }

      const p1Choice = typeof matchDoc.player1Choice === 'number' ? matchDoc.player1Choice : 2
      const p2Choice = typeof matchDoc.player2Choice === 'number' ? matchDoc.player2Choice : 2

      res.json({
        matchId: matchDoc.matchId,
        player1: {
          address: matchDoc.player1Address,
          username: matchDoc.player1Username,
          choice: getChoiceDescription(p1Choice as Choice),
          tokensEarned: matchDoc.player1TokensEarned,
          reputationChange: matchDoc.player1ReputationChange,
        },
        player2: {
          address: matchDoc.player2Address,
          username: matchDoc.player2Username,
          choice: getChoiceDescription(p2Choice as Choice),
          tokensEarned: matchDoc.player2TokensEarned,
          reputationChange: matchDoc.player2ReputationChange,
        },
        winner: matchDoc.winner,
        description: matchDoc.description,
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
        const { tournament: seededTournament, roundNumber } = await tournamentManager.seedNextRound(
          matchDoc.tournamentId,
          advancingPlayers
        )

        onTournamentUpdated?.(seededTournament)

        // Assign match IDs for the newly seeded round so we can notify participants
        const seededWithIds = await tournamentManager.assignMatchIds(
          String(seededTournament._id ?? seededTournament.id),
          roundNumber
        )

        const nextRound = seededWithIds.rounds.find((r) => r.roundNumber === roundNumber)
        const matchesWithIds = nextRound ? nextRound.matches : []

        await onRoundSeeded?.(seededWithIds, roundNumber, matchesWithIds)

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
