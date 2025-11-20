import { BotStrategy } from '../types/participants.js'
import { BotStrategyService } from './BotStrategyService.js'

export interface QueueParticipant {
  id: string
  address: string
  username: string
  reputation: number
  isBot: boolean
  socketId?: string
  strategy?: BotStrategy
  decisionDelayMs?: number
}

export interface MatchPair {
  player1: QueueParticipant
  player2: QueueParticipant
}

export class MatchmakingQueue {
  private realPlayers: Map<string, QueueParticipant> = new Map()
  private bots: QueueParticipant[] = []

  constructor(
    private readonly targetLobbySize = 50,
    private readonly botStrategyService = new BotStrategyService()
  ) {}

  addPlayer(player: QueueParticipant) {
    if (player.isBot) {
      this.bots.push(player)
      return
    }

    this.realPlayers.set(player.address.toLowerCase(), player)
  }

  removePlayer(address: string) {
    this.realPlayers.delete(address.toLowerCase())
  }

  clear() {
    this.realPlayers.clear()
    this.bots = []
  }

  fillWithBots(targetCount = this.targetLobbySize) {
    while (this.totalParticipants() < targetCount) {
      this.addPlayer(this.botStrategyService.createBot())
    }
  }

  ensureEvenCount() {
    if (this.totalParticipants() % 2 !== 0) {
      this.addPlayer(this.botStrategyService.createBot())
    }
  }

  createMatches(mode: 'elo' | 'random' = 'elo'): MatchPair[] {
    const participants = [...this.realPlayers.values(), ...this.bots]

    if (participants.length < 2) {
      return []
    }

    this.ensureEvenCount()

    const ordered =
      mode === 'random'
        ? this.shuffle(participants)
        : [...participants].sort((a, b) => a.reputation - b.reputation)

    const matches: MatchPair[] = []
    for (let i = 0; i < ordered.length; i += 2) {
      const player1 = ordered[i]
      const player2 = ordered[i + 1]

      if (!player1 || !player2) {
        continue
      }

      matches.push({ player1, player2 })
    }

    return matches
  }

  private shuffle<T>(arr: T[]) {
    const cloned = [...arr]
    for (let i = cloned.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[cloned[i], cloned[j]] = [cloned[j], cloned[i]]
    }
    return cloned
  }

  private totalParticipants() {
    return this.realPlayers.size + this.bots.length
  }

  getParticipantCount() {
    return this.totalParticipants()
  }

  getSnapshot(): QueueParticipant[] {
    return [...this.realPlayers.values(), ...this.bots]
  }

  getParticipant(address: string): QueueParticipant | undefined {
    const key = address.toLowerCase()
    return this.realPlayers.get(key) ?? this.bots.find((bot) => bot.address.toLowerCase() === key)
  }
}
