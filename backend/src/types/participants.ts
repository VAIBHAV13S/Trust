export type BotStrategy = 'cooperator' | 'betrayer' | 'random' | 'titfortat' | 'reputation' | 'adaptive'

export interface QueueParticipant {
  id: string
  address: string
  username: string
  reputation: number
  isBot: boolean
  strategy?: BotStrategy
  socketId?: string
  decisionDelayMs?: number
}
