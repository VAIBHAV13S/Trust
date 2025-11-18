import crypto from 'crypto'
import { BotStrategy } from '../types/participants'
import { BotStrategyService } from './BotStrategyService'

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

interface BotArchetype {
  strategy: BotStrategy
  weight: number
  baseReputation: number
}

const BOT_ARCHETYPES: BotArchetype[] = [
  { strategy: 'cooperator', weight: 0.6, baseReputation: 1150 },
  { strategy: 'betrayer', weight: 0.3, baseReputation: 1050 },
  { strategy: 'random', weight: 0.1, baseReputation: 1000 },
]

const BOT_NAMES = [
  'Aurora',
  'Cipher',
  'Nebula',
  'Quanta',
  'Vesper',
  'Onyx',
  'Kairo',
  'Nyx',
  'Riven',
  'Solace',
]

const randomInRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

export class BotFactory {
  private memory = new Map<string, { history: string[] }>()

  createBot(preferredStrategy?: BotStrategy): QueueParticipant {
    const strategy = preferredStrategy ?? this.rollStrategy()
    const id = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const username = `${pickRandom(BOT_NAMES)}-${randomInRange(100, 999)}`
    const address = `0x${crypto.randomBytes(16).toString('hex')}`
    const decisionDelayMs = randomInRange(1200, 3500)

    const bot: QueueParticipant = {
      id,
      address,
      username,
      reputation: this.baseReputation(strategy),
      isBot: true,
      strategy,
      decisionDelayMs,
    }

    this.memory.set(id, { history: [] })
    return bot
  }

  getMemory(botId: string) {
    return this.memory.get(botId)
  }

  private rollStrategy(): BotStrategy {
    const roll = Math.random()
    let cumulative = 0

    for (const archetype of BOT_ARCHETYPES) {
      cumulative += archetype.weight
      if (roll <= cumulative) {
        return archetype.strategy
      }
    }

    return 'random'
  }

  private baseReputation(strategy: BotStrategy) {
    return BOT_ARCHETYPES.find((a) => a.strategy === strategy)?.baseReputation ?? 1000
  }
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
