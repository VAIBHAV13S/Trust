import { BotFactory, QueueParticipant } from './MatchmakingQueue'
import { BotStrategy } from '../types/participants'

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
