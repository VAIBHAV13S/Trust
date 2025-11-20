import Match from '../models/Match'
import { botStrategyService } from './BotStrategyService'
import type { TournamentMatch } from '../models/Tournament'
import { BotChainService } from './BotChainService'

const BOT_AGENT_ENABLED = process.env.ENABLE_BOT_AGENT === 'true'

export class BotAgent {
  private readonly chain: BotChainService

  constructor(chain: BotChainService = new BotChainService()) {
    this.chain = chain
  }

  async handleRoundSeeded(matches: TournamentMatch[]): Promise<void> {
    if (!BOT_AGENT_ENABLED) {
      return
    }

    const botAddress = this.chain.getAddress()?.toLowerCase()
    if (!botAddress) {
      console.warn(
        '[BotAgent] ENABLE_BOT_AGENT is true but BOT_CONTROLLER_KEY is not configured; skipping bot actions'
      )
      return
    }

    const actionableMatches = matches
      .filter((match) => !match.bye && match.matchId && match.player1 && match.player2)
      .filter((match) => {
        const p1 = (match.player1 as string).toLowerCase()
        const p2 = (match.player2 as string | undefined)?.toLowerCase()
        const involvesController = p1 === botAddress || p2 === botAddress
        if (!involvesController) {
          return false
        }

        const p1IsBot = botStrategyService.isBot(match.player1 as string)
        const p2IsBot = match.player2 ? botStrategyService.isBot(match.player2 as string) : false

        // Skip pure bot-vs-bot matches; these are resolved off-chain by TournamentManager.
        // We only want to drive on-chain flow when there is at least one human participant.
        if (p1IsBot && p2IsBot) {
          return false
        }

        return true
      })

    if (!actionableMatches.length) {
      return
    }

    actionableMatches.forEach((m) => {
      const matchId = m.matchId as string
      this.runBotFlow(matchId, botAddress).catch((err) => {
        console.error('[BotAgent] Bot flow failed', { matchId, err })
      })
    })
  }

  private async runBotFlow(matchId: string, botAddress: string): Promise<void> {
    const initial = await Match.findOne({ matchId })
    if (!initial) {
      return
    }

    if (initial.status !== 'pending') {
      return
    }

    const isPlayer1Bot = initial.player1Address.toLowerCase() === botAddress
    const isPlayer2Bot = initial.player2Address.toLowerCase() === botAddress

    if (!isPlayer1Bot && !isPlayer2Bot) {
      return
    }

    const opponentAddress = isPlayer1Bot ? initial.player2Address : initial.player1Address
    const opponentReputation = isPlayer1Bot ? initial.player2Reputation : initial.player1Reputation

    console.log('[BotAgent] Starting on-chain bot flow', {
      matchId,
      tournamentId: initial.tournamentId,
      round: initial.round,
      botAddress,
      opponentAddress,
    })

    const onChainMatchId = await this.waitForOnChainMatchId(matchId, 60, 2000)
    if (!onChainMatchId) {
      console.warn('[BotAgent] Gave up waiting for on-chain match id', { matchId })
      return
    }

    // Simple policy: stake the configured stake amount from backend Match
    try {
      await this.chain.stake(onChainMatchId, BigInt(initial.stake))
    } catch (err) {
      console.error('[BotAgent] Failed to stake for bot match', { matchId, err })
      return
    }

    const choice = botStrategyService.decideMove(botAddress, opponentAddress, opponentReputation)
    const salt = BotChainService.buildSalt()
    const commitment = BotChainService.buildCommitment(choice, salt)

    try {
      await this.chain.commit(onChainMatchId, commitment)
      await this.chain.reveal(onChainMatchId, choice, salt)
    } catch (err) {
      console.error('[BotAgent] Failed to commit/reveal for bot match', { matchId, err })
      return
    }

    console.log('[BotAgent] Bot commit/reveal submitted', { matchId })
    // Optionally, a future improvement could poll for on-chain resolution and
    // call the backend /matches/:id/resolve endpoint automatically.
  }

  private async waitForOnChainMatchId(
    matchId: string,
    maxAttempts: number,
    delayMs: number
  ): Promise<string | null> {
    for (let i = 0; i < maxAttempts; i += 1) {
      const match = await Match.findOne({ matchId })
      if (!match) {
        return null
      }

      if (match.status === 'resolved') {
        return null
      }

      if (match.onChainMatchId) {
        return match.onChainMatchId
      }

      if (i < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }

    return null
  }
}
