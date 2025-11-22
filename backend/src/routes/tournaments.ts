import { Router, Request, Response } from 'express'
import { TournamentManager } from '../services/TournamentManager.js'
import Tournament, { ITournament, TournamentMatch } from '../models/Tournament.js'
import { authMiddleware } from '../middleware/authMiddleware.js'
import { getActiveTournamentId } from '../state/tournamentState.js'
import { botStrategyService } from '../services/BotStrategyService.js'

interface TournamentRoutesDependencies {
  tournamentManager: TournamentManager
  onTournamentUpdated?: (tournament: ITournament) => void
  onRoundSeeded?: (
    tournament: ITournament,
    roundNumber: number,
    matches: TournamentMatch[]
  ) => void
}

export function createTournamentRoutes(deps: TournamentRoutesDependencies) {
  const router = Router()
  const { tournamentManager, onTournamentUpdated, onRoundSeeded } = deps

  router.get('/current', async (req: Request, res: Response) => {
    try {
      const activeId = getActiveTournamentId()
      if (!activeId) {
        return res.status(404).json({ error: 'No active tournament available' })
      }

      const tournament = await tournamentManager.getTournament(activeId)
      res.json(tournament)
    } catch (error: any) {
      console.error('Failed to fetch current tournament:', error)
      res.status(500).json({ error: error.message || 'Failed to fetch current tournament' })
    }
  })

  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const tournament = await tournamentManager.getTournament(req.params.id)
      res.json(tournament)
    } catch (error: any) {
      console.error(`Failed to fetch tournament ${req.params.id}:`, error)
      res.status(404).json({ error: 'Tournament not found' })
    }
  })

  router.post('/advance', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { tournamentId, advancingPlayers } = req.body
      const targetId = tournamentId ?? getActiveTournamentId()

      if (!targetId) {
        return res.status(400).json({ error: 'No tournament specified to advance' })
      }

      if (!Array.isArray(advancingPlayers) || advancingPlayers.length === 0) {
        return res.status(400).json({ error: 'Advancing players payload is required' })
      }

      const { tournament, roundNumber, matches } = await tournamentManager.seedNextRound(
        targetId,
        advancingPlayers
      )

      onTournamentUpdated?.(tournament)
      await onRoundSeeded?.(tournament, roundNumber, matches)

      res.json(tournament)
    } catch (error: any) {
      console.error('Failed to advance tournament:', error)
      res.status(500).json({ error: error.message || 'Failed to advance tournament' })
    }
  })

  router.post('/auto-resolve-bot-only', authMiddleware, async (req: Request, res: Response) => {
    try {
      const tournaments = await Tournament.find({ status: 'in_progress' })

      const updatedIds: string[] = []

      for (const t of tournaments) {
        let hasHumanPending = false

        for (const round of t.rounds) {
          for (const m of round.matches) {
            if (m.bye || m.status === 'completed') continue

            const p1 = m.player1
            const p2 = m.player2

            if ((p1 && !botStrategyService.isBot(p1)) || (p2 && !botStrategyService.isBot(p2))) {
              hasHumanPending = true
              break
            }
          }
          if (hasHumanPending) break
        }

        if (hasHumanPending) {
          continue
        }

        const startRoundNumber = t.currentRound || 1
        const autoPlayed = await tournamentManager.autoPlayBotOnlyRounds(
          String(t._id),
          startRoundNumber
        )

        onTournamentUpdated?.(autoPlayed)

        updatedIds.push(autoPlayed.id)
      }

      res.json({
        updatedCount: updatedIds.length,
        updatedTournamentIds: updatedIds,
      })
    } catch (error: any) {
      console.error('Auto-resolve bot-only tournaments error:', error)
      res.status(500).json({
        error: error.message || 'Failed to auto-resolve bot-only tournaments',
      })
    }
  })

  return router
}
