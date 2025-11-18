import mongoose, { Schema, Document } from 'mongoose'

export interface IMatch extends Document {
  matchId: string
  onChainMatchId?: string
  tournamentId?: string
  player1Address: string
  player1Username: string
  player1Reputation: number
  player1Choice?: number
  player1TokensEarned: number
  player1ReputationChange: number

  player2Address: string
  player2Username: string
  player2Reputation: number
  player2Choice?: number
  player2TokensEarned: number
  player2ReputationChange: number

  winner: 'player1' | 'player2' | 'tie' | null
  status: 'pending' | 'in-progress' | 'resolved'
  round: number
  stake: number
  description?: string

  createdAt: Date
  resolvedAt?: Date
  updatedAt: Date
}

const matchSchema = new Schema<IMatch>(
  {
    matchId: { type: String, required: true, unique: true, index: true },
    onChainMatchId: { type: String },
    tournamentId: { type: String, index: true },
    player1Address: { type: String, required: true, index: true },
    player1Username: { type: String, required: true },
    player1Reputation: { type: Number, required: true },
    player1Choice: { type: Number },
    player1TokensEarned: { type: Number, default: 0 },
    player1ReputationChange: { type: Number, default: 0 },

    player2Address: { type: String, required: true, index: true },
    player2Username: { type: String, required: true },
    player2Reputation: { type: Number, required: true },
    player2Choice: { type: Number },
    player2TokensEarned: { type: Number, default: 0 },
    player2ReputationChange: { type: Number, default: 0 },

    winner: {
      type: String,
      enum: ['player1', 'player2', 'tie', null],
      default: null,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'resolved'],
      default: 'pending',
      index: true,
    },
    round: { type: Number, default: 1 },
    stake: { type: Number, required: true },
    description: { type: String },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.model<IMatch>('Match', matchSchema)
