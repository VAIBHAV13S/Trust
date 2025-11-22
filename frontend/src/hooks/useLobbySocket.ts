import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { io, Socket } from 'socket.io-client'
import {
  addPlayer,
  removePlayer,
  setPlayers,
  updatePlayerReadyStatus,
  setCountdown,
  decrementCountdown,
  startCountdown,
  stopCountdown,
} from '../store/lobbySlice'
import { RootState } from '../store'

// Derive Socket.IO URL (origin only) from API URL
const getSocketUrl = () => {
  try {
    const raw = (import.meta as any).env.VITE_API_URL
    if (raw) {
      const url = new URL(raw)
      return url.origin
    }
    return 'http://localhost:3000'
  } catch {
    return 'http://localhost:3000'
  }
}

export const useLobbySocket = () => {
  const dispatch = useDispatch()
  const socketRef = useRef<Socket | null>(null)
  const auth = useSelector((state: RootState) => state.auth)
  const countdownInterval = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    console.log('useLobbySocket auth state', {
      isConnected: auth.isConnected,
      player: auth.player,
    })

    if (!auth.isConnected || !auth.player) return

    // Initialize Socket.io connection
    const socket = io(getSocketUrl(), {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['polling'],
    })

    socket.on('connect', () => {
      console.log('Socket.IO connected', socket.id)
    })

    socket.on('connect_error', (err) => {
      console.log('Socket.IO connect_error', err.message)
    })

    socketRef.current = socket

    // Join lobby room
    const joinPayload = {
      address: auth.player.walletAddress,
      username: auth.player.username,
      reputation: auth.player.reputation,
    }
    console.log('emitting player-join', joinPayload)
    socket.emit('player-join', joinPayload)

    // Listen for player joined events
    socket.on('player-joined', (data: any) => {
      dispatch(
        addPlayer({
          address: data.address,
          username: data.username,
          reputation: data.reputation,
          isReady: false,
        })
      )
    })

    // Listen for player list update
    socket.on('players-list', (players: any[]) => {
      dispatch(
        setPlayers(
          players.map((p: any) => ({
            address: p.address,
            username: p.username,
            reputation: p.reputation,
            isReady: p.isReady || false,
          }))
        )
      )
    })

    // Listen for player leaving
    socket.on('player-disconnected', (data: any) => {
      dispatch(removePlayer(data.address))
    })

    // Listen for player ready status updates
    socket.on('player-ready', (data: any) => {
      dispatch(updatePlayerReadyStatus({ address: data.address, isReady: true }))
    })

    socket.on('player-unready', (data: any) => {
      dispatch(updatePlayerReadyStatus({ address: data.address, isReady: false }))
    })

    // Listen for countdown start
    socket.on('countdown-start', (data: any) => {
      dispatch(startCountdown())
      dispatch(setCountdown(data.secondsRemaining))

      // Clear any existing countdown interval
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }

      // Start countdown timer
      countdownInterval.current = setInterval(() => {
        dispatch(decrementCountdown())
      }, 1000)
    })

    // Listen for countdown tick
    socket.on('countdown-tick', (data: any) => {
      dispatch(setCountdown(data.secondsRemaining))
    })

    // Listen for countdown end
    socket.on('countdown-complete', () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
      dispatch(stopCountdown())
    })

    // Listen for match started (redirect to match page)
    socket.on('match-started', (data: any) => {
      console.log('socket match-started event received', data)
      // This will be handled by router navigation in the Lobby component
      window.dispatchEvent(
        new CustomEvent('match-started', {
          detail: { matchId: data.matchId },
        })
      )
    })
    socket.on('lobby-closed', (data: any) => {
      window.dispatchEvent(
        new CustomEvent('lobby-closed', { detail: data })
      )
    })

    const broadcastTournamentUpdated = (data: any) => {
      window.dispatchEvent(
        new CustomEvent('tournament-updated', {
          detail: data,
        })
      )
    }

    const broadcastRoundSeeded = (data: any) => {
      window.dispatchEvent(
        new CustomEvent('tournament-round-seeded', {
          detail: data,
        })
      )
    }

    socket.on('tournament-updated', broadcastTournamentUpdated)
    socket.on('tournament-round-seeded', broadcastRoundSeeded)

    // Cleanup on unmount
    return () => {
      if (countdownInterval.current) {
        clearInterval(countdownInterval.current)
      }
      socket.off('tournament-updated', broadcastTournamentUpdated)
      socket.off('tournament-round-seeded', broadcastRoundSeeded)
      socket.disconnect()
    }
  }, [auth.isConnected, auth.player, dispatch])

  const setReady = (isReady: boolean) => {
    if (socketRef.current && auth.player) {
      socketRef.current.emit(isReady ? 'set-ready' : 'set-unready', {
        address: auth.player.walletAddress,
      })
    }
  }

  return {
    socket: socketRef.current,
    setReady,
  }
}
