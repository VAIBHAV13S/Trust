import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Opponent {
  address: string
  username: string
  reputation: number
}

export interface MatchResult {
  player1: {
    choice: string
    tokensEarned: number
    reputationChange: number
  }
  player2: {
    choice: string
    tokensEarned: number
    reputationChange: number
  }
  winner: 'player1' | 'player2' | 'tie'
  description: string
}

interface Match {
  id: string
  round: number
  opponent: Opponent | null
  stake: number
  status: 'waiting' | 'in_progress' | 'resolved'
  timeRemaining: number
  yourChoice: string | null
  opponentChoice: string | null
  result?: MatchResult
}

interface MatchState {
  currentMatch: Match | null
  matchHistory: Match[]
  isLoading: boolean
  error: string | null
}

const initialState: MatchState = {
  currentMatch: null,
  matchHistory: [],
  isLoading: false,
  error: null,
}

const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    setCurrentMatch: (state, action: PayloadAction<Match>) => {
      state.currentMatch = action.payload
      state.error = null
    },
    updateMatchStatus: (state, action: PayloadAction<Partial<Match>>) => {
      if (state.currentMatch) {
        state.currentMatch = { ...state.currentMatch, ...action.payload }
      }
    },
    setMatchResult: (state, action: PayloadAction<MatchResult>) => {
      if (state.currentMatch) {
        state.currentMatch.result = action.payload
        state.currentMatch.status = 'resolved'
      }
    },
    setMatchLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setMatchError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    clearCurrentMatch: (state) => {
      state.currentMatch = null
      state.error = null
    },
    addMatchToHistory: (state, action: PayloadAction<Match>) => {
      state.matchHistory.unshift(action.payload)
    },
  },
})

export const {
  setCurrentMatch,
  updateMatchStatus,
  setMatchResult,
  setMatchLoading,
  setMatchError,
  clearCurrentMatch,
  addMatchToHistory,
} = matchSlice.actions
export default matchSlice.reducer
