import 'dotenv/config'
import express, { Express, Request, Response, NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { Server as SocketIOServer, Socket } from 'socket.io'
import { createServer } from 'http'
import mongoose from 'mongoose'

import authRoutes from './routes/auth.js'
import playersRoutes from './routes/players.js'
import { createMatchesRoutes } from './routes/matches.js'
import { createTournamentRoutes } from './routes/tournaments.js'
import statsRoutes from './routes/stats.js'
import { MatchmakingQueue } from './services/MatchmakingQueue.js'
import { TournamentManager } from './services/TournamentManager.js'
import { botStrategyService } from './services/BotStrategyService.js'
import type { ITournament, TournamentMatch, TournamentRound } from './models/Tournament.js'
import { getActiveTournamentId, setActiveTournamentId } from './state/tournamentState.js'

const app: Express = express()
const httpServer = createServer(app)
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.SOCKET_IO_CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

const broadcastTournamentUpdate = (tournament: ITournament) => {
  io.emit('tournament-updated', tournament)

  // When a tournament is completed, reopen the lobby for new tournaments
  if (tournament.status === 'completed') {
    setActiveTournamentId(null)
  }
}

const broadcastRoundSeeded = async (
  tournament: ITournament,
  roundNumber: number,
  matches: TournamentMatch[]
) => {
  broadcastTournamentUpdate(tournament)
  io.emit('tournament-round-seeded', {
    tournamentId: tournament._id?.toString() ?? tournament.id,
    roundNumber,
    matches,
  })

  // Notify human participants in these matches so they can join their next game
  matches
    .filter((match) => !match.bye && match.matchId && match.player1 && match.player2)
    .forEach((match) => notifyMatchParticipants(match, roundNumber))
}

const PORT = process.env.PORT || 3000
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/trust-game'

// Lobby state management
interface LobbyPlayer {
  socketId: string
  address: string
  username: string
  reputation: number
  isReady: boolean
}

const lobbyPlayers = new Map<string, LobbyPlayer>()
const addressToSocket = new Map<string, string>()
let countdownActive = false
let countdownSeconds = 0
const COUNTDOWN_DURATION = 30 // seconds
const MIN_PLAYERS_TO_START = 1 // Start gathering timer as soon as the first player joins
const MAX_LOBBY_PLAYERS = 50
const DEFAULT_MATCH_STAKE = Number(process.env.DEFAULT_MATCH_STAKE || 100)

const matchmakingQueue = new MatchmakingQueue(MAX_LOBBY_PLAYERS, botStrategyService)
const tournamentManager = new TournamentManager(DEFAULT_MATCH_STAKE)


// Middleware
app.use(helmet())
app.use(cors())
app.use(express.json())

// Database connection
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
  })

// Routes
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    lobbyPlayers: lobbyPlayers.size,
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/players', playersRoutes)
app.use(
  '/api/matches',
  createMatchesRoutes({
    tournamentManager,
    onTournamentUpdated: broadcastTournamentUpdate,
    onRoundSeeded: broadcastRoundSeeded,
  })
)
app.use(
  '/api/tournaments',
  createTournamentRoutes({
    tournamentManager,
    onTournamentUpdated: broadcastTournamentUpdate,
    onRoundSeeded: broadcastRoundSeeded,
  })
)
app.use('/api/stats', statsRoutes)

