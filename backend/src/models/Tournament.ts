import mongoose, { Schema, Document } from 'mongoose'

export interface MatchSource {
  round: number
  match: number
}

export interface RewardInfo {
  address: string
  amount: number
}

export interface TournamentMatch {
  matchNumber: number
  matchId?: string
  player1: string
  player1Username: string
  player1Reputation: number
  player1Source?: MatchSource
  player2?: string | null
  player2Username?: string | null
  player2Reputation?: number | null
  player2Source?: MatchSource
  status: 'pending' | 'in-progress' | 'completed'
  winner?: string | null
  bye?: boolean
  stake?: number
}

export interface TournamentRound {
  roundNumber: number
  matches: TournamentMatch[]
}

export interface TournamentMetrics {
  totalTokensStaked: number
  prizePool: number
  reputationBonuses: Record<string, number>
  winnerReward?: RewardInfo
  runnerUpReward?: RewardInfo
}

export interface ITournament extends Document {
  status: 'pending' | 'in_progress' | 'completed'
  currentRound: number
  rounds: TournamentRound[]
  metrics: TournamentMetrics
  createdAt: Date
  updatedAt: Date
}

const tournamentMatchSchema = new Schema<TournamentMatch>(
  {
    matchNumber: { type: Number, required: true },
    matchId: { type: String },
    player1: { type: String, required: true },
    player1Username: { type: String, required: true },
    player1Reputation: { type: Number, required: true },
    player1Source: {
      round: { type: Number },
      match: { type: Number },
    },
    player2: { type: String },
    player2Username: { type: String },
    player2Reputation: { type: Number },
    player2Source: {
      round: { type: Number },
      match: { type: Number },
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed'],
      default: 'pending',
    },
    winner: { type: String },
    bye: { type: Boolean, default: false },
    stake: { type: Number, default: 0 },
  },
  { _id: false }
)

const tournamentRoundSchema = new Schema<TournamentRound>(
  {
    roundNumber: { type: Number, required: true },
    matches: [tournamentMatchSchema],
  },
  { _id: false }
)

const tournamentSchema = new Schema<ITournament>(
  {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    currentRound: { type: Number, default: 1 },
    rounds: [tournamentRoundSchema],
    metrics: {
      totalTokensStaked: { type: Number, default: 0 },
      prizePool: { type: Number, default: 0 },
      reputationBonuses: {
        type: Map,
        of: Number,
        default: {},
      },
      winnerReward: {
        address: { type: String },
        amount: { type: Number },
      },
      runnerUpReward: {
        address: { type: String },
        amount: { type: Number },
      },
    },
  },
  { timestamps: true }
)

export default mongoose.model<ITournament>('Tournament', tournamentSchema)
