import mongoose, { Schema, Document } from 'mongoose'

export interface IPlayer extends Document {
  walletAddress: string
  username: string
  reputation: number
  tokensStaked: number
  tokensAvailable: number
  totalEarnings: number
  matchesPlayed: number
  matchesWon: number
  cooperationRate: number
  betrayalRate: number
  lastActiveAt: Date
  createdAt: Date
  updatedAt: Date
}

const playerSchema = new Schema<IPlayer>(
  {
    walletAddress: { type: String, unique: true, required: true, lowercase: true },
    username: { type: String, unique: true, required: true },
    reputation: { type: Number, default: 1000 },
    tokensStaked: { type: Number, default: 0 },
    tokensAvailable: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    matchesPlayed: { type: Number, default: 0 },
    matchesWon: { type: Number, default: 0 },
    cooperationRate: { type: Number, default: 0 },
    betrayalRate: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

// Indexes

playerSchema.index({ reputation: -1 })
playerSchema.index({ createdAt: -1 })

export default mongoose.model<IPlayer>('Player', playerSchema)