// Socket.io connection handling
io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`)

  // Join lobby event
  socket.on('player-join', (data) => {
    console.log('player-join event received', {
      socketId: socket.id,
      address: data?.address,
      username: data?.username,
      reputation: data?.reputation,
    })
    const activeTournamentId = getActiveTournamentId()
    if (activeTournamentId) {
      console.log('Lobby closed - active tournament in progress', {
        socketId: socket.id,
        activeTournamentId,
      })
      socket.emit('lobby-closed', {
        reason: 'tournament_in_progress',
      })
      return
    }

    const lobbyPlayer: LobbyPlayer = {
      socketId: socket.id,
      address: data.address,
      username: data.username,
      reputation: data.reputation,
      isReady: false,
    }

    lobbyPlayers.set(socket.id, lobbyPlayer)
    addressToSocket.set(data.address.toLowerCase(), socket.id)
    matchmakingQueue.addPlayer({
      id: data.address.toLowerCase(),
      address: data.address,
      username: data.username,
      reputation: data.reputation,
      isBot: false,
      socketId: socket.id,
    })
    console.log(`Player joined lobby: ${data.username} (${lobbyPlayers.size}/${MAX_LOBBY_PLAYERS})`)

    // Broadcast updated player list
    broadcastPlayersList()

    // Announce player joined
    io.emit('player-joined', {
      address: data.address,
      username: data.username,
      reputation: data.reputation,
    })
  })

  // Player ready event
  socket.on('set-ready', (data) => {
    const player = lobbyPlayers.get(socket.id)
    if (player) {
      player.isReady = true
      console.log(`Player ready: ${player.username}`)

      io.emit('player-ready', { address: data.address })
      broadcastPlayersList()

      // Check if all ready
      checkIfAllReady()
    }
  })

  // Player unready event
  socket.on('set-unready', (data) => {
    const player = lobbyPlayers.get(socket.id)
    if (player) {
      player.isReady = false
      console.log(`Player not ready: ${player.username}`)

      io.emit('player-unready', { address: data.address })
      broadcastPlayersList()
    }
  })

  // Disconnect event
  socket.on('disconnect', () => {
    const player = lobbyPlayers.get(socket.id)
    if (player) {
      console.log(`Player disconnected: ${player.username}`)
      lobbyPlayers.delete(socket.id)
      addressToSocket.delete(player.address.toLowerCase())
      matchmakingQueue.removePlayer(player.address)

      io.emit('player-disconnected', { address: player.address })
      broadcastPlayersList()
    }

    // Stop countdown if lobby is empty
    if (lobbyPlayers.size === 0) {
      stopCountdown()
    }
  })
})

// Helper functions
function broadcastPlayersList() {
  const players = Array.from(lobbyPlayers.values()).map((p) => ({
    address: p.address,
    username: p.username,
    reputation: p.reputation,
    isReady: p.isReady,
  }))

  io.emit('players-list', players)
}

function checkAndStartCountdown() {
  if (countdownActive || lobbyPlayers.size < MIN_PLAYERS_TO_START) {
    return
  }

  console.log(`Starting countdown: ${lobbyPlayers.size} players connected`)
  startCountdown()
}

function checkIfAllReady() {
  if (lobbyPlayers.size === 0) return

  const allReady = Array.from(lobbyPlayers.values()).every((p) => p.isReady)

  if (allReady && lobbyPlayers.size >= MIN_PLAYERS_TO_START && !countdownActive) {
    console.log(`All players ready (${lobbyPlayers.size}). Starting countdown...`)
    startCountdown()
  }
}

function startCountdown() {
  if (countdownActive) return

  countdownActive = true
  countdownSeconds = COUNTDOWN_DURATION

  io.emit('countdown-start', { secondsRemaining: countdownSeconds })

  const countdownInterval = setInterval(() => {
    countdownSeconds--

    io.emit('countdown-tick', { secondsRemaining: countdownSeconds })

    if (countdownSeconds <= 0) {
      clearInterval(countdownInterval)
      startMatches()
    }
  }, 1000)
}

function stopCountdown() {
  countdownActive = false
  countdownSeconds = 0
  io.emit('countdown-complete')
}

async function startMatches() {
  const humanCount = matchmakingQueue.getParticipantCount()
  console.log(`Starting matches with ${humanCount} human participants in lobby`)

  if (humanCount === 0) {
    console.log('No players in queue; aborting match start')
    stopCountdown()
    return
  }

  // Fill remaining lobby slots with bots up to MAX_LOBBY_PLAYERS
  const targetCount = MAX_LOBBY_PLAYERS
  matchmakingQueue.fillWithBots(targetCount)
  const participants = matchmakingQueue.getSnapshot()

  if (participants.length < 2) {
    console.log('Not enough participants to create a tournament')
    return
  }

  const tournament = await tournamentManager.createTournamentFromQueue(participants)
  const tournamentId = tournament._id?.toString() ?? tournament.id
  setActiveTournamentId(tournamentId)

  const seededTournament = await tournamentManager.assignMatchIds(tournamentId, 1)
  const firstRound = seededTournament.rounds.find((r: TournamentRound) => r.roundNumber === 1)

  if (firstRound) {
    await broadcastRoundSeeded(seededTournament, 1, firstRound.matches)
  }

  lobbyPlayers.clear()
  addressToSocket.clear()
  matchmakingQueue.clear()
  countdownActive = false
  countdownSeconds = 0
  broadcastPlayersList()
}

function notifyMatchParticipants(match: TournamentMatch, round: number) {
  if (!match.matchId || match.bye) return

  console.log('Notifying match participants', {
    matchId: match.matchId,
    round,
    player1: match.player1,
    player2: match.player2,
  })

  const opponentForPlayer1: string | undefined = match.player2 ?? undefined

  // Only notify non-bot participants; bots do not maintain sockets and
  // attempting to emit to them just creates noisy 'No socket found' logs.
  if (!botStrategyService.isBot(match.player1)) {
    notifyPlayer(match.player1, opponentForPlayer1, match.matchId, round)
  }

  if (match.player2 && !botStrategyService.isBot(match.player2)) {
    notifyPlayer(match.player2, match.player1, match.matchId, round)
  }
}

function notifyPlayer(
  playerAddress: string | undefined | null,
  opponentAddress: string | undefined,
  matchId: string,
  round: number
) {
  if (!playerAddress) return

  const socketId = addressToSocket.get(playerAddress.toLowerCase())
  if (!socketId) {
    console.log('No socket found for player; cannot emit match-started', {
      playerAddress,
      opponentAddress,
      matchId,
      round,
    })
    return
  }

  console.log('Emitting match-started to player', {
    playerAddress,
    opponentAddress,
    matchId,
    round,
    socketId,
  })

  const opponent = opponentAddress ? matchmakingQueue.getParticipant(opponentAddress) : undefined
  io.to(socketId).emit('match-started', {
    matchId,
    tournamentId: getActiveTournamentId(),
    round,
    opponent: {
      address: opponent?.address ?? opponentAddress,
      username: opponent?.username ?? 'TBD',
      reputation: opponent?.reputation ?? 0,
      isBot: opponent?.isBot ?? false,
    },
  })
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err)
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL_ERROR',
  })
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Socket.io listening on ws://localhost:${PORT}`)
})

export { app, io }
