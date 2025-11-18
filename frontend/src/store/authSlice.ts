import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface Player {
  walletAddress: string
  username: string
  reputation: number
  tokensStaked: number
}

interface AuthState {
  isConnected: boolean
  player: Player | null
  token: string | null
  isLoading: boolean
  error: string | null
}

const initialState: AuthState = {
  isConnected: false,
  player: null,
  token: localStorage.getItem('token'),
  isLoading: false,
  error: null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },
    setConnected: (state, action: PayloadAction<{ player: Player; token: string }>) => {
      state.isConnected = true
      state.player = action.payload.player
      state.token = action.payload.token
      state.error = null
      localStorage.setItem('token', action.payload.token)
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
    disconnect: (state) => {
      state.isConnected = false
      state.player = null
      state.token = null
      state.error = null
      localStorage.removeItem('token')
    },
    updatePlayer: (state, action: PayloadAction<Player>) => {
      state.player = action.payload
    },
  },
})

export const { setLoading, setConnected, setError, disconnect, updatePlayer } = authSlice.actions
export default authSlice.reducer
