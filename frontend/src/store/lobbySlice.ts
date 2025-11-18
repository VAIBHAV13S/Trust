import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface LobbyPlayer {
  address: string
  username: string
  reputation: number
  isReady: boolean
}

interface LobbyState {
  players: LobbyPlayer[]
  connectedCount: number
  maxPlayers: number
  countdownSeconds: number
  isCountingDown: boolean
  isReady: boolean
  isLoading: boolean
  error: string | null
}

const initialState: LobbyState = {
  players: [],
  connectedCount: 0,
  maxPlayers: 50,
  countdownSeconds: 0,
  isCountingDown: false,
  isReady: false,
  isLoading: false,
  error: null,
}

const lobbySlice = createSlice({
  name: 'lobby',
  initialState,
  reducers: {
    setPlayers: (state, action: PayloadAction<LobbyPlayer[]>) => {
      state.players = action.payload
      state.connectedCount = action.payload.length
    },
    addPlayer: (state, action: PayloadAction<LobbyPlayer>) => {
      const exists = state.players.some((p) => p.address === action.payload.address)
      if (!exists) {
        state.players.push(action.payload)
        state.connectedCount += 1
      }
    },
    removePlayer: (state, action: PayloadAction<string>) => {
      state.players = state.players.filter((p) => p.address !== action.payload)
      state.connectedCount = state.players.length
    },
    updatePlayerReadyStatus: (
      state,
      action: PayloadAction<{ address: string; isReady: boolean }>
    ) => {
      const player = state.players.find((p) => p.address === action.payload.address)
      if (player) {
        player.isReady = action.payload.isReady
      }
    },
    setCountdown: (state, action: PayloadAction<number>) => {
      state.countdownSeconds = action.payload
    },
    decrementCountdown: (state) => {
      state.countdownSeconds = Math.max(0, state.countdownSeconds - 1)
    },
    startCountdown: (state) => {
      state.isCountingDown = true
    },
    stopCountdown: (state) => {
      state.isCountingDown = false
      state.countdownSeconds = 0
    },
    setReady: (state, action: PayloadAction<boolean>) => {
      state.isReady = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },
    resetLobby: (state) => {
      state.players = []
      state.connectedCount = 0
      state.countdownSeconds = 0
      state.isCountingDown = false
      state.isReady = false
      state.error = null
    },
  },
})

export const {
  setPlayers,
  addPlayer,
  removePlayer,
  updatePlayerReadyStatus,
  setCountdown,
  decrementCountdown,
  startCountdown,
  stopCountdown,
  setReady,
  setLoading,
  setError,
  resetLobby,
} = lobbySlice.actions

export default lobbySlice.reducer
