# API Specification

## Base URL
```
http://localhost:3000/api
```

## Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Endpoints

### Authentication

#### POST /auth/register
Register a new player with wallet address.

**Request:**
```json
{
  "walletAddress": "0x...",
  "username": "player123"
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": {
    "id": "...",
    "walletAddress": "0x...",
    "username": "player123",
    "reputation": 1000
  }
}
```

#### POST /auth/login
Login with wallet address.

**Request:**
```json
{
  "walletAddress": "0x..."
}
```

**Response:**
```json
{
  "token": "eyJhbGc...",
  "user": { ... }
}
```

### Players

#### GET /players/:address
Get player profile by wallet address.

**Response:**
```json
{
  "id": "...",
  "walletAddress": "0x...",
  "username": "player123",
  "reputation": 1250,
  "tokensStaked": 100,
  "matchesPlayed": 15,
  "wins": 8,
  "losses": 7
}
```

#### GET /players/leaderboard
Get global leaderboard.

**Query Parameters:**
- `limit` (default: 50)
- `offset` (default: 0)
- `sortBy` (default: "reputation") - "reputation", "earnings", "wins"

**Response:**
```json
{
  "total": 500,
  "players": [
    {
      "rank": 1,
      "username": "top_player",
      "reputation": 5000,
      "earnings": 2500
    }
  ]
}
```

### Matches

#### POST /matches/queue
Join matchmaking queue.

**Request:**
```json
{
  "stakeAmount": 100
}
```

**Response:**
```json
{
  "queueId": "...",
  "position": 23,
  "estimatedWait": "2m"
}
```

#### DELETE /matches/queue/:queueId
Leave matchmaking queue.

**Response:**
```json
{
  "success": true
}
```

#### GET /matches/:matchId
Get match details.

**Response:**
```json
{
  "id": "...",
  "round": 1,
  "player1": { "address": "0x...", "username": "player1" },
  "player2": { "address": "0x...", "username": "player2" },
  "status": "in_progress",
  "timeRemaining": 15,
  "player1Choice": null,
  "player2Choice": null
}
```

#### POST /matches/:matchId/commit
Submit hashed choice (commit phase).

**Request:**
```json
{
  "hashedChoice": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "committed"
}
```

#### POST /matches/:matchId/reveal
Reveal actual choice (reveal phase).

**Request:**
```json
{
  "choice": "cooperate|betray|abstain",
  "salt": "..."
}
```

**Response:**
```json
{
  "success": true,
  "status": "resolved"
}
```

#### GET /matches/:matchId/history
Get player match history.

**Query Parameters:**
- `limit` (default: 20)
- `offset` (default: 0)

**Response:**
```json
{
  "total": 42,
  "matches": [
    {
      "id": "...",
      "opponent": "0x...",
      "yourChoice": "cooperate",
      "opponentChoice": "betray",
      "outcome": "loss",
      "tokensWon": 0,
      "reputationChange": -20,
      "timestamp": "2025-11-15T10:30:00Z"
    }
  ]
}
```

## WebSocket Events

### Client → Server

#### `player-join`
```json
{
  "walletAddress": "0x...",
  "token": "eyJhbGc..."
}
```

#### `match-ready`
```json
{
  "matchId": "...",
  "ready": true
}
```

#### `choice-submitted`
```json
{
  "matchId": "...",
  "hashedChoice": "0x..."
}
```

### Server → Client

#### `match-found`
```json
{
  "matchId": "...",
  "opponent": {
    "address": "0x...",
    "username": "opponent_name"
  },
  "stake": 100,
  "roundsRemaining": 6
}
```

#### `match-timer`
```json
{
  "matchId": "...",
  "timeRemaining": 25
}
```

#### `match-result`
```json
{
  "matchId": "...",
  "player1Choice": "cooperate",
  "player2Choice": "betray",
  "player1Tokens": 0,
  "player2Tokens": 100,
  "player1ReputationChange": -20,
  "player2ReputationChange": 5,
  "nextMatchIn": 5
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "statusCode": 400
}
```

Common error codes:
- `INVALID_TOKEN` - JWT token invalid or expired
- `QUEUE_FULL` - Matchmaking queue at capacity
- `INVALID_CHOICE` - Game choice invalid
- `INSUFFICIENT_BALANCE` - Not enough tokens to stake
- `MATCH_NOT_FOUND` - Match ID doesn't exist
- `UNAUTHORIZED` - Missing or invalid authorization
