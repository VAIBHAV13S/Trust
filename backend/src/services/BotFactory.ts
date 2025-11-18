import crypto from 'crypto'
import { BotStrategy } from '../types/participants'

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
  createBot(preferredStrategy?: BotStrategy) {
    const strategy = preferredStrategy ?? this.rollStrategy()
    const username = `${pickRandom(BOT_NAMES)}-${randomInRange(100, 999)}`
    const address = `0x${crypto.randomBytes(16).toString('hex')}`

    return {
      id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      address,
      username,
      reputation: this.baseReputation(strategy),
      isBot: true,
      strategy,
      decisionDelayMs: randomInRange(1200, 3500),
    }
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
