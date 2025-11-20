import crypto from 'crypto'
import type { QueueParticipant } from './MatchmakingQueue.js'
import { BotStrategy } from '../types/participants.js'

type BotMemory = {
  strategy: BotStrategy
  opponentHistory: Record<string, number>
  score: number
}

const DEFAULT_WEIGHTS: Record<BotStrategy, number> = {
  cooperator: 0.2,
  betrayer: 0.2,
  random: 0.2,
  titfortat: 0.15,
  reputation: 0.15,
  adaptive: 0.1,
}

const BOT_CONTROLLER_ADDRESS = process.env.BOT_CONTROLLER_ADDRESS

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

const randomInRange = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const pickRandom = <T>(items: T[]): T => items[Math.floor(Math.random() * items.length)]

class BotFactory {
  private memory = new Map<string, { history: string[] }>()

  createBot(preferredStrategy?: BotStrategy): QueueParticipant {
    const strategy = preferredStrategy ?? this.rollStrategy()
    const id = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    const username = `${pickRandom(BOT_NAMES)}-${randomInRange(100, 999)}`
    const address =
      BOT_CONTROLLER_ADDRESS && BOT_CONTROLLER_ADDRESS.length > 0
        ? BOT_CONTROLLER_ADDRESS
        : `0x${crypto.randomBytes(16).toString('hex')}`
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

export class BotStrategyService {
  private readonly botFactory = new BotFactory()
  private botMemory = new Map<string, BotMemory>()
  private strategyWeights = { ...DEFAULT_WEIGHTS }

  createBot(preferredStrategy?: BotStrategy): QueueParticipant {
    const strategy = preferredStrategy ?? this.pickStrategy()
    const bot = this.botFactory.createBot(strategy)
    this.registerBot(bot, strategy)
    return bot
  }

  registerBot(bot: QueueParticipant, strategy: BotStrategy) {
    this.botMemory.set(bot.address.toLowerCase(), {
      strategy,
      opponentHistory: {},
      score: 1000,
    })
  }

  isBot(address: string) {
    return this.botMemory.has(address.toLowerCase())
  }

  decideMove(botAddress: string, opponentAddress: string, opponentReputation: number) {
    const memory = this.botMemory.get(botAddress.toLowerCase())
    if (!memory) {
      return 0
    }

    const last = memory.opponentHistory[opponentAddress]
    switch (memory.strategy) {
      case 'titfortat':
        return last ?? 0
      case 'reputation':
        return opponentReputation >= 1100 ? 0 : 1
      case 'adaptive':
        return memory.score >= 1020 ? 1 : 0
      case 'betrayer':
        return 1
      case 'random':
        return Math.floor(Math.random() * 3)
      default:
        return 0
    }
  }

  recordChoice(botAddress: string, opponentAddress: string, choice: number) {
    const memory = this.botMemory.get(botAddress.toLowerCase())
    if (!memory) return
    memory.opponentHistory[opponentAddress] = choice
  }

  recordOutcome(botAddress: string, success: boolean) {
    const memory = this.botMemory.get(botAddress.toLowerCase())
    if (!memory) return
    memory.score += success ? 10 : -5
  }

  adjustStrategyWeights() {
    const data = new Map<BotStrategy, { score: number; count: number }>()
    this.botMemory.forEach((mem) => {
      const entry = data.get(mem.strategy) ?? { score: 0, count: 0 }
      entry.score += mem.score
      entry.count += 1
      data.set(mem.strategy, entry)
    })

    let total = 0
    data.forEach((entry, strategy) => {
      const avg = entry.count ? entry.score / entry.count : 0
      const weight = Math.max(0.05, Math.min(0.4, avg / 1200))
      this.strategyWeights[strategy] = weight
      total += weight
    })

    if (total > 0) {
      Object.keys(this.strategyWeights).forEach((strategy) => {
        this.strategyWeights[strategy as BotStrategy] /= total
      })
    } else {
      this.strategyWeights = { ...DEFAULT_WEIGHTS }
    }
  }

  private pickStrategy(): BotStrategy {
    const roll = Math.random()
    let cumulative = 0
    for (const [strategy, weight] of Object.entries(this.strategyWeights)) {
      cumulative += weight
      if (roll <= cumulative) {
        return strategy as BotStrategy
      }
    }
    return 'cooperator'
  }
}

export const botStrategyService = new BotStrategyService()
